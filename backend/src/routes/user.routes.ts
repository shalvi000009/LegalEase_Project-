import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

/**
 * @openapi
 * /api/v1/users/preferences:
 *   get:
 *     summary: Retrieve user's language preferences
 *     tags:
 *       - User Preferences
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User preferences retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 preferred_output_language:
 *                   type: string
 *                   nullable: true
 *                   example: "hi"
 *   patch:
 *     summary: Update user's language preference
 *     tags:
 *       - User Preferences
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preferred_output_language:
 *                 type: string
 *                 nullable: true
 *                 example: "hi"
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 */
router.get("/preferences", requireAuth, UserController.getPreferences);
router.patch("/preferences", requireAuth, UserController.updatePreferences);

export default router;
