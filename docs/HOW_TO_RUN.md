# LegalEase — Step-by-Step Local Run Guide (Mac & Windows)

This guide provides complete, step-by-step instructions for getting the entire **LegalEase** multi-service application up and running on a fresh machine (either Windows or macOS).

---

## 1. Prerequisites

Verify that your system meets the required software versions before proceeding:

| Software | Required Version | Checked File Source |
| :--- | :--- | :--- |
| **Node.js** | `>= 18.18.0` or `>= 20.0.0` | [`backend/package.json`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/backend/package.json), [`frontend/package.json`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/frontend/package.json) |
| **npm** | `>= 9.0.0` | Ships with Node.js |
| **Python** | `>= 3.10.0` or `3.11.x` | [`ai-service/requirements.txt`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/ai-service/requirements.txt) |
| **Docker & Docker Compose** | Docker Desktop `v4.x` (Compose `v2.x`) | [`docker-compose.yml`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/docker-compose.yml) |
| **PostgreSQL** | `15.x` (Used via Docker or local service) | [`docker-compose.yml`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/docker-compose.yml), [`schema.prisma`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/backend/prisma/schema.prisma) |
| **Redis** | `7.x` Alpine (Used via Docker or local service) | [`docker-compose.yml`](file:///c:/Users/hp/OneDrive/Desktop/.vscode/LegalEase/docker-compose.yml) |
| **Git** | Any recent version | Repo clone |

---

## 2. Clone and Repository Setup

### Clone Command
```bash
git clone https://github.com/shalvi000009/LegalEase.git
cd LegalEase
```

### Folder Structure After Cloning
```
LegalEase/
├── backend/                # Express.js + TypeScript REST API & BullMQ worker
│   ├── prisma/             # Database schema and migration SQL files
│   ├── src/                # Controllers, routes, services, queues
│   ├── package.json
│   └── .env.example
├── ai-service/             # FastAPI + Python ML microservice
│   ├── classification/     # Multi-dimensional risk & BERT models
│   ├── extraction/         # PyMuPDF extractor, OpenCV OCR preprocessor
│   ├── routers/            # FastAPI endpoints
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/               # React + Vite + Tailwind CSS web dashboard
│   ├── src/                # Pages, components, services, state stores
│   ├── package.json
│   └── vite.config.ts
├── docs/                   # Documentation, OpenAPI specs, integration notes
│   ├── PROJECT_DOCUMENTATION.md
│   ├── HOW_TO_RUN.md
│   └── INTEGRATION_NOTES.md
└── docker-compose.yml      # Orchestration for Postgres, Redis, MinIO, AI Service
```

---

## 3. Environment Variables Setup

Create `.env` files in each service directory using the templates below.

### A. Backend (`backend/.env`)
Create `backend/.env`:
```env
PORT=4000
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
MOCK_SERVICES=true

# PostgreSQL Connection
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/legalease?schema=public

# JWT Authentication
JWT_ACCESS_SECRET=your_super_secret_access_key_change_in_production
JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_in_production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# S3 / MinIO Configuration
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadminpassword
S3_BUCKET=legalease-contracts
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true

# Redis Broker
REDIS_URL=redis://localhost:6379

# AI Microservice URL
AI_SERVICE_URL=http://localhost:8000
```

### B. AI Service (`ai-service/.env`)
Create `ai-service/.env`:
```env
PORT=8000

# LLM API Keys (Optional for local stubs, required for live OpenAI/Claude RAG)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Pinecone Vector Store (Optional for local stubs)
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENVIRONMENT=us-east-1

# Redis Cache Connection
REDIS_URL=redis://localhost:6379
```

### C. Frontend (`frontend/.env` or `frontend/.env.local`)
Create `frontend/.env.local`:
```env
VITE_API_URL=http://localhost:4000/api/v1
```

---

## 4. Windows-Specific Setup Steps

Run all commands in **PowerShell** (as Administrator if required for ExecutionPolicy).

### Step 1: Set PowerShell Execution Policy (If script execution is blocked)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Step 2: Ensure Docker Desktop is Running
Make sure Docker Desktop is launched and the Linux container daemon is active.

### Step 3: Python Virtual Environment on Windows
```powershell
cd ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
```

---

## 5. Mac-Specific Setup Steps

Run all commands in **Terminal** (zsh or bash).

### Step 1: Install Homebrew (If not installed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Step 2: Python Virtual Environment on Mac (Apple Silicon or Intel)
```bash
cd ai-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
```

### Step 3: Local Postgres/Redis via Homebrew (If not using Docker)
```bash
brew install postgresql@15 redis
brew services start postgresql@15
brew services start redis
```

---

## 6. Installing Dependencies

Run these installation commands for each of the three services:

### 1. Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### 2. AI Service Dependencies
```bash
cd ai-service
# On Windows PowerShell:
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# On macOS / Linux Terminal:
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cd ..
```

### 3. Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

---

## 7. Database Setup & Prisma Migrations

### Step 1: Start Infrastructure Containers (Postgres, Redis, MinIO)
If using Docker Compose:
```bash
docker-compose up -d postgres redis minio
```

### Step 2: Generate Prisma Client & Run Database Migrations
```bash
cd backend
npx prisma generate
npx prisma migrate dev --name add_risk_dimensions
cd ..
```

---

## 8. Starting Each Service — Exact Order

Start services in separate terminal windows in the following exact order:

```
[Terminal 1: Docker/DB] -> [Terminal 2: Backend] -> [Terminal 3: AI Service] -> [Terminal 4: Frontend]
```

### Terminal 1: Infrastructure (Postgres, Redis, MinIO)
```bash
docker-compose up -d postgres redis minio
```

### Terminal 2: Backend API Service (Port 4000)
- **Windows (PowerShell)**:
  ```powershell
  cd backend
  npm run dev
  ```
- **macOS / Linux**:
  ```bash
  cd backend
  npm run dev
  ```

### Terminal 3: AI Microservice (Port 8000)
- **Windows (PowerShell)**:
  ```powershell
  cd ai-service
  .\.venv\Scripts\Activate.ps1
  python -m uvicorn main:app --reload --port 8000
  ```
- **macOS / Linux**:
  ```bash
  cd ai-service
  source .venv/bin/activate
  python3 -m uvicorn main:app --reload --port 8000
  ```

### Terminal 4: Frontend Web App (Port 5173)
- **Windows / macOS**:
  ```bash
  cd frontend
  npm run dev
  ```

---

## 9. Verifying Everything is Running

Check terminal logs for the following expected startup messages:

- **Backend Terminal**: `Server running on port 4000` & `Swagger UI available at http://localhost:4000/docs`.
- **AI Service Terminal**: `INFO: Uvicorn running on http://0.0.0.0:8000` & `Registered router: /api/v1/analyze`.
- **Frontend Terminal**: `VITE v5.4.x ready in XXX ms` -> `Local: http://localhost:5173/`.

---

## 10. Troubleshooting Common Issues

### 1. Port 4000, 8000, or 5173 Already in Use
- **Windows**:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess | Stop-Process -Force
  ```
- **macOS**:
  ```bash
  lsof -ti:4000 | xargs kill -9
  ```

### 2. Database Connection Refused (`P1001: Can't reach database server`)
- Verify PostgreSQL container is active: `docker-compose ps`.
- Confirm `DATABASE_URL` in `backend/.env` points to `localhost:5432`.

### 3. Missing `.env` Variables
- Ensure `backend/.env`, `ai-service/.env`, and `frontend/.env.local` are placed inside their respective directories (not the root directory).

### 4. CORS Error in Browser Console
- Check `backend/.env` has `CORS_ORIGIN=http://localhost:5173,http://localhost:3000`.

### 5. Prisma Migration Failure
- Reset local test database:
  ```bash
  cd backend
  npx prisma migrate reset --force
  npx prisma migrate dev
  ```

---

## 11. All Localhost Links

| Service / Resource | Access URL | Description |
| :--- | :--- | :--- |
| **Frontend Dashboard** | `http://localhost:5173` | Main Web Application UI |
| **Backend REST API** | `http://localhost:4000/api/v1` | API Base Endpoint |
| **Backend Swagger Docs** | `http://localhost:4000/docs` | Interactive OpenAPI 3.0 Documentation |
| **Backend OpenAPI Spec** | `http://localhost:4000/docs/openapi.json` | Raw OpenAPI JSON spec |
| **AI Service OpenAPI Docs**| `http://localhost:8000/docs` | Internal AI Service FastAPI Swagger UI |
| **AI Service Health Check**| `http://localhost:8000/health` | AI Microservice status ping |
| **MinIO Web Console** | `http://localhost:9001` | S3 Object Storage Console (`minioadmin` / `minioadminpassword`) |
