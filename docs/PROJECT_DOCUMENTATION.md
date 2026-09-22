# LegalEase — Complete Project Documentation

This comprehensive documentation provides an in-depth breakdown of the entire **LegalEase** codebase across all three core microservices: **Frontend**, **Backend**, and **AI Service**. It is designed as an exhaustive guide for technical evaluation, code review, and viva examination.

---

## 1. Project Overview

### Plain Language Summary
**LegalEase** is an intelligent, automated legal contract analysis and lifecycle management platform. It enables non-legal professionals, business executives, legal teams, and individuals to upload complex legal documents (e.g., Non-Disclosure Agreements, Employment Contracts, Vendor Services Agreements, Master Services Agreements) and instantly receive:
1. **Clause Classification & Risk Scoring**: Automatically extracts contract clauses, classifies them into 12 standard legal clause types, and flags high-risk liabilities or missing mandatory protections.
2. **Multi-Dimensional Risk Breakdown**: Evaluates contract exposure across 5 distinct risk categories: **Legal**, **Financial**, **Litigation**, **Privacy**, and **Employment**.
3. **Interactive Contract Q&A (RAG Chat)**: A conversational AI interface allowing users to ask natural language questions directly against their contract with direct source clause citations.
4. **Key Date Extraction & Automated Deadline Reminders**: Detects expiry dates, renewal dates, notice deadlines, and payment due dates, automatically scheduling email/push/SMS notifications to prevent accidental auto-renewals.
5. **Automated Source Document Ingestion**: Integrates with external channels (Gmail, Google Drive) to auto-scan incoming documents, filter non-contract files via fast legal classification, and deduplicate files using cryptographic SHA-256 hashing.

### Key Problem Solved
Traditional contract review is slow, expensive, and error-prone when conducted manually. Important obligations (like 30-day cancellation windows or hidden indemnity clauses) are frequently missed. LegalEase eliminates this bottleneck by combining deterministic legal rules, specialized machine learning classification, and Retrieval-Augmented Generation (RAG).

---

## 2. System Architecture

LegalEase is built as a **decoupled, microservices-based architecture** comprising three primary services:

```
                                  +---------------------------------------+
                                  |            React + Vite               |
                                  |          Frontend Client              |
                                  |         (Port 5173 / 3000)            |
                                  +-------------------+-------------------+
                                                      |
                                          HTTP REST   |   Server-Sent Events
                                          & Auth      |   (SSE Streaming Chat)
                                                      v
                                  +---------------------------------------+
                                  |           Express.js + TS             |
                                  |           Backend Service             |
                                  |             (Port 4000)               |
                                  +---------+-----------------+-----------+
                                            |                 |
                          Prisma ORM        |                 | BullMQ Async
                          Read/Write        v                 v Queue Jobs
                       +----------------------+    +----------------------+
                       |  PostgreSQL Database |    |    Redis Cache &     |
                       |     (Port 5432)      |    |  Queue Broker (6379) |
                       +----------------------+    +----------+-----------+
                                                              |
                                           Internal REST      | Async Background
                                           HTTP Requests      v Job Execution
                                  +---------------------------------------+
                                  |           Python + FastAPI            |
                                  |            AI Service                 |
                                  |             (Port 8000)               |
                                  +-------------------+-------------------+
                                                      |
                                         Object       | Vector Search &
                                         Storage      | Embeddings
                                                      v
                                  +-------------------+-------------------+
                                  |  MinIO (S3)       | Pinecone / Vector |
                                  |  (Port 9000/9001) | Store Index       |
                                  +-------------------+-------------------+
```

### Why a Decoupled Architecture?
1. **Workload Isolation & Non-Blocking I/O**: The Express backend handles fast web API requests, user auth, and real-time streaming, leaving heavy ML compute (OCR, PyTorch model inference, LLM generation) to Python.
2. **Specialized Ecosystems**: Node.js offers superior async web routing and TypeScript end-to-end typing, whereas Python provides the standard ML ecosystem (PyTorch, spaCy, PyMuPDF, OpenCV, LangChain).
3. **Independent Scalability**: High contract upload volumes can scale worker processes and AI containers without slowing down web UI API requests.

