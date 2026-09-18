import { Router } from "express";
import { ShareController } from "../controllers/share.controller";

const router = Router();

/**
 * @openapi
 * /api/v1/share/{token}:
 *   get:
 *     summary: Retrieve read-only analysis data via signed token
 *     description: Returns document metadata and analyzed clauses without requiring authentication, provided a valid signed JWT share token is supplied.
 *     tags:
 *       - Share
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Expiring signed JWT share token
 *     responses:
 *       200:
 *         description: Shared analysis details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 document_id:
 *                   type: string
 *                   format: uuid
 *                   example: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *                 filename:
 *                   type: string
 *                   example: "contract.pdf"
 *                 status:
 *                   type: string
 *                   example: "done"
 *                 overall_risk_score:
 *                   type: integer
 *                   example: 45
 *                 model_version:
 *                   type: string
 *                   example: "legal-bert-v1.0.0"
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 clauses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       clause_type:
 *                         type: string
 *                       risk_level:
 *                         type: string
 *                       explanation:
 *                         type: string
 *                       original_text:
 *                         type: string
 *                       risk_score:
 *                         type: integer
 *       400:
 *         description: Invalid or expired share token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Document or analysis results not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:token", ShareController.getSharedAnalysis);

export default router;
