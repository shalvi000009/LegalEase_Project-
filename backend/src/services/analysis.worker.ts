import { Worker, Job } from "bullmq";
import { connectionOptions } from "../config/queue";
import { prisma } from "../config/db";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export const startAnalysisWorker = (): Worker => {
  const worker = new Worker(
    "document-analysis",
    async (job: Job) => {
      const { documentId, s3Key } = job.data;
      console.log(`[Worker] Started processing document job ${job.id} for document ${documentId}`);

      // 1. Transition status to processing
      try {
        await prisma.document.update({
          where: { id: documentId },
          data: { status: "processing" },
        });
      } catch (dbErr) {
        console.error(`[Worker] Failed to update status to processing for document ${documentId}:`, dbErr);
        throw dbErr;
      }

      // 2. Call Rishi's /ai-service or simulate processing
      try {
        // TODO: Confirm the exact API endpoint and HTTP method with Rishi (AI/ML Engineer) in Week 3.
        // Rishi needs the s3_key format so his extraction job knows where to fetch the file from.
        // The expected contract will be:
        //   POST /api/v1/analyze
        //   Payload: { s3_key: s3Key, document_id: documentId }
        // For Week 2, since /ai-service is a stub, we simulate a 5-second processing delay to mock the extraction.
        console.log(`[Worker] Simulating AI analysis call to AI Service at: ${AI_SERVICE_URL}/api/v1/analyze for s3Key: ${s3Key}`);
        
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // 3. Transition status to done
        await prisma.document.update({
          where: { id: documentId },
          data: { status: "done" },
        });
        console.log(`[Worker] Successfully completed processing document ${documentId}`);
      } catch (error) {
        console.error(`[Worker] Failed to process document ${documentId}:`, error);
        // Fallback: transition status to failed
        await prisma.document.update({
          where: { id: documentId },
          data: { status: "failed" },
        }).catch((dbErr) => {
          console.error(`[Worker] Failed to mark document ${documentId} as failed:`, dbErr);
        });
        throw error;
      }
    },
    {
      connection: connectionOptions,
      concurrency: 2,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully.`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with error:`, err);
  });

  return worker;
};
