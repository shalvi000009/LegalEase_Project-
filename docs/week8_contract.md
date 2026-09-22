# Week 8 Shared Contract: Model Versioning, Weekly Re-Analysis & Diff Detection

**Role:** Rishi (AI/ML Engineer)  
**Teammates:** Shalvi (Backend), Krina (Frontend)  
**Date:** September 2026  

This document specifies the **model versioning protocol**, **stale analysis detection**, **rate-limited batch re-analysis endpoint**, and **diff detection notification contracts** designed for Shalvi's **Sunday 2:00 AM BullMQ scheduled job**.

---

## 1. Overview & Scheduler Architecture

As our AI models evolve (e.g. updating Legal-BERT weights, shipping new risk scoring rules, or expanding clause taxonomies), existing contract analyses in the database may become outdated.

```
+-------------------------------------------------------------------------------+
|                       Sunday 2:00 AM BullMQ Cron Job                          |
|                             (Shalvi / Backend)                                |
+---------------------------------------+---------------------------------------+
                                        |
                 1. Fetch stale document analyses (WHERE model_version != current)
                                        |
                 2. Partition into batches of <= 50 documents
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                POST http://ai-service:8000/internal/reanalyze-batch           |
|                                                                               |
|   - Token Bucket rate limiting (protects LLM cost & API provider quotas)     |
|   - Re-extracts & re-classifies clauses under active model version            |
|   - Diff Engine evaluates: score shift >= 15 OR newly surfaced red flags      |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                                Response Verdict                               |
|                                                                               |
|   - Update DB `Analysis` record (new risk score, clauses, model_version)      |
|   - If `notify_user == true`: Dispatch notification email / slack / in-app    |
|   - If `notify_user == false`: Update DB silently without disturbing user     |
+-------------------------------------------------------------------------------+
```

---

## 2. Model Versioning System (`model_version`)

Every analysis stored in PostgreSQL via Prisma includes the `model_version` string:

```prisma
model Analysis {
  id                 String     @id @default(uuid()) @db.Uuid
  document_id        String     @map("document_id") @db.Uuid
  overall_risk_score Int        @map("overall_risk_score")
  model_version      String     @map("model_version")   // e.g. "legalease-v1.2.0"
  created_at         DateTime   @default(now()) @map("created_at")
  ...
}
```

* **Active Production Version:** `legalease-v1.2.0`
* **Semver Convention:** `legalease-v<Major>.<Minor>.<Patch>`
  * **Major:** Architectural overhaul (e.g. switching base embeddings or clause definitions).
  * **Minor:** New clause categories, checklist rules, or risk rule updates.
  * **Patch:** Bug fixes, prompt tweaks, or regex adjustments.
* **Staleness Rule:** Any record where `model_version < CURRENT_MODEL_VERSION`, or where `model_version` is `NULL` or legacy (`legal-bert-v1.0.0`), is marked as **`stale`**.

---

## 3. Querying Stale Documents: `POST /internal/check-stale`

* **URL:** `http://ai-service:8000/internal/check-stale`
* **Method:** `POST`
* **Content-Type:** `application/json`

### Request Body (JSON)
```json
{
  "analyses": [
    { "document_id": "8a32b0f4-52d3-49fb-9457-41804b408e01", "model_version": "legal-bert-v1.0.0" },
    { "document_id": "c9284fae-9d21-42ab-b192-384729104928", "model_version": "legalease-v1.2.0" }
  ]
}
```

### Response Body (200 OK — JSON)
```json
{
  "status": "ok",
  "current_model_version": "legalease-v1.2.0",
  "total_checked": 2,
  "stale_count": 1,
  "up_to_date_count": 1,
  "stale_document_ids": [
    "8a32b0f4-52d3-49fb-9457-41804b408e01"
  ],
  "details": [
    {
      "document_id": "8a32b0f4-52d3-49fb-9457-41804b408e01",
      "model_version": "legal-bert-v1.0.0",
      "is_stale": true,
      "reason": "Analysis was generated using 'legal-bert-v1.0.0', which is older than active production version 'legalease-v1.2.0'."
    },
    {
      "document_id": "c9284fae-9d21-42ab-b192-384729104928",
      "model_version": "legalease-v1.2.0",
      "is_stale": false,
      "reason": "Analysis is up to date with active production version 'legalease-v1.2.0'."
    }
  ]
}
```

