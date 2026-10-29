import { URL } from "url";

export interface AiHealthResponse {
  status: string;
  service: string;
  version: string;
  classifier?: string;
}

export interface AiAnalyzeResponse {
  status: string;
  doc_id: string;
  overall_risk_score: number;
  overall_risk_level: string;
  clauses: Array<{
    id?: string;
    clause_type: string;
    risk_level: string;
    risk_score: number;
    explanation?: string;
    text?: string;
    original_text?: string;
    confidence?: number;
    dimension_scores?: Record<string, number>;
  }>;
  missing_clauses?: string[];
  suggested_questions?: string[];
  risk_dimensions?: Record<string, number>;
  weighted_risk_score?: number;
  model_version?: string;
  original_language?: string;
  translation_used?: boolean;
}

export interface AiRagResponse {
  answer: string;
  sources: Array<{
    chunk_index?: number;
    chunk_id?: string;
    text: string;
    relevance_score?: number;
  }>;
  cached?: boolean;
}

export class AiClient {
  private static baseUrl = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

  public static getBaseUrl(): string {
    return this.baseUrl;
  }

  public static async health(): Promise<AiHealthResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`AI service health returned HTTP ${res.status}`);
      }

      return (await res.json()) as AiHealthResponse;
    } catch (err: any) {
      throw new Error(`AI service health check failed at ${this.baseUrl}: ${err.message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  public static async analyze(docId: string, s3Key: string): Promise<AiAnalyzeResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 120s timeout per guide

    try {
      const res = await fetch(`${this.baseUrl}/internal/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_id: docId,
          document_id: docId,
          s3_key: s3Key,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        // Fallback to /api/v1/analyze for backwards compatibility if needed
        const fallbackRes = await fetch(`${this.baseUrl}/api/v1/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            doc_id: docId,
            document_id: docId,
            s3_key: s3Key,
          }),
          signal: controller.signal,
        });

        if (!fallbackRes.ok) {
          throw new Error(`AI analyze endpoint failed with HTTP ${res.status}`);
        }
        return (await fallbackRes.json()) as AiAnalyzeResponse;
      }

      return (await res.json()) as AiAnalyzeResponse;
    } catch (err: any) {
      throw new Error(`AI analyze request failed for doc ${docId}: ${err.message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  public static async chat(docId: string, query: string, history: any[] = []): Promise<AiRagResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(`${this.baseUrl}/internal/rag-query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_id: docId,
          query,
          chat_history: history,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`AI RAG chat returned HTTP ${res.status}`);
      }

      return (await res.json()) as AiRagResponse;
    } catch (err: any) {
      throw new Error(`AI chat failed for doc ${docId}: ${err.message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  public static async checkConnection(): Promise<boolean> {
    try {
      const h = await this.health();
      console.log(`🤖 AI Service connected successfully at ${this.baseUrl} (Version: ${h.version}, Classifier: ${h.classifier || "active"})`);
      return true;
    } catch (err: any) {
      console.warn(`⚠️ Warning: AI Service not reachable at ${this.baseUrl}. Direct heuristic fallback active.`);
      return false;
    }
  }
}
