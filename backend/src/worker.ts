import { startAnalysisWorker } from "./services/analysis.worker";
import { startReminderWorker } from "./services/reminder.worker";
import { startAutoScanWorker } from "./services/autoScan.worker";

console.log("👷 Starting LegalEase BullMQ background workers...");

try {
  startAnalysisWorker();
  startReminderWorker();
  startAutoScanWorker();
  console.log("🚀 LegalEase background workers are actively running and listening for jobs.");
} catch (err) {
  console.error("❌ Failed to start background workers:", err);
}
