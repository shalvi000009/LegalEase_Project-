import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { prisma } from "../config/db";
import { uploadFile } from "../config/s3";
import { enqueueAnalysisJob } from "../config/queue";
import { BadRequestError, NotFoundError } from "../utils/errors";
import { AuthenticatedRequest } from "../middleware/auth";

const ALLOWED_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export class DocumentController {
  public static async uploadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reqAuth = req as AuthenticatedRequest;
      if (!reqAuth.user) {
        throw new BadRequestError("User context is missing");
      }

      if (!req.file) {
        throw new BadRequestError("No file uploaded");
      }

      if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
        throw new BadRequestError(`Invalid file type. Only PDF and images (PNG, JPEG) are allowed.`);
      }

      if (req.file.size > MAX_FILE_SIZE) {
        throw new BadRequestError(`File size exceeds the 10MB limit.`);
      }

      const documentId = crypto.randomUUID();
      const s3Key = `uploads/${reqAuth.user.id}/${documentId}-${req.file.originalname}`;

      // 1. Upload file buffer to S3/MinIO
      await uploadFile(s3Key, req.file.buffer, req.file.mimetype);

      // 2. Insert record in DB with status='uploaded'
      const document = await prisma.document.create({
        data: {
          id: documentId,
          user_id: reqAuth.user.id,
          filename: req.file.originalname,
          s3_key: s3Key,
          status: "uploaded",
        },
      });

      // 3. Enqueue BullMQ analysis job
      await enqueueAnalysisJob(document.id, document.s3_key);

      res.status(201).json({
        message: "Document uploaded successfully and analysis has been scheduled.",
        document: {
          id: document.id,
          filename: document.filename,
          s3_key: document.s3_key,
          status: document.status,
          created_at: document.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getDocumentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reqAuth = req as AuthenticatedRequest;
      if (!reqAuth.user) {
        throw new BadRequestError("User context is missing");
      }

      const { id } = req.params;

      const document = await prisma.document.findFirst({
        where: {
          id,
          user_id: reqAuth.user.id,
        },
      });

      if (!document) {
        throw new NotFoundError("Document not found or access denied");
      }

      res.status(200).json({
        document: {
          id: document.id,
          filename: document.filename,
          s3_key: document.s3_key,
          status: document.status,
          created_at: document.created_at,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async listDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reqAuth = req as AuthenticatedRequest;
      if (!reqAuth.user) {
        throw new BadRequestError("User context is missing");
      }

      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const skip = (page - 1) * limit;

      const [documents, total] = await Promise.all([
        prisma.document.findMany({
          where: { user_id: reqAuth.user.id },
          skip,
          take: limit,
          orderBy: { created_at: "desc" },
        }),
        prisma.document.count({
          where: { user_id: reqAuth.user.id },
        }),
      ]);

      res.status(200).json({
        documents: documents.map((doc: any) => ({
          id: doc.id,
          filename: doc.filename,
          s3_key: doc.s3_key,
          status: doc.status,
          created_at: doc.created_at,
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
