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

      // 3. Return the overall score, risk_dimensions, multi-language info, and the extracted clauses list
      res.status(200).json({
        document_id: documentId,
        status: document.status,
        overall_risk_score: analysis.overall_risk_score,
        model_version: analysis.model_version,
        risk_dimensions: riskDimensions,
        original_language: analysis.original_language || "en",
        translation_used: analysis.translation_used ?? false,
        created_at: analysis.created_at,
        clauses: formattedClauses,
      });
    } catch (error) {
      next(error);
    }
  }
}