---

### Step-by-Step Core Request Flow

#### Scenario: User Uploads a Contract for Analysis

```
[User Browser] -> (1) Upload PDF via Dropzone -> [Express Backend]
   -> (2) Stores raw PDF in MinIO S3 -> (3) Creates Document record (status=uploaded)
   -> (4) Pushes task to BullMQ Redis Queue -> (5) Returns HTTP 202 Accepted to UI
   -> (6) Worker fetches job -> (7) POST /internal/extract to AI Service
   -> (8) AI Service extracts text (PyMuPDF / OpenCV OCR fallback) & returns chunks
   -> (9) POST /api/v1/analyze to AI Service -> (10) AI classifies 12 clause types & 5-dim risks
   -> (11) Worker saves Analysis & Clauses into PostgreSQL via Prisma (status=done)
   -> (12) User polls GET /api/v1/documents/:id/analysis -> UI renders risk breakdown
```

**Detailed File & Function Mapping for Core Use Case:**
1. **Upload Request**: User submits file to `POST /api/v1/documents/upload` in [`document.routes.ts`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/backend/src/routes/document.routes.ts).
2. **Controller Handling**: [`uploadDocument`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/backend/src/controllers/document.controller.ts) processes `multer` file memory buffer, uploads to MinIO S3 bucket via [`s3Client.ts`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/backend/src/config/s3Client.ts), and creates a `Document` record in PostgreSQL using Prisma.
3. **Queue Enqueueing**: [`uploadDocument`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/backend/src/controllers/document.controller.ts) enqueues a job into `analysisQueue` via [`analysis.queue.ts`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/backend/src/queues/analysis.queue.ts).
4. **Worker Processing**: [`analysisWorker`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/backend/src/services/analysis.worker.ts) consumes the background job.
5. **AI Text Extraction**: Worker calls AI Service `POST /internal/extract` handled by [`extract_router`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/ai-service/routers/internal_extract.py). Text extraction executes via [`extract_text_from_pdf`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/ai-service/extraction/pdf_extractor.py), with OCR fallback handled by [`preprocess_scanned_pdf`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/ai-service/extraction/ocr_preprocessor.py).
6. **AI Classification & Risk Scoring**: Worker calls AI Service `POST /api/v1/analyze` handled by [`classify_api_v1_router`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/ai-service/routers/internal_classify.py). Clause classification executes via legal-BERT / rule heuristics, and 5-dimension risk scoring runs via [`calculate_dimension_scores`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/ai-service/classification/dimension_scoring.py).
7. **Database Persistence**: [`analysis.worker.ts`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/backend/src/services/analysis.worker.ts) normalizes output, calculates weighted fallback dimension risk scores via [`calculateWeightedOverallRiskScore`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/backend/src/config/riskWeights.ts), and saves `Analysis` and `Clause` entities to PostgreSQL. Document status updates to `done`.
8. **UI Rendering**: React Frontend polls `GET /api/v1/documents/:id/analysis` in [`DocumentDetails.tsx`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/frontend/src/pages/DocumentDetails.tsx) via TanStack React Query, rendering overall risk gauges, 5-dimension breakdowns, and flagged clause cards.

---

## 3. Tech Stack — Dependency Breakdown

