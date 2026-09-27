import app from "./app";
import { ensureBucketExists } from "./config/s3";
import { startAnalysisWorker } from "./services/analysis.worker";
import { startReminderWorker } from "./services/reminder.worker";
import { startAutoScanWorker } from "./services/autoScan.worker";

const PORT = parseInt(process.env.PORT || "4000", 10);
const HOST = "0.0.0.0";

const startServer = async () => {
  try {
    // 1. Ensure the S3/MinIO bucket exists on startup
    await ensureBucketExists();

    // 2. Start background BullMQ workers if enabled
    if (process.env.ENABLE_WORKERS === "true") {
      startAnalysisWorker();
      startReminderWorker();
      startAutoScanWorker();
      console.log("👷 Background analysis worker, reminder cron worker & auto-scan worker started successfully.");
    } else {
      console.log("👷 Async background pipeline initialized in fault-tolerant direct mode.");
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

// Server entry point updated for Chatbot accuracy fix
startServer();
