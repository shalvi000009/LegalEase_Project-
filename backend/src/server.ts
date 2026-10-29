import app from "./app";
import { ensureBucketExists } from "./config/s3";
import { startAnalysisWorker } from "./services/analysis.worker";
import { startReminderWorker } from "./services/reminder.worker";
import { startAutoScanWorker } from "./services/autoScan.worker";
import { AiClient } from "./services/aiClient";

const PORT = parseInt(process.env.PORT || "4000", 10);

const startServer = async () => {
  try {
    // 1. Ensure the S3/MinIO bucket exists on startup
    await ensureBucketExists();

    // 2. Perform AI microservice connection handshake
    await AiClient.checkConnection();

    // 2. Start background BullMQ workers if enabled
    if (process.env.ENABLE_WORKERS === "true") {
      startAnalysisWorker();
      startReminderWorker();
      startAutoScanWorker();
      console.log("👷 Background analysis worker, reminder cron worker & auto-scan worker started successfully.");
    } else {
      console.log("👷 Async background pipeline initialized in fault-tolerant direct mode.");
    }

    // 3. Start Express server (supports dual-stack IPv4/IPv6 on all network interfaces)
    const server = app.listen(PORT, () => {
      console.log(`🚀 LegalEase Backend listening on http://localhost:${PORT}`);
      console.log(`📚 Swagger documentation live at http://localhost:${PORT}/docs`);
      console.log(`❤️  Health check available at http://localhost:${PORT}/health`);
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(`\n❌ Error: Port ${PORT} is already in use by another running process.`);
        console.error(`💡 To free port ${PORT}, run this command in your terminal:`);
        console.error(`   kill -9 $(lsof -ti :${PORT})\n`);
        process.exit(1);
      } else {
        console.error("FATAL server error:", err);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error("FATAL: Failed to start server:", error);
    process.exit(1);
  }
};

// Server entry point updated for Chatbot accuracy fix
startServer();
