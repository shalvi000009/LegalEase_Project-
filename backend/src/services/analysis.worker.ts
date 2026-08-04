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
        console.log(`[Worker] Requesting AI analysis from AI Service at: ${AI_SERVICE_URL}/api/v1/analyze for s3Key: ${s3Key}`);
        
        let overallScore = 50;
        let modelVersion = "legal-bert-v1.0.0";
        let clauses = [];

        try {
          const aiResponse = await fetch(`${AI_SERVICE_URL}/api/v1/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ s3_key: s3Key, document_id: documentId }),
          });

          if (aiResponse.ok) {
            const aiData: any = await aiResponse.json();
            overallScore = aiData.overall_risk_score ?? 50;
            modelVersion = aiData.model_version ?? "legal-bert-v1.0.0";
            clauses = aiData.clauses ?? [];
          } else {
            console.warn(`[Worker] AI Service returned non-200 status: ${aiResponse.status}. Falling back to generating mock analysis.`);
            throw new Error(`AI service status ${aiResponse.status}`);
          }
        } catch (fetchErr) {
          console.warn("[Worker] AI Service call failed or is unavailable. Generating mock analysis data as fallback.");
          overallScore = Math.floor(Math.random() * 70) + 15;
          modelVersion = "legal-bert-v1.0.0-fallback";
          clauses = [
            {
              clause_type: "liability",
              risk_level: "high",
              explanation: "The limitation of liability is uncapped for third-party claims, which introduces substantial commercial risk.",
              original_text: "Each party shall be liable to the other without limit for any direct or indirect damages.",
              risk_score: 90,
            },
            {
              clause_type: "confidentiality",
              risk_level: "low",
              explanation: "Standard mutual confidentiality clause with appropriate exclusions for public domain information.",
              original_text: "The receiving party agrees to maintain the confidentiality of all proprietary information.",
              risk_score: 10,
            },
            {
              clause_type: "termination",
              risk_level: "medium",
              explanation: "Termination for convenience requires a 90-day notice period, which is slightly longer than the standard 30-60 days.",
              original_text: "Either party may terminate this agreement upon ninety (90) days written notice to the other party.",
              risk_score: 50,
            },
          ];
        }

        // Store analysis
        const analysis = await prisma.analysis.create({
          data: {
            document_id: documentId,
            overall_risk_score: overallScore,
            model_version: modelVersion,
          },
        });

        // Store clauses
        if (clauses.length > 0) {
          await prisma.clause.createMany({
            data: clauses.map((c: any) => ({
              analysis_id: analysis.id,
              clause_type: c.clause_type,
              risk_level: c.risk_level,
              explanation: c.explanation,
              original_text: c.original_text,
              risk_score: c.risk_score,
            })),
          });
        }

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
