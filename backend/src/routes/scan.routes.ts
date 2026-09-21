import { Router } from 'express';
import { ScanController } from '../controllers/scan.controller';
import { IntegrationController } from '../controllers/integration.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /api/v1/scan-history:
 *   get:
 *     summary: Get paginated auto-scan history log
 *     tags:
 *       - Auto-Scan
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated scan logs list
 *       401:
 *         description: Unauthorized
 */
router.get('/scan-history', requireAuth, ScanController.getScanHistory);

/**
 * @openapi
 * /webhook/inbound-email:
 *   post:
 *     summary: SendGrid Inbound Parse email webhook
 *     description: Receives inbound email payload with contract attachments, auto-detects contracts, and queues analysis.
 *     tags:
 *       - Webhooks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               from:
 *                 type: string
 *               to:
 *                 type: string
 *               subject:
 *                 type: string
 *     responses:
 *       200:
 *         description: Inbound email webhook processed successfully
 */
router.post('/webhook/inbound-email', IntegrationController.inboundEmailWebhook);

export default router;
