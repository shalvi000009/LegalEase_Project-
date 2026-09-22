# LegalEase Week 10: Multi-Dimensional Risk Analysis Specification

**Author:** Rishi (AI/ML Engineer)  
**Audience:** Shalvi (Backend Engineer), Krina (Frontend Engineer)  
**Status:** Live & Implemented in AI Service (`legalease-v1.2.0`)  
**Endpoints:** `POST /internal/classify` & `POST /api/v1/analyze`

---

## 1. Overview & Architecture

Week 10 extends the LegalEase risk engine beyond a single contract-level score to compute **multi-dimensional risk** across five standardized dimensions:
1. **`financial`**: Exposure to direct monetary liabilities, fee adjustments, and payment terms.
2. **`legal`**: Contractual enforceability, jurisdiction, compliance, and core legal protections.
3. **`privacy`**: Data protection, confidentiality leakage, and customer PII obligations.
4. **`employment`**: Restrictive covenants, compensation arrangements, and termination rights.
5. **`litigation`**: Dispute forums, arbitration mandates, breach triggers, and liability limitations.

The AI service applies a deterministic, calibrated mapping/aggregation layer over the classifier output. **All Week 1–9 fields remain 100% intact and unchanged.**

---

## 2. Shared Team Contract: Dimension Mapping Table

All three team members (Rishi, Shalvi, Krina) adhere to this identical mapping:

| Clause Type (`clause_type`) | Target Dimension(s) | Multi-Dimension Policy |
| :--- | :--- | :--- |
| `payment_terms` | `financial` | Direct attribution (100% score) |
| `indemnity` | `financial`, `legal` | Dual attribution (full risk score to both) |
| `termination` | `legal`, `employment` | Dual attribution (full risk score to both) |
| `liability` / `limitation_of_liability` | `legal`, `litigation` | Dual attribution (full risk score to both) |
| `confidentiality` | `privacy` | Direct attribution (100% score) |
| `non_compete` | `employment` | Direct attribution (100% score) |
| `dispute_resolution` / `arbitration` | `litigation` | Direct attribution (100% score) |
| `data_sharing` | `privacy` | Direct attribution (100% score) |
| `compensation` | `financial`, `employment` | Dual attribution (full risk score to both) |
| `breach_conditions` | `legal`, `litigation` | Dual attribution (full risk score to both) |
| `governing_law` | `legal` | Direct attribution (100% score) |
| `other` (and fallback) | `legal` | Default fallback |

---

## 3. Team-Wide Overall Weights

When calculating the combined `weighted_risk_score`, the team weights are:

$$\text{Weighted Score} = \mathrm{round}(0.30 \times \text{legal} + 0.25 \times \text{financial} + 0.20 \times \text{litigation} + 0.15 \times \text{privacy} + 0.10 \times \text{employment})$$

- **Legal:** 30% (`0.30`)
- **Financial:** 25% (`0.25`)
- **Litigation:** 20% (`0.20`)
- **Privacy:** 15% (`0.15`)
- **Employment:** 10% (`0.10`)

---

## 4. API Response Schema (Additive Extensions)

### Endpoint: `POST /internal/classify` & `POST /api/v1/analyze`

```json
{
  "status": "ok",
  "doc_id": "9f7b3e94-1a22-48a6-89d4-1a3ef890a5b2",
  "overall_risk_score": 58,
  "overall_risk_level": "medium",
  "classifier_method": "tfidf-fallback",
  "ocr_used": false,
  "missing_clauses": ["indemnity"],
  "suggested_questions": ["Can the non-compete clause be limited?"],
  "model_version": "legalease-v1.2.0",

  "risk_dimensions": {
    "financial": 45,
    "legal": 65,
    "privacy": 30,
    "employment": 70,
    "litigation": 55
  },
  "weighted_risk_score": 54,
  "dimension_explanations": {
    "financial": [
      {
        "chunk_index": 1,
        "clause_type": "payment_terms",
        "risk_score": 45,
        "text_snippet": "Client shall pay within 30 days of invoice..."
      }
    ],
    "employment": [
      {
        "chunk_index": 2,
        "clause_type": "non_compete",
        "risk_score": 70,
        "text_snippet": "During employment and for 24 months thereafter, employee shall not compete..."
      }
    ]
  },
  "clauses": [
    {
      "chunk_index": 0,
      "text": "This Agreement may be terminated by either party on 30 days notice...",
      "clause_type": "termination",
      "confidence": 0.89,
      "risk_score": 40,
      "risk_level": "medium",
      "matching_rules": ["30 days notice"],
      "dimensions": ["legal", "employment"],
      "dimension_scores": {
        "legal": 40,
        "employment": 40
      },
      "dimension_contributions": {
        "legal": 40,
        "employment": 40
      }
    }
  ]
}
```

---

## 5. Integration Notes for Shalvi (Backend)

1. **Database Migration:**
   - **`analyses` table:** Add `risk_dimensions` JSON column storing:
     ```json
     { "financial": 45, "legal": 65, "privacy": 30, "employment": 70, "litigation": 55 }
     ```
   - **`clauses` table:** Add `dimension_contributions` JSON column storing:
     ```json
     { "legal": 40, "employment": 40 }
     ```
2. **Worker Parsing:**
   - The worker reading `${AI_SERVICE_URL}/api/v1/analyze` can directly map:
     ```typescript
     const riskDimensions = aiData.risk_dimensions ?? {
       financial: 0,
       legal: 0,
       privacy: 0,
       employment: 0,
       litigation: 0,
     };
     ```
3. **Swagger Docs:**
   - Update `GET /api/v1/documents/{id}/analysis` swagger docs to include `risk_dimensions` in the schema example.

---

## 6. Integration Notes for Krina (Frontend)

1. **Radar / Bar Chart Component:**
   - Read `data.risk_dimensions`.
   - Keys: `["Legal", "Financial", "Litigation", "Privacy", "Employment"]` with respective integer scores `0–100`.
2. **Clause Card Badges:**
   - Each clause now exposes `clause.dimensions: string[]`.
   - Display small tags/badges on the `ClauseCard`:
     - `financial`: Emerald / Green
     - `legal`: Indigo / Blue
     - `privacy`: Purple / Violet
     - `employment`: Amber / Orange
     - `litigation`: Rose / Red
3. **"Why this score" Panel:**
   - Filter `clauses` where `clause.dimensions.includes(activeDimension)` and sort descending by `risk_score` to display the top contributing provisions.
