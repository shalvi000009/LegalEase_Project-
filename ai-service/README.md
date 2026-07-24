# AI/ML Service — LegalEase

Python 3.11 + FastAPI internal microservice.  
**Maintained by Rishi (AI/ML Engineer).**  
Called by the Node.js backend over Docker network. Not exposed publicly.

---

## Stack
LangChain · Pinecone · GPT-4o / Claude · spaCy · legal-BERT · PyMuPDF · Tesseract OCR · OpenCV · scikit-learn

---

## Week 1 (Environment Setup)
| Item | Status |
|---|---|
| FastAPI skeleton + `/health` route | ✅ Done |
| Pinecone index `legalease-clauses` | ⏳ Pending — blocked on `PINECONE_API_KEY` |
| Smoke test (GPT-4o + Claude) | ⏳ Pending — blocked on `OPENAI_API_KEY` + `ANTHROPIC_API_KEY` |

---

## Week 2 (Upload Pipeline)

### Deliverables

| # | Deliverable | File | Status |
|---|---|---|---|
| 1 | PyMuPDF text extraction (digital PDFs) | `extraction/pdf_extractor.py` | ✅ Fully functional |
| 2 | OpenCV preprocessing for scanned docs | `extraction/ocr_preprocessor.py` | ✅ Fully functional |
| 3 | LangChain text chunking (~500 tok/chunk) | `extraction/chunker.py` | ✅ Fully functional |
| 4 | OpenAI embeddings + Pinecone upsert | `extraction/embeddings.py` | 🔶 Stubbed — pending keys |
| 5 | `POST /internal/extract` route | `routers/internal_extract.py` | ✅ Route live, stubs inside |

### POST /internal/extract — API Contract

> **Called by**: Shalvi's BullMQ upload worker  
> **URL**: `POST http://ai-service:8000/internal/extract`

**Request body (JSON):**
```json
{
  "doc_id": "string",   // Unique document identifier (UUID)
  "s3_key": "string"    // S3/MinIO key: "<user_id>/<doc_id>/<filename>"
}
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "doc_id": "string",
  "pipeline": "pdf" | "ocr",
  "page_count": 2,                     // null for image input
  "chunk_stats": {
    "total_chunks": 4,
    "total_chars": 5120,
    "avg_chars": 1280.0,
    "min_chars": 900,
    "max_chars": 2000,
    "avg_approx_tokens": 320.0
  },
  "embed_upsert": {
    "doc_id": "string",
    "namespace": "string",
    "total_chunks": 4,
    "upserted_count": 4,
    "stub": true                       // false once real keys in .env
  },
  "stubs_active": {
    "s3_fetch": true,                  // true until Shalvi's S3 config arrives
    "embeddings": true,                // true until OPENAI_API_KEY is set
    "pinecone_upsert": true            // true until PINECONE_API_KEY is set
  }
}
```

**Supported file types:** `.pdf`, `.jpg`, `.jpeg`, `.png`, `.tiff`, `.tif`, `.bmp`, `.webp`

**Error responses:**
- `404` — local sample file not found (stub mode only)
- `422` — unsupported file type or validation error
- `500` — extraction / chunking / embed error

### Active Stubs (Week 2)

| Stub | Location | Blocked on |
|---|---|---|
| S3/MinIO file fetch | `routers/internal_extract.py::_stub_fetch_from_s3` | Shalvi's S3 config (`S3_ENDPOINT_URL`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET_NAME`) |
| OpenAI embeddings | `extraction/embeddings.py::_stub_embed_chunks` | `OPENAI_API_KEY` |
| Pinecone upsert | `extraction/embeddings.py::_stub_upsert_to_pinecone` | `PINECONE_API_KEY` |

Each stub has a `# TODO: BLOCKED on ...` comment with the exact ready-to-uncomment real implementation alongside it.

### Chunking Parameters

| Parameter | Value | Rationale |
|---|---|---|
| chunk_size | 2000 chars ≈ 500 tokens | Fits comfortably inside text-embedding-3-small's 8191-token context |
| chunk_overlap | 200 chars ≈ 50 tokens | Preserves cross-boundary clause context |
| Separators | `\n\n\n` → `\n\n` → `\n` → `. ` → `, ` → ` ` | Respects legal paragraph/clause structure |

### Pinecone Index

- **Index name**: `legalease-clauses`
- **Embedding model**: `text-embedding-3-small` (dim=1536)
- **Namespace**: `<doc_id>` (one namespace per document)
- **Vector ID format**: `<doc_id>#chunk-<chunk_index>`

### Local Dev — Running Without Keys

```bash
# Install dependencies
.venv/bin/pip install -r requirements.txt

# Generate sample docs
.venv/bin/python scripts/generate_sample_docs.py

# Run acceptance tests (no API keys needed)
.venv/bin/python scripts/test_week2_pipeline.py

# Start the server
.venv/bin/uvicorn main:app --reload --port 8000

# Test the route manually
curl -s -X POST http://localhost:8000/internal/extract \
  -H "Content-Type: application/json" \
  -d '{"doc_id":"test-001","s3_key":"usr_test/test-001/sample_contract.pdf"}' | python3 -m json.tool
```

---

## Environment Variables

```env
PORT=8000

# LLM API Keys (Week 1 — pending)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Pinecone (Week 1 — pending)
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENVIRONMENT=us-east-1

# S3/MinIO (Week 2 — pending Shalvi's config)
# S3_ENDPOINT_URL=http://minio:9000
# S3_ACCESS_KEY=your_access_key
# S3_SECRET_KEY=your_secret_key
# S3_BUCKET_NAME=legalease-uploads
```
