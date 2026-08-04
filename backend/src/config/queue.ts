import { Queue, ConnectionOptions } from "bullmq";
import { URL } from "url";
import { prisma } from "./db";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const isMock = process.env.MOCK_SERVICES === "true";

const parseRedisUrl = (url: string): ConnectionOptions => {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || "127.0.0.1",
      port: parseInt(parsed.port, 10) || 6379,
      username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      tls: parsed.protocol === "rediss:" ? {} : undefined,
    };
  } catch (error) {
    console.error(`Failed to parse REDIS_URL "${url}", falling back to default.`, error);
    return {
      host: "127.0.0.1",
      port: 6379,
    };
  }
};

export const connectionOptions = isMock ? {} as any : parseRedisUrl(redisUrl);

export const analysisQueue = isMock ? null as any : new Queue("document-analysis", {
  connection: connectionOptions,
});

export const enqueueAnalysisJob = async (documentId: string, s3Key: string): Promise<void> => {
  if (isMock) {
    console.log(`[Mock Queue] Enqueued analysis job for document ${documentId}`);
    // Simulate background worker inline
    setTimeout(async () => {
      try {
        console.log(`[Mock Worker] Started processing document ${documentId}`);
        await prisma.document.update({
          where: { id: documentId },
          data: { status: "processing" },
        });

        // Simulate 5 seconds processing latency
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const overallScore = Math.floor(Math.random() * 70) + 15;
        const analysis = await prisma.analysis.create({
          data: {
            document_id: documentId,
            overall_risk_score: overallScore,
            model_version: "legal-bert-v1.0.0-mock",
          },
        });

        const mockClauses = [
          {
            analysis_id: analysis.id,
            clause_type: "liability",
            risk_level: "high",
            explanation: "The limitation of liability is uncapped for third-party claims, which introduces substantial commercial risk.",
            original_text: "Each party shall be liable to the other without limit for any direct or indirect damages.",
            risk_score: 90,
          },
          {
            analysis_id: analysis.id,
            clause_type: "confidentiality",
            risk_level: "low",
            explanation: "Standard mutual confidentiality clause with appropriate exclusions for public domain information.",
            original_text: "The receiving party agrees to maintain the confidentiality of all proprietary information.",
            risk_score: 10,
          },
          {
            analysis_id: analysis.id,
            clause_type: "termination",
            risk_level: "medium",
            explanation: "Termination for convenience requires a 90-day notice period, which is slightly longer than the standard 30-60 days.",
            original_text: "Either party may terminate this agreement upon ninety (90) days written notice to the other party.",
            risk_score: 50,
          },
        ];

        await prisma.clause.createMany({
          data: mockClauses,
        });

        await prisma.document.update({
          where: { id: documentId },
          data: { status: "done" },
        });
        console.log(`[Mock Worker] Successfully completed document ${documentId}`);
      } catch (err) {
        console.error(`[Mock Worker] Error processing document ${documentId} in mock:`, err);
      }
    }, 1000);
    return;
  }

  await analysisQueue.add(
    "analyze_document",
    { documentId, s3Key },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
    }
  );
};
