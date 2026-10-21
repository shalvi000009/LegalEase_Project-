import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { BadRequestError, NotFoundError } from "../utils/errors";
import { AuthenticatedRequest } from "../middleware/auth";
import {
  calculateAggregatedRiskDimensions,
  calculateClauseDimensionContributions,
} from "../config/riskWeights";

export class AnalysisController {
  public static async getAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reqAuth = req as AuthenticatedRequest;
      if (!reqAuth.user) {
        throw new BadRequestError("User context is missing");
      }

      const { id: documentId } = req.params;

      // 1. Verify document exists and belongs to the authenticated user
      const document = await prisma.document.findFirst({
        where: {
          id: documentId,
          user_id: reqAuth.user.id,
        },
      });

      if (!document) {
        throw new NotFoundError("Document not found");
      }

      // 2. Fetch the analysis record including all clauses
      const analysis = await prisma.analysis.findFirst({
        where: {
          document_id: documentId,
        },
        include: {
          clauses: true,
        },
      });

      if (!analysis) {
        // If the document is still in progress or failed
        if (document.status === "failed") {
          res.status(400).json({
            error_code: "ANALYSIS_FAILED",
            message: "The document analysis job failed. Please upload again.",
          });
          return;
        }

        res.status(400).json({
          error_code: "ANALYSIS_NOT_READY",
          message: "Analysis is still in progress. Please try again later.",
        });
        return;
      }

      const formattedClauses = analysis.clauses.map((c: any) => {
        const dimensionContribs =
          c.dimension_contributions ||
          calculateClauseDimensionContributions(c.clause_type, c.risk_score);
        return {
          id: c.id,
          clause_type: c.clause_type,
          risk_level: c.risk_level,
          explanation: c.explanation,
          original_text: c.original_text,
          risk_score: c.risk_score,
          dimension_contributions: dimensionContribs,
        };
      });

      const riskDimensions =
        analysis.risk_dimensions ||
        calculateAggregatedRiskDimensions(formattedClauses);

      const standardClauseTypes = [
        { type: "termination", label: "Termination & Notice Periods" },
        { type: "confidentiality", label: "Confidentiality & Non-Disclosure" },
        { type: "liability", label: "Limitation of Liability & Damage Caps" },
        { type: "governing_law", label: "Governing Law & Jurisdiction" },
        { type: "indemnification", label: "Indemnification Obligations" },
        { type: "intellectual_property", label: "Intellectual Property Ownership" },
        { type: "non_compete", label: "Non-Compete & Restrictive Covenants" },
        { type: "force_majeure", label: "Force Majeure & Unforeseen Events" },
        { type: "payment", label: "Payment & Invoicing Terms" },
      ];

      const foundTypes = new Set(formattedClauses.map((c: any) => c.clause_type));
      const missingClauses = standardClauseTypes
        .filter((sc) => !foundTypes.has(sc.type))
        .map((sc) => sc.label);

      const highRiskClauses = formattedClauses.filter(
        (c: any) => c.risk_level === "high" || c.risk_score >= 70
      );

      const suggestedQuestions = [
        highRiskClauses.some((c: any) => c.clause_type === "liability")
          ? "Can we add a mutual limitation of liability cap tied to 12 months fees?"
          : "Are there any uncapped liability clauses in this agreement?",
        highRiskClauses.some((c: any) => c.clause_type === "termination")
          ? "Can the termination notice period be made mutual and extended to 30 days?"
          : "What are the early termination penalties and notice requirements?",
        highRiskClauses.some((c: any) => c.clause_type === "non_compete")
          ? "Can the non-compete clause be restricted to our specific geographic operating zone?"
          : "Is there a non-compete or non-solicitation clause after termination?",
        highRiskClauses.some((c: any) => c.clause_type === "indemnification")
          ? "Can employee indemnification be limited strictly to gross negligence?"
          : "What are my indemnification liabilities under this contract?",
      ].filter(Boolean);

      const dynamicSummary = `This contract has been analyzed with an overall risk score of ${analysis.overall_risk_score}/100 (${
        analysis.overall_risk_score > 70 ? "High Risk" : analysis.overall_risk_score > 40 ? "Moderate Risk" : "Low Risk"
      }). ${
        highRiskClauses.length > 0
          ? `Identified ${highRiskClauses.length} critical clause(s) requiring attention, including ${highRiskClauses
              .map((c: any) => c.clause_type)
              .join(", ")}.`
          : "All identified clauses fall within acceptable legal risk thresholds."
      } ${
        missingClauses.length > 0
          ? `Note: ${missingClauses.length} standard protective clause(s) were flagged as absent from the draft.`
          : ""
      }`;

      // 3. Return the overall score, risk_dimensions, multi-language info, and the extracted clauses list
      res.status(200).json({
        document_id: documentId,
        filename: document.filename,
        status: document.status,
        overall_risk_score: analysis.overall_risk_score,
        model_version: analysis.model_version,
        risk_dimensions: riskDimensions,
        original_language: analysis.original_language || "en",
        translation_used: analysis.translation_used ?? false,
        summary: dynamicSummary,
        missing_clauses: missingClauses,
        suggested_questions: suggestedQuestions,
        created_at: analysis.created_at,
        clauses: formattedClauses,
      });

    } catch (error) {
      next(error);
    }
  }
}