---

## 4. Weekly Batch Re-Analysis: `POST /internal/reanalyze-batch`

* **URL:** `http://ai-service:8000/internal/reanalyze-batch`
* **Method:** `POST`
* **Content-Type:** `application/json`
* **Batch Size Constraint:** Maximum **50 documents** per request. If $> 50$, returns `400 Bad Request`.

### Request Body (JSON)
```json
{
  "documents": [
    {
      "document_id": "8a32b0f4-52d3-49fb-9457-41804b408e01",
      "s3_key": "user_1/8a32b0f4/contract.pdf",
      "previous_analysis": {
        "overall_risk_score": 40,
        "model_version": "legal-bert-v1.0.0",
        "clauses": [
          {
            "clause_type": "confidentiality",
            "risk_score": 15,
            "risk_level": "low"
          }
        ]
      }
    }
  ],
  "force_reanalyze": false,
  "rate_limit_rpm": 60
}
```

### Response Body (200 OK — JSON)
```json
{
  "status": "ok",
  "current_model_version": "legalease-v1.2.0",
  "total_requested": 1,
  "total_processed": 1,
  "total_reanalyzed": 1,
  "total_skipped": 0,
  "total_notifications_triggered": 1,
  "results": [
    {
      "document_id": "8a32b0f4-52d3-49fb-9457-41804b408e01",
      "status": "reanalyzed",
      "model_version": "legalease-v1.2.0",
      "diff_detected": true,
      "notify_user": true,
      "score_delta": 20,
      "new_overall_score": 60,
      "previous_overall_score": 40,
      "new_red_flags_count": 1,
      "reasons": [
        "Overall contract risk score shifted significantly by +20 points (from 40 to 60).",
        "Surfaced a new red-flag clause: 'limitation_of_liability' (Risk score: 90, level: 'high')."
      ],
      "new_analysis": {
        "status": "ok",
        "doc_id": "8a32b0f4-52d3-49fb-9457-41804b408e01",
        "overall_risk_score": 60,
        "overall_risk_level": "medium",
        "clauses": [...],
        "classifier_method": "tfidf-fallback",
        "ocr_used": false,
        "missing_clauses": [...],
        "suggested_questions": [...],
        "model_version": "legalease-v1.2.0"
      }
    }
  ]
}
```

---

## 5. Diff Detection & Notification Rules

Shalvi's BullMQ worker should inspect the `notify_user` flag for each result:

| Field | Type | Description |
|---|---|---|
| `diff_detected` | `boolean` | `true` if risk score shifted by $\ge \pm 15$ points OR new high-risk clause appeared. |
| `notify_user` | `boolean` | `true` when user should receive an alert (email / in-app notification). |
| `score_delta` | `int` | `new_overall_score - previous_overall_score`. |
| `new_red_flags_count` | `int` | Number of high-risk clauses (`risk_score >= 70`) not present in previous run. |
| `reasons` | `string[]` | Plain-English summary explaining why the notification was triggered. |

### Notification Criteria
1. **Material Risk Shift ($\ge \pm 15$ Points):**  
   Example: Previous score was 40, new score is 60 ($\Delta = +20$). The contract is significantly riskier than previously reported.
2. **Newly Surfaced Red-Flag Clause:**  
   Example: An uncapped liability or broad non-compete clause scored $\ge 70$ that was missed in the older model version.

---

## 6. Token Bucket Rate Limiting (LLM Cost Control)

* The re-analysis engine uses a **Token Bucket** rate limiter.
* Default: **60 requests per minute** (1 request / second).
* Re-analysis calls yield asynchronously to prevent server lockup while guaranteeing upstream LLM quotas and budget caps are strictly respected.
