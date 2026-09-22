# Week 7 Shared Contract: Source Document Classifier & Deduplication

**Role:** Rishi (AI/ML Engineer)  
**Teammates:** Shalvi (Backend), Krina (Frontend)  
**Date:** September 2026  

This document describes the API contract, threshold business rules, deduplication protocol, and response shapes for the source document classification service. This is a direct prerequisite unblocking **Shalvi's Week 8 Gmail and Google Drive automated ingestion worker**.

---

## 1. Overview & What This Solves

When an automated polling job (Gmail attachment or Google Drive sync) detects a new file, running a full multi-page extraction, OCR, clause chunking, and LLM analysis is expensive and slow.

The **Week 7 Source Document Classifier** provides a fast (~0.5–15ms, < 50ms SLA) pre-flight screening endpoint that:
1. Calculates the **SHA-256 cryptographic digest** of the file to check against the user's existing vault (`is_duplicate`).
2. Evaluates whether the incoming document is a **legal contract** vs. an invoice, receipt, newsletter, resume, or memo (`is_legal_doc_score` between `0.0` and `1.0`).
3. Applies a **three-tier threshold decision** (`auto_proceed`, `queued_for_confirmation`, `silently_ignored`).

---

## 2. API Contract: `POST /internal/classify-source-doc`

* **Internal URL:** `http://ai-service:8000/internal/classify-source-doc`
* **Method:** `POST`
* **Content-Type:** `application/json`

### Request Body (JSON)

```json
{
  "file_bytes_or_url": "data:application/pdf;base64,JVBERi0xLjQK...", 
  "filename": "consulting_agreement.pdf",
  "user_id": "8a32b0f4-52d3-49fb-9457-41804b408e01",
  "existing_hashes": [
    "e2f6688eb10ba14d4b543e08a9cafe55122fb1b8bd04a443f2267f937a1bb9ba",
    "4d8c728fe2890b2fcf08a1c93a0279eef41097fa6c888d36371cb298ef9e18dc"
  ]
}
```

#### Field Specifications

| Field | Type | Required | Description |
|---|---|---|---|
| `file_bytes_or_url` | `string` | Optional* | Base64 string (raw or `data:...;base64,`), public HTTP/HTTPS URL, S3/MinIO key (`user_id/doc_id/file.pdf`), or sample filename. |
| `file_bytes` | `string` | Optional* | Explicit base64 string without data URI header. |
| `file_url` | `string` | Optional* | Explicit HTTP/HTTPS download link. |
| `s3_key` | `string` | Optional* | MinIO/S3 object storage key. |
| `filename` | `string` | Optional | Original filename (e.g. `lease_agreement.pdf`) used for format heuristics. |
| `user_id` | `string` | Optional | UUID of the user who owns the vault. |
| `existing_hashes` | `string[]` | Optional | Array of 64-character hex SHA-256 digests already stored in the user's vault. |

*\*At least one of `file_bytes_or_url`, `file_bytes`, `file_url`, or `s3_key` must be supplied (falls back to sample document in offline testing).*

---

### Response Body (200 OK — JSON)

```json
{
  "status": "ok",
  "is_legal_doc_score": 0.925,
  "sha256": "e2f6688eb10ba14d4b543e08a9cafe55122fb1b8bd04a443f2267f937a1bb9ba",
  "action": "auto_proceed",
  "decision": "auto_proceed",
  "threshold_bucket": "high",
  "is_duplicate": false,
  "duplicate_of": null,
  "inference_time_ms": 1.45,
  "classifier_method": "tfidf-fast",
  "extracted_chars": 1598,
  "page_count": 2,
  "details": {
    "confidence": 0.925,
    "recommendation": "Contract detected with high confidence (>0.75). Auto-proceeding to deep analysis.",
    "key_indicators_found": [
      "contract_title_or_header",
      "preamble_parties_and_recitals",
      "operative_legal_clauses_4",
      "execution_signature_block"
    ],
    "negative_indicators_found": []
  }
}
```

#### Response Field Definitions

