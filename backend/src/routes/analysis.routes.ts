import { Router } from "express";
import { AnalysisController } from "../controllers/analysis.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

/**
 * @openapi
 * /api/v1/documents/{id}/analysis:
 *   get:
 *     summary: Retrieve contract clause analysis and risk scoring
 *     description: Returns the overall risk score, model version, and the full list of classified clauses for a specified document.
 *     tags:
 *       - Analysis
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The unique ID of the document to retrieve analysis for
 *     responses:
 *       200:
 *         description: Analysis retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 document_id:
 *                   type: string
 *                   format: uuid
 *                   example: "f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *                 status:
 *                   type: string
 *                   example: "done"
 *                 overall_risk_score:
 *                   type: integer
 *                   example: 45
 *                 model_version:
 *                   type: string
 *                   example: "legal-bert-v1.0.0"
 *                 risk_dimensions:
 *                   type: object
 *                   properties:
 *                     financial:
 *                       type: integer
 *                       example: 80
 *                     legal:
 *                       type: integer
 *                       example: 75
 *                     privacy:
 *                       type: integer
 *                       example: 60
 *                     employment:
 *                       type: integer
 *                       example: 40
 *                     litigation:
 *                       type: integer
 *                       example: 70
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                   example: "2026-08-03T12:00:00.000Z"
 *                 clauses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "mock-clause-uuid"
 *                       clause_type:
 *                         type: string
 *                         enum: [liability, termination, indemnification, governing_law, confidentiality, intellectual_property, non_compete, payment, warranty, force_majeure, assignment, entire_agreement]
 *                         example: "liability"
 *                       risk_level:
 *                         type: string
 *                         enum: [low, medium, high]
 *                         example: "high"
 *                       explanation:
 *                         type: string
 *                         example: "The limitation of liability is uncapped."
 *                       original_text:
 *                         type: string
 *                         example: "Each party shall be liable without limit..."
 *                       risk_score:
 *                         type: integer
 *                         example: 90
 *       400:
 *         description: Analysis not ready yet or job failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               NotReady:
 *                 value:
 *                   error_code: "ANALYSIS_NOT_READY"
 *                   message: "Analysis is still in progress. Please try again later."
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Document not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/:id/analysis", requireAuth, AnalysisController.getAnalysis);

export default router;
