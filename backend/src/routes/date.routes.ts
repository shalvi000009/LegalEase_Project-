import { Router, Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { NotFoundError, BadRequestError } from "../utils/errors";

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     DateTypeEnum:
 *       type: string
 *       enum:
 *         - expiry_date
 *         - renewal_date
 *         - notice_deadline
 *         - payment_due
 *         - probation_end
 *         - lock_in_end
 *         - other
 *       description: Specific classification of the extracted or user-added contract date.
 *     ContractDate:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         doc_id:
 *           type: string
 *           format: uuid
 *         date_type:
 *           $ref: '#/components/schemas/DateTypeEnum'
 *         raw_text:
 *           type: string
 *         resolved_date:
 *           type: string
 *           format: date-time
 *         confidence:
 *           type: number
 *           format: float
 *         clause_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         user_confirmed:
 *           type: boolean
 *         is_active:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *         reminders:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Reminder'
 *     CreateDateRequest:
 *       type: object
 *       required:
 *         - date_type
 *         - raw_text
 *         - resolved_date
 *       properties:
 *         date_type:
 *           $ref: '#/components/schemas/DateTypeEnum'
 *         raw_text:
 *           type: string
 *           example: "Section 12.2: Expiration Date December 31, 2026"
 *         resolved_date:
 *           type: string
 *           format: date-time
 *           example: "2026-12-31T00:00:00.000Z"
 *         confidence:
 *           type: number
 *           default: 1.0
 *         clause_id:
 *           type: string
 *           format: uuid
 *         user_confirmed:
 *           type: boolean
 *           default: true
 *         reminders:
 *           type: array
 *           description: Optional list of reminder offsets in days before deadline
 *           items:
 *             type: object
 *             required:
 *               - days_before
 *             properties:
 *               days_before:
 *                 type: integer
 *                 example: 30
 *               channel:
 *                 type: string
 *                 enum: [email, push, sms]
 *                 default: email
 */

/**
 * @openapi
 * /api/v1/documents/{id}/dates:
 *   get:
 *     summary: Retrieve extracted and user-added contract dates for a document
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
 *         description: Document UUID
 *     responses:
 *       200:
 *         description: List of contract dates associated with the document
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 document_id:
 *                   type: string
 *                   format: uuid
 *                 dates:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ContractDate'
 *       401:
 *         $ref: '#/components/responses/Error401'
 *       404:
 *         $ref: '#/components/responses/Error404'
 */
router.get("/:id/dates", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    if (!reqAuth.user) {
      throw new BadRequestError("User context missing");
    }

    const documentId = req.params.id;
    const userId = reqAuth.user.id;

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        user_id: userId,
      },
    });

    if (!document) {
      throw new NotFoundError("Document not found");
    }

    const dates = await prisma.contractDate.findMany({
      where: {
        doc_id: documentId,
        is_active: true,
      },
      include: {
        reminders: true,
      },
      orderBy: {
        resolved_date: "asc",
      },
    });

    res.status(200).json({
      document_id: documentId,
      dates,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api/v1/documents/{id}/dates:
 *   post:
 *     summary: Add or correct a contract date for a document
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
 *         description: Document UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDateRequest'
 *     responses:
 *       201:
 *         description: Contract date created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContractDate'
 *       400:
 *         $ref: '#/components/responses/Error400'
 *       401:
 *         $ref: '#/components/responses/Error401'
 *       404:
 *         $ref: '#/components/responses/Error404'
 */
router.post("/:id/dates", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    if (!reqAuth.user) {
      throw new BadRequestError("User context missing");
    }

    const documentId = req.params.id;
    const userId = reqAuth.user.id;
    const { date_type, raw_text, resolved_date, confidence, clause_id, user_confirmed, reminders } = req.body;

    if (!date_type || !raw_text || !resolved_date) {
      throw new BadRequestError("date_type, raw_text, and resolved_date are required fields");
    }

    const validDateTypes = ["expiry_date", "renewal_date", "notice_deadline", "payment_due", "probation_end", "lock_in_end", "other"];
    if (!validDateTypes.includes(date_type)) {
      throw new BadRequestError(`Invalid date_type. Allowed values: ${validDateTypes.join(", ")}`);
    }

    const parsedResolvedDate = new Date(resolved_date);
    if (isNaN(parsedResolvedDate.getTime())) {
      throw new BadRequestError("Invalid resolved_date format");
    }

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        user_id: userId,
      },
    });

    if (!document) {
      throw new NotFoundError("Document not found");
    }

    // Create contract date entry
    const contractDate = await prisma.contractDate.create({
      data: {
        doc_id: documentId,
        date_type,
        raw_text,
        resolved_date: parsedResolvedDate,
        confidence: typeof confidence === "number" ? confidence : 1.0,
        clause_id: clause_id || null,
        user_confirmed: user_confirmed !== undefined ? Boolean(user_confirmed) : true,
        is_active: true,
      },
    });

    // Optionally create scheduled reminders if provided
    if (Array.isArray(reminders) && reminders.length > 0) {
      for (const item of reminders) {
        const daysBefore = parseInt(item.days_before, 10) || 7;
        const channel = ["email", "push", "sms"].includes(item.channel) ? item.channel : "email";

        const scheduledFor = new Date(parsedResolvedDate.getTime());
        scheduledFor.setDate(scheduledFor.getDate() - daysBefore);

        await prisma.reminder.create({
          data: {
            user_id: userId,
            contract_date_id: contractDate.id,
            days_before: daysBefore,
            scheduled_for: scheduledFor,
            status: "pending",
            channel,
          },
        });
      }
    }

    const result = await prisma.contractDate.findUnique({
      where: { id: contractDate.id },
      include: { reminders: true },
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});