### A. Frontend Dependencies ([`frontend/package.json`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/frontend/package.json))
- `react` (`^18.3.1`): Declarative UI component library.
- `typescript` (`^5.5.3`): Static typing for UI components and API payloads.
- `vite` (`^5.4.0`): Lightning-fast build tool and local dev server.
- `tailwindcss` (`^3.4.9`): Utility-first CSS framework for responsive layout styling.
- `lucide-react` (`^0.427.0`): Icon collection for UI indicators, navigation, and badges.
- `axios` (`^1.7.3`): Promise-based HTTP client for API communications.
- `@tanstack/react-query` (`^5.51.23`): Async state management, API caching, background refetching, and polling.
- `zustand` (`^4.5.4`): Lightweight global state store used for authentication token and session management.
- `react-hook-form` (`^7.52.2`): Performant form management with minimal re-renders.
- `@hookform/resolvers` (`^3.9.0`): Bridges `zod` validation schemas with `react-hook-form`.
- `zod` (`^3.23.8`): Type-safe schema validation for user input forms.
- `framer-motion` (`^11.3.24`): Smooth UI animations, modal transitions, and dashboard gauges.
- `react-dropzone` (`^20.0.0`): Drag-and-drop file upload component for PDFs and images.
- `react-hot-toast` (`^2.4.1`): Non-blocking popup notifications for success/error events.
- `clsx` (`^2.1.1`) & `tailwind-merge` (`^2.4.0`): Dynamic CSS class concatenation without specificity collisions.

### B. Backend Dependencies ([`backend/package.json`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/backend/package.json))
- `express` (`^4.18.3`): Web framework for routing and middleware execution.
- `@prisma/client` (`^5.10.0`) & `prisma` (`^5.10.0`): Type-safe ORM for PostgreSQL schema modeling and queries.
- `ioredis` (`^6.0.0`): High-performance Redis client for cache management and BullMQ connection.
- `bullmq` (`^6.0.6`): Reliable Redis-backed queue system for background document analysis jobs.
- `@aws-sdk/client-s3` (`^3.1101.0`): AWS S3 SDK for file uploads/downloads to MinIO object storage.
- `jsonwebtoken` (`^9.0.2`): Creates and verifies JWT access and refresh tokens.
- `bcrypt` (`^5.1.1`): Salted hashing for secure password storage in PostgreSQL.
- `helmet` (`^8.3.0`): Express security middleware enforcing secure HTTP headers.
- `cors` (`^2.8.5`): Configures cross-origin resource sharing for frontend endpoints.
- `express-rate-limit` (`^8.7.0`): Rate limiting middleware preventing auth brute-force and API abuse.
- `multer` (`^2.2.0`): Middleware handling multipart/form-data contract uploads.
- `zod` (`^3.22.4`): Server-side validation for request parameters and API bodies.
- `swagger-ui-express` (`^5.0.0`) & `swagger-jsdoc` (`^6.2.8`): Generates and hosts OpenAPI 3.0 interactive API documentation at `/docs`.
- `@sendgrid/mail` (`^8.1.6`): Sends automated transactional emails for contract expiration reminders.
- `puppeteer` (`^25.7.0`): Headless Chrome browser automation used for PDF export generation of shareable audit reports.
- `jest` (`^30.5.2`), `supertest` (`^7.2.2`), `ts-jest`: Unit and integration testing framework.

### C. AI Service Dependencies ([`ai-service/requirements.txt`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/ai-service/requirements.txt))
- `fastapi` (`>=0.100.0`): Asynchronous Python web framework hosting ML API routes.
- `uvicorn` (`>=0.22.0`): High-performance ASGI server for running FastAPI apps.
- `langchain` (`>=0.1.0`), `langchain-openai`, `langchain-anthropic`: RAG orchestration, vector store retrievial, prompt construction.
- `pinecone-client` (`>=3.0.0`): Vector database SDK for storing and querying clause vector embeddings.
- `openai` (`>=1.0.0`): Official OpenAI API client for GPT models and `text-embedding-3-small`.
- `anthropic` (`>=0.25.0`): Claude 3 API client for alternative LLM completion fallback.
- `pymupdf` (`>=1.23.0`, PyMuPDF / `fitz`): High-speed direct text and metadata extraction from digital PDFs.
- `opencv-python-headless` (`>=4.8.0`): Computer vision image pre-processing (grayscale, binarization, deskewing) for OCR.
- `pytesseract` (`>=0.3.10`): Python wrapper for Tesseract OCR engine extracting text from scanned contracts.
- `Pillow` (`>=10.0.0`): Image manipulation library supporting image conversion and scaling.
- `scikit-learn` (`>=1.3.0`): Machine learning library used for TF-IDF fast source document classification and metric evaluation.
- `transformers` (`>=4.30.0`) & `torch` (`>=2.0.0`): PyTorch and HuggingFace library supporting BERT / legal-BERT clause classification models.
- `spacy` (`>=3.5.0`): Industrial-strength Natural Language Processing library for entity recognition and clause tokenization.

