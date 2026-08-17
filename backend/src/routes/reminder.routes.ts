import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { NotFoundError, BadRequestError } from "../utils/errors";

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     ReminderStatusEnum:
 *       type: string
 *       enum: [pending, sent, snoozed, resolved, failed]
 *     ReminderChannelEnum:
 *       type: string
 *       enum: [email, push, sms]
 *     Reminder:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         user_id:
 *           type: string
 *           format: uuid
 *         contract_date_id:
 *           type: string
 *           format: uuid
 *         days_before:
 *           type: integer
 *         scheduled_for:
 *           type: string
 *           format: date-time
 *         status:
 *           $ref: '#/components/schemas/ReminderStatusEnum'
 *         channel:
 *           $ref: '#/components/schemas/ReminderChannelEnum'
 *         sent_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         snoozed_until:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         contract_date:
 *           $ref: '#/components/schemas/ContractDate'
 *     SnoozeReminderRequest:
 *       type: object
 *       properties:
 *         snooze_days:
 *           type: integer
 *           example: 7
 *           description: Number of days to snooze the reminder
 *         snoozed_until:
 *           type: string
 *           format: date-time
 *           example: "2026-12-10T08:00:00.000Z"
 *           description: Explicit ISO date-time to reschedule the reminder
 */

/**
 * @openapi
 * /api/v1/reminders:
 *   get:
 *     summary: Retrieve user's scheduled and historical reminders
 *     tags:
 *       - Dates & Reminders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/ReminderStatusEnum'
 *         description: Filter reminders by status
 *       - in: query
 *         name: channel
 *         schema:
 *           $ref: '#/components/schemas/ReminderChannelEnum'
 *         description: Filter reminders by channel
 *     responses:
 *       200:
 *         description: List of user reminders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reminders:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Reminder'
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
    const { status, channel } = req.query;

    const whereClause: any = {
      user_id: userId,
    };

    if (status && typeof status === "string") {
      whereClause.status = status;
    }

    if (channel && typeof channel === "string") {
      whereClause.channel = channel;
    }

    const reminders = await prisma.reminder.findMany({
      where: whereClause,
      include: {
        contract_date: {
          include: {
            document: true,
          },
        },
      },
      orderBy: {
        scheduled_for: "asc",
      },
    });

    res.status(200).json({
      reminders,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api/v1/reminders/{id}/snooze:
 *   patch:
 *     summary: Snooze a pending reminder to a later date
 *     tags:
 *       - Dates & Reminders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Reminder UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SnoozeReminderRequest'
 *     responses:
 *       200:
 *         description: Reminder successfully snoozed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reminder'
 *       400:
 *         $ref: '#/components/responses/Error400'
 *       401:
 *         $ref: '#/components/responses/Error401'
 *       404:
 *         $ref: '#/components/responses/Error404'
 */
router.patch("/:id/snooze", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    if (!reqAuth.user) {
      throw new BadRequestError("User context missing");
    }

    const reminderId = req.params.id;
    const userId = reqAuth.user.id;
    const { snooze_days, snoozed_until } = req.body;

    const reminder = await prisma.reminder.findFirst({
      where: {
        id: reminderId,
        user_id: userId,
      },
    });

    if (!reminder) {
      throw new NotFoundError("Reminder not found");
    }

    let newSnoozedUntil: Date;

    if (snoozed_until) {
      newSnoozedUntil = new Date(snoozed_until);
      if (isNaN(newSnoozedUntil.getTime())) {
        throw new BadRequestError("Invalid snoozed_until date format");
      }
    } else if (typeof snooze_days === "number" && snooze_days > 0) {
      newSnoozedUntil = new Date();
      newSnoozedUntil.setDate(newSnoozedUntil.getDate() + snooze_days);
    } else {
      // Default snooze: 7 days
      newSnoozedUntil = new Date();
      newSnoozedUntil.setDate(newSnoozedUntil.getDate() + 7);
    }

    const updatedReminder = await prisma.reminder.update({
      where: { id: reminderId },
      data: {
        status: "snoozed",
        snoozed_until: newSnoozedUntil,
        scheduled_for: newSnoozedUntil,
      },
      include: {
        contract_date: true,
      },
    });

    res.status(200).json(updatedReminder);
  } catch (error) {
    next(error);
  }
});

export default router;
