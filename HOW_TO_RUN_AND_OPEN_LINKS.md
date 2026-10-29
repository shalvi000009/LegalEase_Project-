# LegalEase: Complete Guide to Run on Windows & macOS

This comprehensive guide contains exact, copy-pasteable commands to run every service of the **LegalEase** platform on **Windows** (PowerShell & CMD) and **macOS** (Terminal / zsh / bash).

---

## 📌 Services & Ports Quick Reference

| Service | Port | Local URL | Description & Credentials |
| :--- | :---: | :--- | :--- |
| **Frontend App** | `3000` | [http://localhost:3000](http://localhost:3000) | React / Vite UI with Contract Vault & Analytics |
| **Backend API** | `4000` | [http://localhost:4000](http://localhost:4000) | Express TypeScript REST API |
| **Backend Swagger Docs** | `4000` | [http://localhost:4000/docs](http://localhost:4000/docs) | Interactive Swagger / OpenAPI Documentation |
| **Backend Health** | `4000` | [http://localhost:4000/health](http://localhost:4000/health) | Health status JSON: `{"status":"ok"}` |
| **AI / ML Microservice** | `8000` | [http://localhost:8000](http://localhost:8000) | FastAPI with Fine-tuned BERT Classifier |
| **AI Swagger Docs** | `8000` | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive AI API Documentation |
| **AI Health Check** | `8000` | [http://localhost:8000/health](http://localhost:8000/health) | AI Health status: `{"status":"ok","classifier":"finetuned"}` |
| **MinIO Web Console** | `9001` | [http://localhost:9001](http://localhost:9001) | S3 Storage Admin<br/>User: `minioadmin` \| Pass: `minioadminpassword` |
| **MinIO S3 API** | `9000` | [http://localhost:9000](http://localhost:9000) | S3 API endpoint for document uploads |
| **PostgreSQL DB** | `5432` | `localhost:5432` | Database: `legalease` \| User: `postgres` \| Pass: `postgrespassword` |
| **Redis Cache & Queue** | `6379` | `localhost:6379` | BullMQ background jobs & cache |

---

## 🛠️ Prerequisites

Before running the application, make sure you have installed:
- **Docker Desktop** (running in the background)
- **Node.js** (v18.x or v20.x+) and `npm`
- **Python** (3.10.x or 3.11.x) and `pip`
- **Git**

---

# 🪟 Windows Instructions (PowerShell / Command Prompt)

To run the complete system, open **4 separate terminal windows** (PowerShell or Windows Terminal tabs).

---

### Terminal 1: Backing Infrastructure (Docker)

From the project root (`LegalEase`):

```powershell
# Start PostgreSQL, Redis, and MinIO in the background
docker compose up -d

# Verify all containers are up and healthy
docker ps
```

*Expected output: `legalease-postgres`, `legalease-redis`, and `legalease-minio` are in `Up` or `healthy` state.*

---

### Terminal 2: AI / ML Microservice (Python FastAPI)

From the project root:

```powershell
# 1. Navigate to ai-service
cd ai-service

# 2. Activate existing virtual environment (Python 3.10+ required; use Python 3.11)
if (-not (Test-Path ".venv")) { py -3.11 -m venv .venv }
.\.venv\Scripts\activate

# 3. Install dependencies (first time or if requirements changed)
pip install -r requirements.txt

# 4. Start the FastAPI server on port 8000
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

> **Using Windows Command Prompt (`cmd.exe`)?**
> ```cmd
> cd ai-service
> .venv\Scripts\activate.bat
> python -m uvicorn main:app --host 0.0.0.0 --port 8000
> ```

*Expected output:*
```text
INFO: Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
2026-10-29 [...] [INFO] Classification pipeline: loaded fine-tuned model from ./models/legalease-clause-classifier
```

---

### Terminal 3: Backend API Server (Node.js / Express)

From the project root:

```powershell
# 1. Navigate to backend
cd backend

# 2. Install dependencies (first time only)
npm install

# 3. Apply database migrations to PostgreSQL
npx prisma migrate deploy

# 4. (Optional / Recommended) Backfill contract dates & reminders for existing contracts
npm run backfill:dates

# 5. Start the backend development server on port 4000
npm run dev
```

*Expected output:*
```text
S3 bucket "legalease-contracts" already exists.
🤖 AI Service connected successfully at http://127.0.0.1:8000 (Version: 2.0.0, Classifier: finetuned)
👷 Async background pipeline initialized in fault-tolerant direct mode.
🚀 LegalEase Backend listening on http://localhost:4000
📚 Swagger documentation live at http://localhost:4000/docs
❤️  Health check available at http://localhost:4000/health
```

---

### Terminal 4: Frontend Client (React / Vite)

From the project root:

```powershell
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies (first time only)
npm install

# 3. Start the Vite React development server on port 3000
npm run dev
```

*Expected output:*
```text
  VITE v5.x.x  ready in 450 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

---

### 🌐 Open All URLs at Once on Windows

In PowerShell, run this one-liner to launch all relevant tabs in your default browser:

```powershell
@("http://localhost:3000", "http://localhost:3000/vault", "http://localhost:4000/docs", "http://localhost:8000/docs", "http://localhost:9001") | ForEach-Object { Start-Process $_ }
```

---

### ⚠️ Free Locked Ports on Windows (Troubleshooting)

If a port shows `"Port 4000 is already in use"` or `"Port 8000 is already in use"`:

```powershell
# Free port 4000 (Backend)
Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Free port 8000 (AI Service)
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Free port 3000 (Frontend)
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

---

# 🍎 macOS Instructions (Terminal / zsh / bash)

Open **4 separate Terminal tabs or windows** (or use tmux / iTerm2).

---

### Terminal 1: Backing Infrastructure (Docker)

From the project root (`LegalEase`):

```bash
# Start PostgreSQL, Redis, and MinIO in background
docker compose up -d

# Verify all containers are up and healthy
docker ps
```

---

### Terminal 2: AI / ML Microservice (Python FastAPI)

From the project root:

```bash
# 1. Navigate to ai-service
cd ai-service

# 2. Create virtual environment if not present
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi

# 3. Activate virtual environment
source .venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Start the FastAPI server on port 8000
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
```

---

### Terminal 3: Backend API Server (Node.js / Express)

From the project root:

```bash
# 1. Navigate to backend
cd backend

# 2. Install dependencies
npm install

# 3. Apply database migrations to PostgreSQL
npx prisma migrate deploy

# 4. Backfill contract dates & reminders for all contracts in database
npm run backfill:dates

# 5. Start backend development server on port 4000
npm run dev
```

---

### Terminal 4: Frontend Client (React / Vite)

From the project root:

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Start Vite development server on port 3000
npm run dev
```

---

### 🌐 Open All URLs at Once on macOS

In your macOS Terminal, run:

```bash
open "http://localhost:3000" "http://localhost:3000/vault" "http://localhost:4000/docs" "http://localhost:8000/docs" "http://localhost:9001"
```

---

### ⚠️ Free Locked Ports on macOS (Troubleshooting)

If a port is already in use:

```bash
# Free port 4000 (Backend)
lsof -ti:4000 | xargs kill -9

# Free port 8000 (AI Service)
lsof -ti:8000 | xargs kill -9

# Free port 3000 (Frontend)
lsof -ti:3000 | xargs kill -9
```

---

## 🧪 Verification & Feature Commands

### 1. Test Contract Vault & Reminders End-to-End
Run the verification script from the `backend/` folder:

* **Windows:**
  ```powershell
  cd backend
  npx ts-node --transpile-only scripts/verify_step6.ts
  ```
* **macOS:**
  ```bash
  cd backend
  npx ts-node --transpile-only scripts/verify_step6.ts
  ```

*This inserts 2 test contracts (one expiring in 2 days, one expired 10 days ago), verifies the 4 summary cards (`Total`, `Active`, `Expiring Soon`, `Expired`), triggers the automated reminder worker, and tests live HTTP endpoints.*

### 2. Run AI Date Extraction Pytests
* **Windows:**
  ```powershell
  ai-service\.venv\Scripts\pytest ai-service/tests/test_date_extractor.py -v
  ```
* **macOS:**
  ```bash
  ai-service/.venv/bin/pytest ai-service/tests/test_date_extractor.py -v
  ```

### 3. Run AI Classifier Pytests
* **Windows:**
  ```powershell
  ai-service\.venv\Scripts\pytest ai-service/tests/test_classifier.py -v
  ```
* **macOS:**
  ```bash
  ai-service/.venv/bin/pytest ai-service/tests/test_classifier.py -v
  ```

### 4. Export Calendar Feed (.ics)
To download your RFC 5545 `.ics` iCalendar deadline schedule:
- Open: `http://localhost:4000/api/v1/reminders/calendar.ics` (with auth token)
- Or click **"Export Calendar (.ics)"** directly on the [http://localhost:3000/vault](http://localhost:3000/vault) page.

---

## 🔑 Login & Test Accounts

- **Default Test User**: `shalvipatel1827@gmail.com`
- **MinIO Storage Console**:
  - URL: [http://localhost:9001](http://localhost:9001)
  - Username: `minioadmin`
  - Password: `minioadminpassword`
- **PostgreSQL**:
  - Host: `localhost:5432`
  - Database: `legalease`
  - Username: `postgres`
  - Password: `postgrespassword`