---

## 4. Database Schema

All models are defined in [`backend/prisma/schema.prisma`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/backend/prisma/schema.prisma) mapping to a PostgreSQL database.

| Table Name | Prisma Model | Key Fields | Purpose & Relationships |
| :--- | :--- | :--- | :--- |
| `users` | `User` | `id`, `name`, `email`, `password_hash`, `created_at` | Stores registered user accounts. One-to-many relationship with `Document`, `Reminder`, `Integration`, `ScanLog`, `RefreshToken`, and one-to-one with `NotificationPreferences`. |
| `refresh_tokens` | `RefreshToken` | `id`, `user_id`, `token_hash`, `expires_at`, `revoked_at` | Stores cryptographically hashed refresh tokens for session revocation. Belongs to `User`. |
| `documents` | `Document` | `id`, `user_id`, `filename`, `s3_key`, `status`, `share_token` | Tracks uploaded contracts, MinIO object key, analysis status (`uploaded`, `processing`, `done`, `failed`), and public share token. |
| `analyses` | `Analysis` | `id`, `document_id`, `overall_risk_score`, `model_version`, `risk_dimensions` | Holds high-level analysis output, overall risk score (0-100), model version tag, and 5-dimension JSON scores (`financial`, `legal`, `privacy`, `employment`, `litigation`). Belongs to `Document`. |
| `clauses` | `Clause` | `id`, `analysis_id`, `clause_type`, `risk_level`, `explanation`, `original_text`, `risk_score`, `dimension_contributions` | Extracted contract clauses. Stores one of 12 `ClauseType` enums, risk level (`low`, `medium`, `high`), explanation text, raw clause text, and per-clause dimension contributions JSON. Belongs to `Analysis`. |
| `chat_sessions` | `ChatSession` | `id`, `document_id`, `created_at` | RAG Q&A session container associated with a specific contract `Document`. |
| `chat_messages` | `Message` | `id`, `chat_session_id`, `sender`, `content` | Individual conversational turns (`user` or `ai`). Belongs to `ChatSession`. |
| `contract_dates` | `ContractDate` | `id`, `doc_id`, `clause_id`, `date_type`, `raw_text`, `resolved_date`, `confidence` | Extracted key contract deadlines (expiry, renewal, notice deadline, payment due) with ISO dates and confidence scores. Linked to `Document` and optional `Clause`. |
| `reminders` | `Reminder` | `id`, `user_id`, `contract_date_id`, `days_before`, `scheduled_for`, `status`, `channel` | Automated notifications scheduled N days before a `ContractDate`. Tracks status (`pending`, `sent`, `snoozed`, `resolved`, `failed`) and notification channel (`email`, `push`, `sms`). |
| `notification_preferences` | `NotificationPreferences` | `id`, `user_id`, `email_enabled`, `push_enabled`, `sms_enabled`, `reminder_days` | Per-user alert settings, FCM push tokens, and default alert offsets (e.g. `[30, 7, 1]` days prior). |
| `integrations` | `Integration` | `id`, `user_id`, `provider`, `access_token`, `refresh_token`, `folder_id`, `email_address` | External OAuth connections (`gmail`, `google_drive`, `inbound_email`) for background auto-scanning. |
| `scan_log` | `ScanLog` | `id`, `user_id`, `integration_id`, `source_ref`, `action`, `classifier_score` | Audit trail logging auto-scan activities (`detected`, `classified`, `deduplicated`, `analyzed`, `skipped`, `failed`). |

---

## 5. API Surface

The backend exposes a RESTful API under `/api/v1` documented via Swagger at `/docs`.

