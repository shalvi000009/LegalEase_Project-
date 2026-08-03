import { Queue, ConnectionOptions } from "bullmq";
import { URL } from "url";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

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

export const connectionOptions = parseRedisUrl(redisUrl);

export const analysisQueue = new Queue("document-analysis", {
  connection: connectionOptions,
});

export const enqueueAnalysisJob = async (documentId: string, s3Key: string): Promise<void> => {
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
