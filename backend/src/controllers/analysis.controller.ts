import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { BadRequestError, NotFoundError } from "../utils/errors";
import { AuthenticatedRequest } from "../middleware/auth";

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

      // 3. Return the overall score and the extracted clauses list
      res.status(200).json({
        document_id: documentId,
        status: document.status,
        overall_risk_score: analysis.overall_risk_score,
        model_version: analysis.model_version,
        created_at: analysis.created_at,
        clauses: analysis.clauses.map((c: any) => ({
          id: c.id,
          clause_type: c.clause_type,
          risk_level: c.risk_level,
          explanation: c.explanation,
          original_text: c.original_text,
          risk_score: c.risk_score,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
}
