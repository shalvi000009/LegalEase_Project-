import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import authRoutes from "./routes/auth.routes";
import documentRoutes from "./routes/document.routes";
import analysisRoutes from "./routes/analysis.routes";
import { swaggerSpec } from "./config/swagger";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

const app = express();

// CORS configuration scoped to configured origin (defaulting to Vite ports 3000 and 5173)
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  "http://localhost:3000",
  "http://localhost:5173",
].filter(Boolean) as string[];

app.use(cors({ origin: allowedOrigins }));

app.use(express.json());

// Root route redirecting to live Swagger UI
app.get("/", (_req, res) => {
  res.redirect("/docs");
});

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Healthcheck endpoint for containers and monitoring
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// JSON spec export endpoint (registered before Swagger UI wildcard routing)
app.get("/docs/openapi.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// Swagger UI live documentation endpoint
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/documents", analysisRoutes);

// Centralized error handling
app.use(errorHandler);

export default app;
