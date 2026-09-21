import { Request, Response, NextFunction } from 'express';
import { IntegrationService } from '../services/integration.service';

export class IntegrationController {
  /**
   * Connect Gmail integration (OAuth consent URL or exchange code)
   */
  static async connectGmail(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id || req.body?.user_id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: missing user context' });
      }

      // If no code or email provided, return OAuth auth URL
      if (!req.body.code && !req.body.email_address) {
        const authUrl = IntegrationService.getGmailAuthUrl();
        return res.status(200).json({ auth_url: authUrl });
      }

      const result = await IntegrationService.connectGmail(userId, req.body);
      return res.status(200).json({
        message: 'Gmail integration connected successfully',
        integration: {
          id: result.id,
          provider: result.provider,
          email_address: result.email_address,
          is_active: result.is_active,
          created_at: result.created_at,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Connect Google Drive integration (OAuth consent URL or code + folder selection)
   */
  static async connectDrive(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id || req.body?.user_id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: missing user context' });
      }

      if (!req.body.code && !req.body.email_address && !req.body.folder_id) {
        const authUrl = IntegrationService.getDriveAuthUrl();
        return res.status(200).json({ auth_url: authUrl });
      }

      const result = await IntegrationService.connectGoogleDrive(userId, req.body);
      return res.status(200).json({
        message: 'Google Drive integration connected successfully',
        integration: {
          id: result.id,
          provider: result.provider,
          email_address: result.email_address,
          folder_id: result.folder_id,
          is_active: result.is_active,
          created_at: result.created_at,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Disconnect an active integration
   */
  static async disconnect(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id || req.body?.user_id;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const result = await IntegrationService.disconnectIntegration(userId, id);
      return res.status(200).json({
        message: 'Integration disconnected successfully',
        integration: {
          id: result.id,
          provider: result.provider,
          is_active: result.is_active,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * List all user integrations
   */
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const list = await IntegrationService.getUserIntegrations(userId);
      return res.status(200).json({ integrations: list });
    } catch (err) {
      next(err);
    }
  }

  /**
   * SendGrid Inbound Email Parse Webhook Endpoint
   */
  static async inboundEmailWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await IntegrationService.handleInboundEmailWebhook(req.body);
      return res.status(200).json({
        success: true,
        message: 'Inbound email webhook processed successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
