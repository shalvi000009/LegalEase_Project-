import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { BadRequestError } from "../utils/errors";

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     NotificationPreferences:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         user_id:
 *           type: string
 *           format: uuid
 *         email_enabled:
 *           type: boolean
 *           default: true
 *         push_enabled:
 *           type: boolean
 *           default: true
 *         sms_enabled:
 *           type: boolean
 *           default: false
 *         phone_number:
 *           type: string
 *           nullable: true
 *           example: "+15551234567"
 *         fcm_token:
 *           type: string
 *           nullable: true
 *           example: "eXmPlE_fCm_ToKeN_12345"
 *         reminder_days:
 *           type: array
 *           items:
 *             type: integer
 *           example: [30, 7, 1]
 *         rescan_notify:
 *           type: boolean
 *           default: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *     UpdateNotificationPreferencesRequest:
 *       type: object
 *       properties:
 *         email_enabled:
 *           type: boolean
 *         push_enabled:
 *           type: boolean
 *         sms_enabled:
 *           type: boolean
 *         phone_number:
 *           type: string
 *         fcm_token:
 *           type: string
 *         reminder_days:
 *           type: array
 *           items:
 *             type: integer
 *         rescan_notify:
 *           type: boolean
 */

/**
 * @openapi
 * /api/v1/notification-preferences:
 *   get:
 *     summary: Retrieve current user's notification preferences and push tokens
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User notification preferences retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationPreferences'
 *       401:
 *         $ref: '#/components/responses/Error401'
 */
router.get("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    if (!reqAuth.user) {
      throw new BadRequestError("User context missing");
    }

    const userId = reqAuth.user.id;

    let prefs = await prisma.notificationPreferences.findFirst({
      where: { user_id: userId },
    });

    if (!prefs) {
      // Return default preferences if not yet created in DB
      prefs = await prisma.notificationPreferences.create({
        data: {
          user_id: userId,
          email_enabled: true,
          push_enabled: true,
          sms_enabled: false,
          reminder_days: [30, 7, 1],
          rescan_notify: true,
        },
      });
    }

    res.status(200).json(prefs);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api/v1/notification-preferences:
 *   post:
 *     summary: Create or update notification preferences and FCM push tokens
 *     tags:
 *       - Notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateNotificationPreferencesRequest'
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationPreferences'
 *       400:
 *         $ref: '#/components/responses/Error400'
 *       401:
 *         $ref: '#/components/responses/Error401'
 */
router.post("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    if (!reqAuth.user) {
      throw new BadRequestError("User context missing");
    }

    const userId = reqAuth.user.id;
    const { email_enabled, push_enabled, sms_enabled, phone_number, fcm_token, reminder_days, rescan_notify } = req.body;

    let prefs = await prisma.notificationPreferences.findFirst({
      where: { user_id: userId },
    });

    const updateData: any = {};
    if (email_enabled !== undefined) updateData.email_enabled = Boolean(email_enabled);
    if (push_enabled !== undefined) updateData.push_enabled = Boolean(push_enabled);
    if (sms_enabled !== undefined) updateData.sms_enabled = Boolean(sms_enabled);
    if (phone_number !== undefined) updateData.phone_number = phone_number;
    if (fcm_token !== undefined) updateData.fcm_token = fcm_token;
    if (Array.isArray(reminder_days)) updateData.reminder_days = reminder_days.map(d => parseInt(d, 10));
    if (rescan_notify !== undefined) updateData.rescan_notify = Boolean(rescan_notify);

    if (prefs) {
      prefs = await prisma.notificationPreferences.update({
        where: { id: prefs.id },
        data: updateData,
      });
    } else {
      prefs = await prisma.notificationPreferences.create({
        data: {
          user_id: userId,
          email_enabled: updateData.email_enabled ?? true,
          push_enabled: updateData.push_enabled ?? true,
          sms_enabled: updateData.sms_enabled ?? false,
          phone_number: updateData.phone_number || null,
          fcm_token: updateData.fcm_token || null,
          reminder_days: updateData.reminder_days || [30, 7, 1],
          rescan_notify: updateData.rescan_notify ?? true,
        },
      });
    }

    res.status(200).json(prefs);
  } catch (error) {
    next(error);
  }
});

export default router;
