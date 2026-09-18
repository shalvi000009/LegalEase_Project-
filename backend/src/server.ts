import app from "./app";
import { ensureBucketExists } from "./config/s3";
import { startAnalysisWorker } from "./services/analysis.worker";
import { startReminderWorker } from "./services/reminder.worker";

const PORT = parseInt(process.env.PORT || "4000", 10);
const HOST = "0.0.0.0";

const startServer = async () => {
  try {
    // 1. Ensure the S3/MinIO bucket exists on startup
    await ensureBucketExists();

    // 2. Start background BullMQ workers
    if (process.env.MOCK_SERVICES !== "true") {
      startAnalysisWorker();
      startReminderWorker();
      console.log("👷 Background analysis worker & reminder cron worker started successfully.");
    } else {
      console.log("👷 Mock services enabled, background workers initialized inline.");
    }

    // 3. Start Express server
    app.listen(PORT, HOST, () => {
      console.log(`🚀 LegalEase Backend listening on http://localhost:${PORT}`);
      console.log(`📚 Swagger documentation live at http://localhost:${PORT}/docs`);
      console.log(`❤️  Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("FATAL: Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
