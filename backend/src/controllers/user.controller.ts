import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { AuthenticatedRequest } from "../middleware/auth";
import { BadRequestError } from "../utils/errors";

export class UserController {
  /**
   * GET /api/v1/users/preferences
   * Returns the user's saved preferred output language.
   */
  public static async getPreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reqAuth = req as AuthenticatedRequest;
      if (!reqAuth.user) {
        throw new BadRequestError("User context missing");
      }

      const user = await prisma.user.findUnique({
        where: { id: reqAuth.user.id },
        select: {
          id: true,
          preferred_output_language: true,
        },
      });

      res.status(200).json({
        preferred_output_language: user?.preferred_output_language || null,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/users/preferences
   * Updates the user's preferred output language.
   */
  public static async updatePreferences(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reqAuth = req as AuthenticatedRequest;
      if (!reqAuth.user) {
        throw new BadRequestError("User context missing");
      }

      const { preferred_output_language } = req.body;

      const updatedUser = await prisma.user.update({
        where: { id: reqAuth.user.id },
        data: {
          preferred_output_language: preferred_output_language !== undefined ? preferred_output_language : null,
        },
        select: {
          id: true,
          preferred_output_language: true,
        },
      });

      res.status(200).json({
        message: "Preferences updated successfully",
        preferred_output_language: updatedUser.preferred_output_language,
      });
    } catch (error) {
      next(error);
    }
  }
}
