import { Worker, Job } from "bullmq";
import { connectionOptions } from "../config/queue";
import { prisma } from "../config/db";
import {
  calculateClauseDimensionContributions,
  calculateAggregatedRiskDimensions,
  calculateWeightedOverallRiskScore,
} from "../config/riskWeights";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export const startAnalysisWorker = (): Worker => {
  if (process.env.ENABLE_REDIS !== "true") {
    console.log("👷 Analysis worker running in direct inline mode.");
    return null as any;
  }

  const worker = new Worker(
    "document-analysis",
    async (job: Job) => {
      const { documentId, s3Key } = job.data;

      console.log(
        `[Worker] Started processing document job ${job.id} for document ${documentId}`
      );

      // 1. Transition status to processing
      try {
        await prisma.document.update({
          where: { id: documentId },
          data: { status: "processing" },
        });
      } catch (dbErr: unknown) {
        console.error(
          `[Worker] Failed to update status to processing for document ${documentId}:`,
          dbErr
        );
        throw dbErr;
      }

      try {
        console.log(
          `[Worker] Requesting AI analysis from AI Service at: ${AI_SERVICE_URL}/api/v1/analyze for s3Key: ${s3Key}`
        );

        let overallScore = 50;
        let modelVersion = "legal-bert-v1.0.0";
        let clauses: any[] = [];

        try {
          const aiResponse = await fetch(`${AI_SERVICE_URL}/api/v1/analyze`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              s3_key: s3Key,
              document_id: documentId,
            }),
          });

          if (aiResponse.ok) {
            const aiData: any = await aiResponse.json();

            overallScore = aiData.overall_risk_score ?? 50;
            modelVersion = aiData.model_version ?? "legal-bert-v1.0.0";
            clauses = aiData.clauses ?? [];
          } else {
            throw new Error(`AI service status ${aiResponse.status}`);
          }
        } catch (fetchErr: unknown) {
          console.error(`[Worker] AI Service call failed for document ${documentId}:`, fetchErr);
          throw fetchErr;
        }

        // TODO: Switch to Rishi's live per-clause dimension_scores when AI service endpoint is confirmed
        const preparedClauses = clauses.map((c: any) => {
          const contribs = c.dimension_scores || calculateClauseDimensionContributions(c.clause_type, c.risk_score);
          return {
            ...c,
            dimension_contributions: contribs,
          };
        });

        const riskDimensions = calculateAggregatedRiskDimensions(preparedClauses);
        const weightedOverallScore = calculateWeightedOverallRiskScore(riskDimensions);

        // If no clauses were extracted, reject document as non-contract
        if (preparedClauses.length === 0) {
          await prisma.document.update({
            where: { id: documentId },
            data: { status: "failed" },
          });
          console.log(`[Worker] Document ${documentId} failed analysis: No legal contract clauses found.`);
          return;
        }

        // Store analysis
        const analysis = await prisma.analysis.create({
          data: {
            document_id: documentId,
            overall_risk_score: weightedOverallScore || overallScore,
            model_version: modelVersion,
            risk_dimensions: riskDimensions as any,
          },
        });

        // Store clauses
        await prisma.clause.createMany({
          data: preparedClauses.map((c: any) => ({
            analysis_id: analysis.id,
            clause_type: c.clause_type,
            risk_level: c.risk_level,
            explanation: c.explanation,
            original_text: c.original_text,
            risk_score: c.risk_score,
            dimension_contributions: c.dimension_contributions as any,
          })),
        });

        // 3. Transition status to done
        await prisma.document.update({
          where: { id: documentId },
          data: { status: "done" },
        });
        console.log(
          `[Worker] Successfully completed processing document ${documentId}`
        );
      } catch (error: unknown) {
        console.error(
          `[Worker] Failed to process document ${documentId}:`,
          error
        );

        // Fallback: transition status to failed
        await prisma.document
          .update({
            where: { id: documentId },
            data: { status: "failed" },
          })
          .catch((dbErr: unknown) => {
            console.error(
              `[Worker] Failed to mark document ${documentId} as failed:`,
              dbErr
            );
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