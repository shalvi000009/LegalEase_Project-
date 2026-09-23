import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db";
import { BadRequestError, NotFoundError } from "../utils/errors";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "default_access_secret";

export class ShareController {
  /**
   * Retrieve read-only analysis data using a signed JWT token.
   * Access is public (no authentication headers required).
   */
  public static async getSharedAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.params;
      if (!token) {
        throw new BadRequestError("Share token is required");
      }

      let decoded: any;
      try {
        decoded = jwt.verify(token, ACCESS_SECRET);
      } catch (err) {
        throw new BadRequestError("Invalid or expired share token");
      }

      const { documentId } = decoded;
      if (!documentId) {
        throw new BadRequestError("Invalid token payload");
      }

      // Fetch the document (check existence)
      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new NotFoundError("Document not found");
      }

      // Fetch the analysis and clauses
      const analysis = await prisma.analysis.findFirst({
        where: { document_id: documentId },
        include: { clauses: true },
      });

      if (!analysis) {
        throw new NotFoundError("Analysis results are not ready yet or have failed");
      }

      res.status(200).json({
        document_id: documentId,
        filename: document.filename,
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
