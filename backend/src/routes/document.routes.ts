import { Router } from "express";
import multer from "multer";
import { DocumentController } from "../controllers/document.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

/**
 * @openapi
 * /api/v1/documents:
 *   post:
 *     summary: Upload a new contract document
 *     description: Accepts a PDF or image file, uploads it to S3-compatible storage, creates a database record, and queues analysis.
 *     tags:
 *       - Documents
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Contract file to analyze (PDF, PNG, JPEG, JPG, max 10MB)
 *     responses:
 *       201:
 *         description: Document uploaded and analysis job queued successfully
 *       400:
 *         description: Invalid input (no file, unsupported file extension, file too large)
 *       401:
 *         description: Authentication failed
 */
router.post("/", requireAuth, upload.single("file"), DocumentController.uploadDocument);

/**
 * @openapi
 * /api/v1/documents:
 *   get:
 *     summary: Retrieve a paginated list of documents
 *     tags:
 *       - Documents
 *     security:
 *       - BearerAuth: []
 */
router.get("/", requireAuth, DocumentController.listDocuments);

/**
 * @openapi
 * /api/v1/documents/{id}:
 *   get:
 *     summary: Retrieve status of a specific document (Poll endpoint)
 *     tags:
 *       - Documents
 *     security:
 *       - BearerAuth: []
 */
router.get("/:id", requireAuth, DocumentController.getDocumentStatus);
router.get("/:id/view", requireAuth, DocumentController.getDocumentViewUrl);

/**
 * @openapi
 * /api/v1/documents/{id}/report:
 *   get:
 *     summary: Download PDF contract analysis report
 *     tags:
 *       - Documents
 *     security:
 *       - BearerAuth: []
 */
router.get("/:id/report", requireAuth, DocumentController.generatePDFReport);

/**
 * @openapi
 * /api/v1/documents/{id}/share:
 *   post:
 *     summary: Generate signed expiring link for public sharing
 *     tags:
 *       - Documents
 *     security:
 *       - BearerAuth: []
 */
router.post("/:id/share", requireAuth, DocumentController.generateShareLink);

/**
 * @openapi
 * /api/v1/documents/{id}/chat:
 *   post:
 *     summary: Stream SSE chat responses
 *     tags:
 *       - Documents
 *     security:
 *       - BearerAuth: []
 */
router.post("/:id/chat", requireAuth, DocumentController.streamChatSSE);

export default router;