### Auth Module (`/api/v1/auth`)
- `POST /api/v1/auth/register` (Public): Registers a new user account with validated email/password.
- `POST /api/v1/auth/login` (Public): Authenticates credentials, returning JWT access token and setting refresh token cookie.
- `POST /api/v1/auth/refresh` (Public): Rotates refresh token and issues a fresh short-lived access token.
- `POST /api/v1/auth/logout` (Authenticated): Revokes active refresh token in database.

### Document Module (`/api/v1/documents`)
- `POST /api/v1/documents/upload` (Authenticated): Uploads PDF/image contract to MinIO and enqueues analysis job.
- `GET /api/v1/documents` (Authenticated): Retrieves paginated list of user's uploaded contracts with status.
- `GET /api/v1/documents/:id` (Authenticated): Retrieves metadata and processing status for a single document.
- `DELETE /api/v1/documents/:id` (Authenticated): Deletes contract, associated analysis records, and S3 file.

### Analysis & Breakdown Module (`/api/v1/documents`)
- `GET /api/v1/documents/:id/analysis` (Authenticated): Fetches completed contract analysis, overall risk score, flagged clauses, and 5-dimension risk scores.
- `GET /api/v1/documents/:id/risk-breakdown` (Authenticated): Fetches detailed multi-dimensional breakdown (`financial`, `legal`, `privacy`, `employment`, `litigation`) and per-clause contributions.

### RAG Chat Module (`/api/v1/chat`)
- `POST /api/v1/chat/sessions` (Authenticated): Creates a new RAG conversation session for a document.
- `POST /api/v1/chat/messages` (Authenticated): Submits a query against a document, returning AI response with clause sources.
- `GET /api/v1/documents/:id/chat/stream` (Authenticated): Server-Sent Events (SSE) streaming endpoint delivering real-time RAG responses.

### Date Extraction & Reminders (`/api/v1/documents`, `/api/v1/reminders`)
- `GET /api/v1/documents/:id/dates` (Authenticated): Retrieves all detected contract dates and deadlines.
- `POST /api/v1/reminders` (Authenticated): Creates a manual or automated alert scheduled N days before a deadline.
- `GET /api/v1/reminders` (Authenticated): Retrieves user's pending and upcoming reminders.
- `PATCH /api/v1/reminders/:id/snooze` (Authenticated): Snoozes an active reminder for a specified number of days.

### Integrations & Scan Logs (`/api/v1/integrations`, `/api/v1/scan-logs`)
- `GET /api/v1/integrations` (Authenticated): Lists user's connected Gmail and Google Drive integrations.
- `POST /api/v1/integrations/google/connect` (Authenticated): Initiates OAuth2 connection for Google Drive / Gmail.
- `POST /api/v1/scan-history/trigger` (Authenticated): Triggers manual auto-scan execution across connected channels.
- `GET /api/v1/scan-history` (Authenticated): Retrieves audit logs for auto-scanned files and classifier decisions.

### Shareable Reports (`/api/v1/share`)
- `POST /api/v1/share/:id` (Authenticated): Generates a unique public share token for a contract report.
- `GET /api/v1/share/:token` (Public): Publicly renders contract analysis summary for non-authenticated users.
- `GET /api/v1/share/:token/pdf` (Public): Generates and downloads a compiled PDF report via Puppeteer.

---

## 6. AI/ML Pipeline Explained

```
                    +------------------------------------+
                    |        Raw Upload (PDF/Image)      |
                    +-----------------+------------------+
                                      |
                                      v
                    +------------------------------------+
                    |  PyMuPDF Text Extraction (Digital) |
                    +-----------------+------------------+
                                      | Text empty?
                                      v
                    +------------------------------------+
                    | OpenCV Pre-processing (Deskew/Bin) |
                    | + Tesseract OCR Text Extraction   |
                    +-----------------+------------------+
                                      |
                                      v
                    +------------------------------------+
                    |  LangChain Recursive Chunker       |
                    | (2000 chars / ~500 tokens)         |
                    +-----------------+------------------+
                                      |
                         +------------+------------+
                         |                         |
                         v                         v
        +----------------------------------+  +----------------------------------+
        | Clause Classification (12 Types) |  | Vector Embeddings (OpenAI)       |
        | & Multi-Dimensional Risk Scoring |  | & Pinecone Vector Store Upsert   |
        +----------------+-----------------+  +----------------+-----------------+
                         |                                     |
                         v                                     v
        +----------------------------------+  +----------------------------------+
        | PostgreSQL Database Storage      |  | RAG Chat Engine                  |
        | (Analyses & Clauses)             |  | (LangChain + GPT-4o / Claude)    |
        +----------------------------------+  +----------------------------------+
```

