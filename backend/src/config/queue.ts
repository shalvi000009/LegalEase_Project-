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

const enableRedis = process.env.ENABLE_REDIS === "true" && !isMock;
export const connectionOptions = enableRedis ? parseRedisUrl(redisUrl) : {} as any;

export const analysisQueue = enableRedis ? new Queue("document-analysis", {
  connection: connectionOptions,
}) : null as any;

export const processDocumentJobReal = async (documentId: string, s3Key: string): Promise<void> => {
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";
  console.log(`[Worker] Started processing document ${documentId} with s3Key ${s3Key}`);

  try {
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "processing" },
    });
  } catch (err) {
    console.warn(`[Worker] Status update to processing warning for ${documentId}:`, err);
  }

  try {
    const aiResponse = await fetch(`${AI_SERVICE_URL}/api/v1/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ s3_key: s3Key, document_id: documentId }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI Service classification status ${aiResponse.status}`);
    }

    const aiData: any = await aiResponse.json();
    const overallScore = aiData.overall_risk_score ?? 50;
    const modelVersion = aiData.model_version ?? "legal-bert-v1.0.0";
    const clauses = aiData.clauses ?? [];
    const riskDimensions = aiData.risk_dimensions || null;
    const weightedOverallScore = aiData.weighted_risk_score || overallScore;
    const originalLanguage = aiData.original_language ?? "en";
    const translationUsed = aiData.translation_used ?? false;

    const preparedClauses = clauses.map((c: any) => ({
      analysis_id: "",
      clause_type: c.clause_type,
      risk_level: c.risk_level,
      explanation: c.explanation || c.matching_rules?.join("; ") || `Clause classified as ${c.clause_type}`,
      original_text: c.original_text || c.text || "",
      risk_score: c.risk_score,
      dimension_contributions: c.dimension_scores || c.dimension_contributions || null,
    }));

    const analysis = await prisma.analysis.create({
      data: {
        document_id: documentId,
        overall_risk_score: weightedOverallScore,
        model_version: modelVersion,
        risk_dimensions: riskDimensions as any,
        original_language: originalLanguage,
        translation_used: translationUsed,
      },
    });

    if (preparedClauses.length > 0) {
      await prisma.clause.createMany({
        data: preparedClauses.map((c: any) => ({
          ...c,
          analysis_id: analysis.id,
        })),
      });
    }

    // Extract dates & schedule reminders
    try {
      const datesRes = await fetch(`${AI_SERVICE_URL}/internal/extract-dates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: documentId, s3_key: s3Key }),
      });

      if (datesRes.ok) {
        const datesData: any = await datesRes.json();
        const extractedDates = datesData.dates || [];

        const docObj = await prisma.document.findUnique({ where: { id: documentId } });
        if (docObj && extractedDates.length > 0) {
          for (const d of extractedDates) {
            if (d.resolved_date) {
              const contractDate = await prisma.contractDate.create({
                data: {
                  doc_id: documentId,
                  date_type: d.type && ["expiry_date", "renewal_date", "notice_deadline", "payment_due", "probation_end", "lock_in_end"].includes(d.type) ? d.type : "other",
                  raw_text: d.raw_text || "Extracted date",
                  resolved_date: new Date(d.resolved_date),
                  confidence: d.confidence || 0.85,
                  user_confirmed: false,
                  is_active: true,
                },
              });

              const scheduledFor = new Date(contractDate.resolved_date.getTime() - 30 * 24 * 60 * 60 * 1000);
              await prisma.reminder.create({
                data: {
                  user_id: docObj.user_id,
                  contract_date_id: contractDate.id,
                  days_before: 30,
                  scheduled_for: scheduledFor > new Date() ? scheduledFor : new Date(),
                  status: "pending",
                  channel: "email",
                },
              });
            }
          }
        }
      }
    } catch (datesErr) {
      console.warn(`[Worker] Inline date extraction warning for ${documentId}:`, datesErr);
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "done" },
    });
    console.log(`[Worker] Successfully completed processing real document ${documentId}`);
  } catch (error: any) {
    console.error(`[Worker] Failed to process document ${documentId}:`, error?.stack || error);
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "failed" },
    }).catch(() => {});
  }
};

export const enqueueAnalysisJob = async (documentId: string, s3Key: string): Promise<void> => {
  if (isMock || !analysisQueue) {
    setTimeout(() => {
      processDocumentJobReal(documentId, s3Key);
    }, 100);
    return;
  }

  try {
    await analysisQueue.add(
      "analyze_document",
      { documentId, s3Key },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      }
    );
  } catch (queueErr) {
    console.warn(`[Queue] BullMQ add failed (Redis offline). Falling back to inline async processing:`, queueErr);
    setTimeout(() => {
      processDocumentJobReal(documentId, s3Key);
    }, 100);
  }
};
