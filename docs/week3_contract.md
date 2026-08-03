# Week 3 Shared Contract: Clause Classification & Risk Scoring

**Role:** Rishi (AI/ML Engineer)  
**Teammates:** Shalvi (Backend), Krina (Frontend)  
**Date:** August 3, 2026  

This document describes the API contract for the internal classification route, the database fields recommended for the `clauses` table, and the supported clause types.

---

## 1. POST /internal/classify — API Contract

This internal endpoint is called by Shalvi's upload/classification worker (or backend controller) once a document is uploaded. It parses the document text, partitions it into chunks (preserved from Week 2), classifies each chunk into one of 12 clause types, scores its risk, and aggregates an overall risk score for the document.

* **URL:** `POST http://ai-service:8000/internal/classify`
* **Request Body (JSON):**
  ```json
  {
    "doc_id": "string",   // Unique document identifier (UUID)
    "s3_key": "string"    // Optional: MinIO/S3 object key. Falls back to local sample files if omitted
  }
  ```

* **Response Body (200 OK - JSON):**
  ```json
  {
    "status": "ok",
    "doc_id": "3c9a4df5-618d-4fbd-8e54-94924a6e355f",
    "overall_risk_score": 52,
    "overall_risk_level": "medium",
    "clauses": [
      {
        "chunk_index": 0,
        "text": "This Agreement shall be governed by and construed in accordance with the laws of the State of New York.",
        "clause_type": "governing_law",
        "confidence": 0.985,
        "risk_score": 20,
        "risk_level": "low",
        "matching_rules": []
      },
      {
        "chunk_index": 1,
        "text": "The restricted party agrees not to compete with the company worldwide for an indefinite duration.",
        "clause_type": "non_compete",
        "confidence": 0.912,
        "risk_score": 100,
        "risk_level": "high",
        "matching_rules": [
          "Explicit restriction on competing",
          "Worldwide restriction (high risk)",
          "Perpetual or indefinite non-compete term (extreme risk)"
        ]
      }
    ],
    "classifier_method": "legal-bert"
  }
  ```

---

## 2. Database Schema: Proposed `clauses` Table

Shalvi can use this schema layout to finalize the Prisma migration for the database.

In `/backend/prisma/schema.prisma`:
```prisma
model Document {
  id                 String   @id @default(uuid()) @db.Uuid
  name               String
  s3_key             String   @map("s3_key")
  overall_risk_score Int?     @map("overall_risk_score")
  overall_risk_level String?  @map("overall_risk_level")
  created_at         DateTime @default(now()) @map("created_at")
  
  // Relations
  clauses            Clause[]
  
  @@map("documents")
}

model Clause {
  id                 String   @id @default(uuid()) @db.Uuid
  doc_id             String   @map("doc_id") @db.Uuid
  chunk_index        Int      @map("chunk_index")
  text               String   @db.Text
  clause_type        String   @map("clause_type")
  confidence         Float
  risk_score         Int      @map("risk_score")
  risk_level         String   @map("risk_level")
  matching_rules     String[] @map("matching_rules")  // PostgreSQL native text array
  created_at         DateTime @default(now()) @map("created_at")

  // Relations
  document           Document @relation(fields: [doc_id], references: [id], onDelete: Cascade)

  @@unique([doc_id, chunk_index])
  @@map("clauses")
}
```

---

## 3. Supported Clause Types (12 categories)

Our Legal-BERT-base classifier (with TF-IDF Cosine similarity fallback) maps all document text segments to these categories:
1. `termination`
2. `indemnity`
3. `non_compete`
4. `confidentiality`
5. `limitation_of_liability`
6. `payment_terms`
7. `governing_law`
8. `intellectual_property`
9. `force_majeure`
10. `severability`
11. `non_solicitation`
12. `assignment`
*(Any completely generic or non-classifiable text maps to `other`)*

---

## 4. Risk Level Definitions

* **low**: `0 <= score < 35` — standard boilerplates, minimal risk indicators, or risk-reducing terms.
* **medium**: `35 <= score < 70` — moderate risk, Standard indemnities, payment schedules, standard limitations.
* **high**: `70 <= score <= 100` — severe risk indicators, perpetual restrictions, class action waivers, unilateral exclusions.
