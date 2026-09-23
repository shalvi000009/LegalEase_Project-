# LegalEase Frontend API Contracts & OpenAPI Alignment

Mapping of all frontend network calls to Shalvi's backend OpenAPI spec (`docs/openapi.json`).

## 🔐 Auth Endpoints
- `POST /api/auth/login`
  - **Body**: `{ email, password, rememberMe }`
  - **Response**: `{ user: { id, name, email, role }, accessToken, refreshToken }`
- `POST /api/auth/register`
  - **Body**: `{ name, email, password }`
  - **Response**: `{ user: { id, name, email }, accessToken, refreshToken }`
- `POST /api/auth/refresh`
  - **Body**: `{ refreshToken }`
  - **Response**: `{ accessToken, refreshToken }`

## 📄 Document & Analysis Endpoints
- `POST /api/documents/upload`
  - **Multipart Form Data**: `file` (PDF)
  - **Response**: `{ documentId, status: "processing", message }`
- `GET /api/documents/:id/status`
  - **Response / SSE**: `{ id, status: "pending" | "processing" | "completed" | "error", progress: 0-100 }`
- `GET /api/documents/:id/analysis`
  - **Response**: `{ id, filename, riskScore, overallRisk, clauses: [...], summary: "..." }`

## 🤖 AI RAG Chat Endpoints
- `POST /api/chat/:docId/message` (Server-Sent Events / Stream)
  - **Body**: `{ message, history: [...] }`
  - **Stream Data**: `data: { chunk: "..." }\n\n` | `data: [DONE]\n\n`

## 🛡️ Vault & Reminders Endpoints
- `GET /api/vault/contracts`
  - **Response**: `ContractSummary[]`
- `POST /api/reminders/export-ics`
  - **Response**: Binary `.ics` File Stream
- `PATCH /api/dates/:docId/confirm`
  - **Body**: `{ dateId, confirmed: true }`

## 📡 Auto-Scan Integrations Endpoints
- `GET /api/integrations`
  - **Response**: `Integration[]`
- `POST /api/integrations/:provider/connect`
  - **Body**: `{ folderPath, autoScanEnabled }`
- `POST /api/integrations/:provider/trigger-scan`
  - **Response**: `{ scanId, itemsFound, itemsProcessed }`

## 📊 Admin Analytics Endpoints
- `GET /api/admin/analytics?range=7d|30d|90d|all`
  - **Response**: `{ stats, documentsOverTime, clauseTypes, riskDistribution, autoScanDetectionOverTime, activityLog }`
  - **Sync Point Status**: Frontend currently uses `useAnalytics` hook with fallback mock data (`MOCK_ANALYTICS_DATA`) if backend endpoint returns 404/500 until Shalvi completes final production export.
