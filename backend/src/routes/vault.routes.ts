import { Router, Request, Response, NextFunction } from "express";
import { requireAuth, AuthenticatedRequest } from "../middleware/auth";
import { BadRequestError, NotFoundError } from "../utils/errors";
import { getVaultContractsForUser } from "../services/contractDate.service";
import { prisma } from "../config/db";

const router = Router();

/**
 * @openapi
 * /api/v1/vault/contracts:
 *   get:
 *     summary: Retrieve all user's analyzed contracts with deadlines, status, and stats for the Vault
 *     tags:
 *       - Vault
 *     security:
 *       - bearerAuth: []
 */
router.get("/contracts", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    if (!reqAuth.user) {
      throw new BadRequestError("User context missing");
    }

    const data = await getVaultContractsForUser(reqAuth.user.id);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * Also expose root GET / for convenience
 */
router.get("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    if (!reqAuth.user) {
      throw new BadRequestError("User context missing");
    }

    const data = await getVaultContractsForUser(reqAuth.user.id);
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api/v1/vault/contracts/{id}/status:
 *   patch:
 *     summary: Update manual status of a contract (e.g. mark renewed)
 *     tags:
 *       - Vault
 *     security:
 *       - bearerAuth: []
 */
router.patch("/contracts/:id/status", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reqAuth = req as AuthenticatedRequest;
    if (!reqAuth.user) {
      throw new BadRequestError("User context missing");
    }

    const { id } = req.params;
    const { status } = req.body;

    const document = await prisma.document.findFirst({
      where: { id, user_id: reqAuth.user.id },
    });

    if (!document) {
      throw new NotFoundError("Contract not found");
    }

    // If marked renewed, ensure renewal date exists or extend expiry by 1 year
    if (status === "renewed") {
      const expiry = await prisma.contractDate.findFirst({
        where: { doc_id: id, date_type: "expiry_date", is_active: true },
      });
      if (expiry) {
        const nextYear = new Date(expiry.resolved_date);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        await prisma.contractDate.update({
          where: { id: expiry.id },
          data: {
            resolved_date: nextYear,
            user_confirmed: true,
          },
        });
      }
    }

    const updatedData = await getVaultContractsForUser(reqAuth.user.id);
    res.status(200).json({ success: true, updatedData });
  } catch (error) {
    next(error);
  }
});

export default router;

