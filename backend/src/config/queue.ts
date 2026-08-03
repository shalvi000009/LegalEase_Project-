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
