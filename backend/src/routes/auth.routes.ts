import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { registerSchema, loginSchema, refreshSchema } from "../schemas/auth.schema";

const router = Router();

/**
 * @openapi
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           example:
 *             name: "Jane Doe"
 *             email: "jane.doe@example.com"
 *             password: "securePassword123"
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccessResponse'
 *             example:
 *               message: "User registered successfully"
 *               user:
 *                 id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
 *                 name: "Jane Doe"
 *                 email: "jane.doe@example.com"
 *                 created_at: "2026-07-20T18:00:00.000Z"
 *               tokens:
 *                 accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
 *                 refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
 *       400:
 *         description: Validation error or missing fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error_code: "VALIDATION_ERROR"
 *               message: "Validation failed"
 *               details:
 *                 - field: "email"
 *                   message: "Invalid email address format"
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error_code: "CONFLICT"
 *               message: "A user with this email address already exists"
 */
router.post("/register", validate(registerSchema), AuthController.register);

/**
 * @openapi
 * /api/v1/auth/login:
 *   post:
 *     summary: Authenticate user and issue tokens
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: "jane.doe@example.com"
 *             password: "securePassword123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccessResponse'
 *             example:
 *               message: "Login successful"
 *               user:
 *                 id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
 *                 name: "Jane Doe"
 *                 email: "jane.doe@example.com"
 *                 created_at: "2026-07-20T18:00:00.000Z"
 *               tokens:
 *                 accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
 *                 refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error_code: "VALIDATION_ERROR"
 *               message: "Validation failed"
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error_code: "UNAUTHORIZED"
 *               message: "Invalid email or password"
 */
router.post("/login", validate(loginSchema), AuthController.login);

/**
 * @openapi
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token using stateful refresh token
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshRequest'
 *           example:
 *             refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RefreshSuccessResponse'
 *             example:
 *               message: "Token refreshed successfully"
 *               tokens:
 *                 accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
 *                 refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error_code: "VALIDATION_ERROR"
 *               message: "Validation failed"
 *       401:
 *         description: Refresh token invalid, expired, or revoked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               error_code: "UNAUTHORIZED"
 *               message: "Refresh token is invalid, expired, or has been revoked"
 */
router.post("/refresh", validate(refreshSchema), AuthController.refresh);

export default router;
