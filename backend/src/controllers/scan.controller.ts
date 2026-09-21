import { Request, Response, NextFunction } from 'express';
import { IntegrationService } from '../services/integration.service';

export class ScanController {
  /**
   * Get paginated scan log history
   */
  static async getScanHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const history = await IntegrationService.getScanHistory(userId, page, limit);
      return res.status(200).json(history);
    } catch (err) {
      next(err);
    }
  }
}