### 1. Document Extraction & OCR Fallback
- **Digital PDFs**: PyMuPDF (`fitz`) rapidly extracts raw text streams and font metadata.
- **Scanned PDF / Image Fallback**: If extracted text is under 100 characters or missing, OpenCV applies grayscale conversion, adaptive thresholding, and deskewing, passing pre-processed image frames to Tesseract OCR (`pytesseract`).

### 2. Clause Classification & 12 Clause Types
Contracts are split into structural chunks (~500 tokens with 50-token overlap). A legal-BERT classifier and rule heuristics classify text into 12 legal clause types:
1. `liability`
2. `termination`
3. `indemnification`
4. `governing_law`
5. `confidentiality`
6. `intellectual_property`
7. `non_compete`
8. `payment`
9. `warranty`
10. `force_majeure`
11. `assignment`
12. `entire_agreement`

### 3. Multi-Dimensional Risk Scoring (Week 10 Implementation)
Risk is evaluated across 5 weighted dimensions:
- **Legal** (Weight: 30%): Uncapped liability, ambiguous jurisdiction, one-sided termination.
- **Financial** (Weight: 25%): Strict payment penalties, price escalations, unlimited indemnity.
- **Litigation** (Weight: 20%): Out-of-state governing law, mandatory arbitration clauses.
- **Privacy** (Weight: 15%): Broad data usage rights, missing GDPR/CCPA confidentiality boundaries.
- **Employment** (Weight: 10%): Overly punitive non-compete or non-solicit duration.

**Mathematical Aggregation Formula**:
For each dimension $d$, scores across matching clauses $S_d$ are aggregated using a combined mean and peak risk formula:
$$\text{Score}_d = \text{round}(0.6 \times \text{mean}(S_d) + 0.4 \times \max(S_d))$$

**Overall Weighted Risk Score**:
$$\text{Overall Score} = \frac{\sum (W_d \times \text{Score}_d)}{\sum W_d}$$

### 4. Retrieval-Augmented Generation (RAG) Chat
1. Contract text chunks are embedded using OpenAI `text-embedding-3-small` (1536 dimensions) and upserted to Pinecone under namespace `<doc_id>`.
2. When a user submits a chat query, the query vector retrieves top-K matching clause chunks.
3. RAG answers are cached in Redis under `rag:doc:{doc_id}:q:{sha256(query)}` (24h TTL) for sub-2ms response times on repeat questions.

---

## 7. Key Features List

- **User Authentication & RBAC**: JWT access/refresh token authentication with bcrypt password hashing.
- **Contract Upload & Storage**: Multi-format contract ingestion stored securely in MinIO S3 object storage.
- **Automated Clause Analysis**: 12 legal clause types classified with risk level ratings (`low`, `medium`, `high`) and clear human explanations.
- **Multi-Dimensional Risk Breakdown**: Visual risk scoring across 5 categories (`financial`, `legal`, `litigation`, `privacy`, `employment`).
- **Conversational RAG Chat**: Interactive Q&A over contracts with source clause citations and streaming SSE responses.
- **Key Date Extraction & Resolution**: Natural language date resolution converting clauses into ISO expiration and renewal dates.
- **Multi-Channel Reminders**: Automated email notifications via SendGrid scheduled N days prior to key deadlines.
- **Gmail & Google Drive Auto-Scan**: Automatic document polling, legal contract classification (>0.75 threshold), and SHA-256 deduplication.
- **Shareable Audit Reports**: Public tokenized URLs and downloadable Puppeteer-generated PDF contract summaries.

