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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Document uploaded successfully and analysis has been scheduled."
 *                 document:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *                     filename:
 *                       type: string
 *                       example: "employment_contract.pdf"
 *                     s3_key:
 *                       type: string
 *                       example: "uploads/user-uuid/f47ac10b-58cc-4372-a567-0e02b2c3d479-employment_contract.pdf"
 *                     status:
 *                       type: string
 *                       enum: [uploaded, processing, done, failed]
 *                       example: "uploaded"
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-08-03T12:00:00.000Z"
 *       400:
 *         description: Invalid input (no file, unsupported file extension, file too large)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error_code: "BAD_REQUEST"
 *               message: "Invalid file type. Only PDF and images (PNG, JPEG) are allowed."
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error_code: "UNAUTHORIZED"
 *               message: "Authentication token is missing or invalid"
 */
router.post("/", requireAuth, upload.single("file"), DocumentController.uploadDocument);

/**
 * @openapi
 * /api/v1/documents:
 *   get:
 *     summary: Retrieve a paginated list of documents
 *     description: Returns a list of uploaded documents belonging to the authenticated user.
 *     tags:
 *       - Documents
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of documents to return per page
 *     responses:
 *       200:
 *         description: List of documents retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 documents:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         example: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *                       filename:
 *                         type: string
 *                         example: "employment_contract.pdf"
 *                       s3_key:
 *                         type: string
 *                         example: "uploads/user-uuid/f47ac10b-58cc-4372-a567-0e02b2c3d479-employment_contract.pdf"
 *                       status:
 *                         type: string
 *                         enum: [uploaded, processing, done, failed]
 *                         example: "done"
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-08-03T12:00:00.000Z"
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *       401:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error_code: "UNAUTHORIZED"
 *               message: "Authentication token is missing or invalid"
 */
router.get("/", requireAuth, DocumentController.listDocuments);

/**
 * @openapi
 * /api/v1/documents/{id}:
 *   get:
 *     summary: Retrieve status of a specific document (Poll endpoint)
 *     description: Returns the analysis status and metadata of a single document by UUID.
 *     tags:
 *       - Documents
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique identifier of the document
 *     responses:
 *       200:
 *         description: Document status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 document:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *                     filename:
 *                       type: string
 *                       example: "employment_contract.pdf"
 *                     s3_key:
 *                       type: string
 *                       example: "uploads/user-uuid/f47ac10b-58cc-4372-a567-0e02b2c3d479-employment_contract.pdf"
 *                     status:
 *                       type: string
 *                       enum: [uploaded, processing, done, failed]
 *                       description: The analysis status (shows transition stages)
 *                       example: "processing"
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-08-03T12:00:00.000Z"
 *       401:
 *         description: Authentication failed
 *       404:
 *         description: Document not found or user lacks permission
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error_code: "NOT_FOUND"
 *               message: "Document not found or access denied"
 */
router.get("/:id", requireAuth, DocumentController.getDocumentStatus);
router.get("/:id/view", requireAuth, DocumentController.getDocumentViewUrl);
router.get("/:id/report", requireAuth, DocumentController.getDocumentReport);
router.post("/:id/share", requireAuth, DocumentController.shareDocument);
router.post("/:id/chat", requireAuth, DocumentController.streamChatSSE);

/**
 * @openapi
 * /api/v1/documents/{id}/report:
 *   get:
 *     summary: Download PDF contract analysis report
 *     description: Generates and downloads a complete PDF report of the contract analysis (including metadata, overall risk score, classified clauses, missing clauses, and chat history summary) using Puppeteer.
 *     tags:
 *       - Documents
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique ID of the document to retrieve report for
 *     responses:
 *       200:
 *         description: PDF file retrieved successfully. Returns binary PDF.
 *         headers:
 *           Content-Type:
 *             schema:
 *               type: string
 *               example: application/pdf
 *           Content-Disposition:
 *             schema:
 *               type: string
 *               example: attachment; filename="report-contract.pdf"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Document or analysis not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id/report", requireAuth, DocumentController.generatePDFReport);

/**
 * @openapi
 * /api/v1/documents/{id}/share:
 *   post:
 *     summary: Generate signed expiring link for public sharing
 *     description: Generates a JWT share token valid for 24 hours that allows read-only public access to the document's analysis.
 *     tags:
 *       - Documents
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique ID of the document to generate share link for
 *     responses:
 *       200:
 *         description: Share link generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 shareLink:
 *                   type: string
 *                   example: "http://localhost:4000/api/v1/share/jwt-token-string"
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                   example: "2026-08-04T12:00:00.000Z"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Document not found or access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/:id/share", requireAuth, DocumentController.generateShareLink);

/**
 * @openapi
 * /api/v1/documents/{id}/share:
 *   post:
 *     summary: Generate a shareable link for a document
 *     description: Sets the document as shared, generates a unique share token, and returns a shareable URL.
 *     tags:
 *       - Documents
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique ID of the document to share
 *     responses:
 *       200:
 *         description: Shareable link generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 shareableLink:
 *                   type: string
 *                   example: "http://localhost:5173/shared/f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *       401:
 *         description: Authentication failed
 *       404:
 *         description: Document not found or user lacks permission
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error_code: "NOT_FOUND"
 *               message: "Document not found or access denied"
 */
router.post("/:id/share", requireAuth, DocumentController.shareDocument);

export default router;
