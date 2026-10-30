# LegalEase: Run Everything Guide (Windows & macOS)

This guide provides the exact commands to run the **LegalEase** application stack locally on **Windows** and **macOS**.

---

## 🏗️ Architecture & Services

1. **Backing Databases & Queues**: PostgreSQL (`5432`), Redis (`6379`), MinIO S3 (`9000` / `9001`)
2. **AI / ML Microservice**: Python FastAPI on `http://localhost:8000`
3. **Backend REST API**: Node.js / Express on `http://localhost:4000`
4. **Frontend Client**: React / Vite on `http://localhost:3000`

---

## 🪟 Windows Quick Start (PowerShell)

Open **4 separate PowerShell windows**:

### 1. Docker Backing Services
```powershell
docker compose up -d postgres redis minio
```

### 2. AI Service (Python FastAPI)
```powershell
cd ai-service
.\.venv\Scripts\activate
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 3. Backend API (Express)
```powershell
cd backend
npm install
npx prisma migrate deploy
npm run backfill:dates
npm run dev
```

### 4. Frontend Web App (React)
```powershell
cd frontend
npm install
npm run dev
```

---

## 🍎 macOS Quick Start (Terminal / zsh / bash)

Open **4 separate Terminal tabs or windows**:

### 1. Docker Backing Services
```bash
docker compose up -d postgres redis minio
```

### 2. AI Service (Python FastAPI)
```bash
cd ai-service
source .venv/bin/activate
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 3. Backend API (Express)
```bash
cd backend
npm install
npx prisma migrate deploy
npm run backfill:dates
npm run dev
```

### 4. Frontend Web App (React)
```bash
cd frontend
npm install
npm run dev
```

---

## 🌐 Application URLs

- **Web Application**: [http://localhost:3000](http://localhost:3000)
- **Contract Vault**: [http://localhost:3000/vault](http://localhost:3000/vault)
- **Deadline Calendar**: [http://localhost:3000/vault/calendar](http://localhost:3000/vault/calendar)
- **Backend Swagger API Docs**: [http://localhost:4000/docs](http://localhost:4000/docs)
- **Backend Health Check**: [http://localhost:4000/health](http://localhost:4000/health)
- **AI Service Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **AI Service Health Check**: [http://localhost:8000/health](http://localhost:8000/health)
- **MinIO Storage Console**: [http://localhost:9001](http://localhost:9001) (`minioadmin` / `minioadminpassword`)

---

## 🧪 Verification Commands

### Test Contract Vault & Reminders with Real Data
```bash
cd backend
npx ts-node --transpile-only scripts/verify_step6.ts
```

### Run Date Extractor Pytests
* **Windows**: `ai-service\.venv\Scripts\pytest ai-service/tests/test_date_extractor.py -v`
* **macOS**: `ai-service/.venv/bin/pytest ai-service/tests/test_date_extractor.py -v`

### Run Clause Classifier Pytests
* **Windows**: `ai-service\.venv\Scripts\pytest ai-service/tests/test_classifier.py -v`
* **macOS**: `ai-service/.venv/bin/pytest ai-service/tests/test_classifier.py -v`
