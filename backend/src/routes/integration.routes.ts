import { Router } from 'express';
import { IntegrationController } from '../controllers/integration.controller';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * @openapi
 * /api/v1/integrations:
 *   get:
 *     summary: List all active user integrations
 *     tags:
 *       - Integrations
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of connected integrations
 *       401:
 *         description: Unauthorized
 */
router.get('/', requireAuth, IntegrationController.list);

/**
 * @openapi
 * /api/v1/integrations/gmail/connect:
 *   post:
 *     summary: Connect Gmail integration via OAuth2 consent or code exchange
 *     tags:
 *       - Integrations
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 description: OAuth authorization code returned by Google
 *               email_address:
 *                 type: string
 *                 description: Optional user email address for connection
 *     responses:
 *       200:
 *         description: Connected integration or consent auth URL
 *       401:
 *         description: Unauthorized
 */
router.post('/gmail/connect', requireAuth, IntegrationController.connectGmail);

/**
 * @openapi
 * /api/v1/integrations/gdrive/connect:
 *   post:
 *     summary: Connect Google Drive integration with folder selection
 *     tags:
 *       - Integrations
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *               folder_id:
 *                 type: string
 *                 description: Watched folder ID in Google Drive
 *               email_address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Connected Google Drive integration or consent auth URL
 *       401:
 *         description: Unauthorized
 */
router.post('/gdrive/connect', requireAuth, IntegrationController.connectDrive);

/**
 * @openapi
 * /api/v1/integrations/{id}/disconnect:
 *   post:
 *     summary: Disconnect and revoke integration access
 *     tags:
 *       - Integrations
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Integration disconnected
 *       404:
 *         description: Integration not found
 */
router.post('/:id/disconnect', requireAuth, IntegrationController.disconnect);

export default router;