---

## 8. Security Measures

1. **Password Security**: Passwords are hashed using `bcrypt` with salt rounds = 10 prior to storage.
2. **JWT Security**: Short-lived access tokens (15 minutes) and long-lived refresh tokens (7 days) stored as SHA-256 hashes in PostgreSQL.
3. **HTTP Header Protection**: `helmet` enforces security headers (X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security).
4. **CORS Restrictions**: Strict origin whitelist configured for `http://localhost:5173` and `http://localhost:3000`.
5. **Rate Limiting**: `express-rate-limit` caps auth endpoints at 30 req/15min and chat endpoints at 100 req/15min to prevent brute-force attacks.
6. **Input Validation**: `zod` schemas sanitize and validate all HTTP request bodies, route params, and environment variables.

---

## 9. Possible Viva / Evaluation Questions & Answers

### Q1: Why did you split the application into three microservices instead of a single monolith?
**Answer**: Node.js is ideal for non-blocking I/O, web routing, and real-time streaming, while Python is the standard ecosystem for ML (PyTorch, spaCy, PyMuPDF, OpenCV). Decoupling prevents heavy ML model inference from blocking express web request threads and allows independent container scaling.

### Q2: How does the OCR fallback pipeline work for scanned or poor-quality documents?
**Answer**: The worker first attempts digital text extraction using PyMuPDF. If extracted text is empty or under 100 characters, OpenCV converts PDF frames to grayscale, applies adaptive thresholding and deskewing, and passes pre-processed images to Tesseract OCR (`pytesseract`).

### Q3: How is multi-dimensional risk calculated for a contract?
**Answer**: Each of the 12 clause types is mapped to relevant risk dimensions. Dimension scores combine mean and peak clause risk ($\text{Score}_d = 0.6 \times \text{mean} + 0.4 \times \max$). The final contract score applies weighted averages: Legal (30%), Financial (25%), Litigation (20%), Privacy (15%), Employment (10%).

### Q4: How does the system handle RAG chat query caching?
**Answer**: RAG responses are cached in Redis using a deterministic SHA-256 key pattern: `rag:doc:{doc_id}:q:{sha256(normalized_query)}` with a 24-hour TTL. Repeat queries hit Redis in sub-2ms without making expensive LLM API calls.

### Q5: How do you prevent duplicate document ingestion during auto-scan?
**Answer**: When Gmail or Google Drive integration scans a file, it computes a cryptographic SHA-256 hash of the binary file content and compares it against existing document hashes in `ScanLog`. Collisions are logged as `deduplicated` and skipped.

### Q6: How are background tasks handled without blocking user requests?
**Answer**: Document uploads immediately save metadata, enqueue a job into Redis via BullMQ (`analysisQueue`), and return an HTTP 202 Accepted response. A dedicated BullMQ worker process consumes queue jobs asynchronously.

### Q7: What security measures prevent token theft or session hijacking?
**Answer**: Refresh tokens are stored in the database as salted SHA-256 hashes (never raw plain text). Refresh tokens are rotated upon each renewal, and old tokens are revoked immediately.

### Q8: How does key date extraction work?
**Answer**: The AI service uses spaCy NER and regular expression date resolvers to detect relative legal phrasing (e.g., "30 days prior to anniversary") and resolve them into absolute ISO 8601 UTC dates stored in `ContractDate`.

### Q9: How are shareable PDF reports generated?
**Answer**: The backend generates a secure UUID `share_token`. When a shareable PDF is requested, Puppeteer launches a headless Chrome instance, renders the tokenized report template, and streams the PDF buffer to the client.

### Q10: How do notification preferences work for contract reminders?
**Answer**: The `NotificationPreferences` table maintains user preferences for email, push, and SMS channels alongside custom reminder intervals (default `[30, 7, 1]` days prior). BullMQ scheduled cron jobs evaluate upcoming dates daily and fire alerts accordingly.