| Field | Type | Description |
|---|---|---|
| `status` | `string` | `"ok"` upon successful evaluation. |
| `is_legal_doc_score` | `float` | Continuous probability score in `[0.0, 1.0]` indicating likelihood that document is a legal contract. |
| `sha256` | `string` | Lowercase 64-character hexadecimal SHA-256 cryptographic digest of the raw document file bytes. |
| `action` | `string` | Primary decision: `"auto_proceed"` \| `"queued_for_confirmation"` \| `"silently_ignored"`. |
| `decision` | `string` | Mirror alias of `action` for convenience. |
| `threshold_bucket` | `string` | `"high"` (>0.75), `"medium"` (0.50–0.75), or `"low"` (<0.50). |
| `is_duplicate` | `boolean` | `true` if `sha256` matches any entry in `existing_hashes` (or user vault cache). |
| `duplicate_of` | `string \| null` | The matching SHA-256 hash if a duplicate was detected, otherwise `null`. |
| `inference_time_ms` | `float` | Model inference time in milliseconds (typically < 2ms, guaranteed < 50ms SLA). |
| `classifier_method` | `string` | Engine utilized: `"legal-bert"` (when `USE_LEGAL_BERT=1`) or `"tfidf-fast"` (calibrated fast linear model). |
| `page_count` | `int` | Number of document pages detected (from PDF header/PyMuPDF). |
| `extracted_chars` | `int` | Number of characters sampled from initial pages for classification. |
| `details` | `object` | Diagnostic object with `confidence`, `recommendation`, and matched positive/negative feature indicators. |

---

## 3. Threshold Business Logic

Shalvi's BullMQ auto-scan ingestion pipeline should branch according to the `action` field:

```
                  +-----------------------------------+
                  |  Incoming File (Gmail / Drive)    |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------------------------+
                  | POST /internal/classify-source-doc|
                  +-----------------+-----------------+
                                    |
                    +---------------+---------------+
                    |                               |
          is_duplicate == true             is_duplicate == false
                    |                               |
                    v                               v
         [SILENTLY IGNORED]              Check `is_legal_doc_score`
        (Skip processing & logging)                 |
                                    +---------------+---------------+
                                    |               |               |
                              Score > 0.75    0.50 <= Score <= 0.75 Score < 0.50
                                    |               |               |
                                    v               v               v
                           [AUTO_PROCEED]       [QUEUED]        [IGNORED]
                        Send to BullMQ worker Create Document    Drop file;
                        for full analysis &   in DB with status  no notification.
                        user notifications.   'pending_confirm'.
```

### 1. `auto_proceed` (`score > 0.75`)
* **Interpretation:** Clear indicators of a legal contract present (parties, recitals, covenants, signature blocks).
* **Action:** Automatically save to S3/MinIO, create DB `Document` record (`status = 'uploaded'`), and queue for extraction (`POST /internal/extract`) and classification (`POST /internal/classify`).

### 2. `queued_for_confirmation` (`0.50 <= score <= 0.75`)
* **Interpretation:** Borderline or ambiguous legal document (e.g. preliminary term sheets, proposals, scope of work, draft non-binding agreements).
* **Action:** Save file metadata to DB with `status = 'pending_confirmation'`. Trigger a lightweight multi-channel notification (Email / Slack / In-app notification) asking: *"We noticed a document 'X'. Is this a contract you'd like LegalEase to analyze?"*

### 3. `silently_ignored` (`score < 0.50` OR `is_duplicate == true`)
* **Interpretation:** Non-contract document (e.g. invoice, receipt, marketing email, newsletter, resume) OR exact duplicate file.
* **Action:** Silently discard without bothering the user.

---

## 4. Deduplication Protocol

* Every incoming file has its raw binary content hashed via `hashlib.sha256()`.
* If Shalvi passes `existing_hashes: ["..."]` representing all document hashes in the user's vault, the AI service matches in $O(1)$ time.
* If a duplicate is detected:
  - `is_duplicate = true`
  - `duplicate_of = "<sha256>"`
  - `action = "silently_ignored"`
  - `recommendation = "Exact duplicate detected (SHA-256: ...). Processing skipped."`

---

## 5. Local Development & Testing

```bash
# Run acceptance test suite
cd ai-service
.venv/bin/python scripts/test_week7_source_doc_classifier.py

# Test live endpoint via curl
curl -X POST http://localhost:8000/internal/classify-source-doc \
  -H "Content-Type: application/json" \
  -d '{
    "file_bytes_or_url": "sample_contract.pdf",
    "filename": "sample_contract.pdf",
    "existing_hashes": []
  }'
```