/**
 * @openapi
 * /api/v1/documents/{id}/dates/{dateId}:
 *   patch:
 *     summary: Update an existing contract date
 *     tags:
 *       - Dates & Reminders
 *     security:
 *       - bearerAuth: []
 */
router.patch("/:id/dates/:dateId", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    if (!reqAuth.user) throw new BadRequestError("User context missing");

    const { id: documentId, dateId } = req.params;
    const userId = reqAuth.user.id;
    const { date_type, raw_text, resolved_date, user_confirmed } = req.body;

    const document = await prisma.document.findFirst({
      where: { id: documentId, user_id: userId },
    });
    if (!document) throw new NotFoundError("Document not found");

    const existingDate = await prisma.contractDate.findFirst({
      where: { id: dateId, doc_id: documentId },
    });
    if (!existingDate) throw new NotFoundError("Contract date not found");

    const updateData: any = {};
    if (date_type !== undefined) updateData.date_type = date_type;
    if (raw_text !== undefined) updateData.raw_text = raw_text;
    if (user_confirmed !== undefined) updateData.user_confirmed = Boolean(user_confirmed);
    if (resolved_date !== undefined) {
      const parsed = new Date(resolved_date);
      if (isNaN(parsed.getTime())) throw new BadRequestError("Invalid resolved_date format");
      updateData.resolved_date = parsed;
    }

    const updated = await prisma.contractDate.update({
      where: { id: dateId },
      data: updateData,
    });

    // If expiry date or renewal was modified, refresh reminders
    if (
      (updated.date_type === "expiry_date" || updated.date_type === "renewal_date") &&
      updateData.resolved_date
    ) {
      const { saveContractDatesAndReminders } = await import("../services/contractDate.service");
      await saveContractDatesAndReminders(
        documentId,
        userId,
        {
          expiry_date: updated.date_type === "expiry_date" ? updated.resolved_date.toISOString().split("T")[0] : undefined,
          renewal_date: updated.date_type === "renewal_date" ? updated.resolved_date.toISOString().split("T")[0] : undefined,
        },
        "manual"
      );
    }

    res.status(200).json({ date: updated });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api/v1/documents/{id}/dates/confirm-all:
 *   post:
 *     summary: Confirm all contract dates for a document
 *     tags:
 *       - Dates & Reminders
 *     security:
 *       - bearerAuth: []
 */
router.post("/:id/dates/confirm-all", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    if (!reqAuth.user) throw new BadRequestError("User context missing");

    const documentId = req.params.id;
    const userId = reqAuth.user.id;

    const document = await prisma.document.findFirst({
      where: { id: documentId, user_id: userId },
    });
    if (!document) throw new NotFoundError("Document not found");

    await prisma.contractDate.updateMany({
      where: { doc_id: documentId },
      data: { user_confirmed: true },
    });

    const dates = await prisma.contractDate.findMany({
      where: { doc_id: documentId, is_active: true },
      orderBy: { resolved_date: "asc" },
    });

    res.status(200).json({ dates });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api/v1/documents/{id}/dates/{dateId}:
 *   delete:
 *     summary: Soft delete or remove a contract date
 *     tags:
 *       - Dates & Reminders
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:id/dates/:dateId", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    if (!reqAuth.user) throw new BadRequestError("User context missing");

    const { id: documentId, dateId } = req.params;
    const userId = reqAuth.user.id;

    const document = await prisma.document.findFirst({
      where: { id: documentId, user_id: userId },
    });
    if (!document) throw new NotFoundError("Document not found");

    const existingDate = await prisma.contractDate.findFirst({
      where: { id: dateId, doc_id: documentId },
    });
    if (!existingDate) throw new NotFoundError("Contract date not found");

    // Remove pending reminders
    await prisma.reminder.deleteMany({
      where: { contract_date_id: dateId, status: "pending" },
    });

    // Deactivate date
    await prisma.contractDate.update({
      where: { id: dateId },
      data: { is_active: false },
    });

    res.status(200).json({ success: true, message: "Date deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;
