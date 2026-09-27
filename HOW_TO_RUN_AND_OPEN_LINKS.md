# LegalEase: Complete Guide to Run & Open All Service Links

This single document contains step-by-step instructions to set up, start, and open all **LegalEase** application services and URLs on both **Windows** and **macOS**.

---

## 📌 Summary of All Services & Links

| Service Name | Port | Base URL / Link | Description & Credentials |
| :--- | :--- | :--- | :--- |
| **Frontend App** | `3000` | [http://localhost:3000](http://localhost:3000) | Main React Client User Interface |
| **Backend API** | `4000` | [http://localhost:4000](http://localhost:4000) | Node.js Express REST API Server |
| **Backend API Docs** | `4000` | [http://localhost:4000/docs](http://localhost:4000/docs) | Interactive Swagger API Documentation |
| **Backend Health** | `4000` | [http://localhost:4000/health](http://localhost:4000/health) | Backend health status JSON |
| **AI/ML Microservice** | `8000` | [http://localhost:8000](http://localhost:8000) | Python FastAPI Machine Learning Service |
| **AI API Docs** | `8000` | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive OpenAPI / Swagger Docs for AI Service |
| **AI ReDoc Specs** | `8000` | [http://localhost:8000/redoc](http://localhost:8000/redoc) | Alternative ReDoc view for AI APIs |
| **AI Health Check** | `8000` | [http://localhost:8000/health](http://localhost:8000/health) | AI Service health check endpoint |
| **MinIO Admin Console** | `9001` | [http://localhost:9001](http://localhost:9001) | S3 Object Storage Web Admin<br/>**User**: `minioadmin`<br/>**Pass**: `minioadminpassword` |
| **MinIO S3 API** | `9000` | [http://localhost:9000](http://localhost:9000) | S3 API endpoint for document uploads |
| **PostgreSQL DB** | `5432` | `localhost:5432` | Database: `legalease`<br/>User: `postgres`<br/>Password: `postgrespassword` |
| **Redis Queue & Cache**| `6379` | `localhost:6379` | In-memory cache & BullMQ queue |

---

## 🛠️ Step 1: Start All Services

Before opening the links, ensure all required components are running.

### 1.1 Start Backing Services (Docker Compose)
Open a terminal at the project root directory and run:

```bash
docker compose up -d
```
*This launches PostgreSQL, Redis, MinIO, and Backend containers in the background.*

---

### 1.2 Start Frontend Client (React / Vite)
Open a terminal inside the `frontend/` directory:

```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:3000`.*

---

### 1.3 Start AI / ML Microservice (FastAPI)
Open a terminal inside the `ai-service/` directory:

#### 🪟 On Windows:
```cmd
cd ai-service
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

#### 🍎 On macOS / Linux:
```bash
cd ai-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 -m uvicorn main:app --host 127.0.0.1 --port 8000
```
*AI service runs on `http://localhost:8000`.*

---

## 🚀 Step 2: How to Open All Links Yourself

You can open these links either by **clicking them directly** or by using **step-by-step terminal commands**.

---

### 🪟 Windows Instructions

#### Option A: Using PowerShell (Recommended for Windows)

Run these individual commands in your PowerShell window:

```powershell
# 1. Open Frontend Web App
Start-Process "http://localhost:3000"

# 2. Open Backend Swagger API Documentation
Start-Process "http://localhost:4000/docs"

# 3. Open Backend Health Check Endpoint
Start-Process "http://localhost:4000/health"

# 4. Open AI Microservice Swagger API Docs
Start-Process "http://localhost:8000/docs"

# 5. Open AI Microservice Health Check Endpoint
Start-Process "http://localhost:8000/health"

# 6. Open MinIO Storage Web Admin Console
Start-Process "http://localhost:9001"
```

#### Option B: Open ALL Links at once in PowerShell

Copy and paste this single script into PowerShell to open all tabs in your default web browser immediately:

```powershell
@("http://localhost:3000", "http://localhost:4000/docs", "http://localhost:8000/docs", "http://localhost:9001") | ForEach-Object { Start-Process $_ }
```

#### Option C: Using Windows Command Prompt (cmd.exe)

```cmd
:: 1. Open Frontend Web App
start http://localhost:3000

:: 2. Open Backend Swagger API Docs
start http://localhost:4000/docs

:: 3. Open Backend Health Check
start http://localhost:4000/health

:: 4. Open AI Service Swagger Docs
start http://localhost:8000/docs

:: 5. Open AI Service Health Check
start http://localhost:8000/health

:: 6. Open MinIO Storage Console
start http://localhost:9001
```

---

### 🍎 macOS Instructions

#### Option A: Using macOS Terminal (Step-by-Step)

Open your Terminal app on Mac and run these commands:

```bash
# 1. Open Frontend Web App
open "http://localhost:3000"

# 2. Open Backend Swagger API Documentation
open "http://localhost:4000/docs"

# 3. Open Backend Health Check Endpoint
open "http://localhost:4000/health"

# 4. Open AI Microservice Swagger API Docs
open "http://localhost:8000/docs"

# 5. Open AI Microservice Health Check Endpoint
open "http://localhost:8000/health"

# 6. Open MinIO Storage Web Admin Console
open "http://localhost:9001"
```

#### Option B: Open ALL Links at once on macOS

Copy and paste this single command into your macOS Terminal to open all tabs at once:

```bash
open "http://localhost:3000" "http://localhost:4000/docs" "http://localhost:8000/docs" "http://localhost:9001"
```

---

## 🔒 Login Credentials for Admin Services

### MinIO Storage Web Console ([http://localhost:9001](http://localhost:9001))
* **Username**: `minioadmin`
* **Password**: `minioadminpassword`

---

## ❓ Troubleshooting & Verification

1. **Service Not Opening?** Ensure the service terminal shows it is running without error ports blocked.
2. **Postgres Connection Issue?** Verify `docker compose ps` shows `legalease-postgres` as `healthy`.
3. **Backend Health Verification**: Navigate to `http://localhost:4000/health` — it should return `{"status":"ok"}`.
4. **AI Service Health Verification**: Navigate to `http://localhost:8000/health` — it should return `{"status":"ok","service":"ai-service"}`.
