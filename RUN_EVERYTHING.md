# LegalEase: Run Everything Guide

This guide explains how to start and run all parts of the **LegalEase** application:
1. **Backing Databases & Queues** (PostgreSQL, Redis, MinIO)
2. **Backend API Server** (Express)
3. **Frontend Client** (React/Vite)
4. **AI/ML Service** (Python FastAPI)

---

## 🛠️ Step 1: Start the Backing Services (Database, Queue, Storage)

You can run these services either using **Docker** (recommended, easiest) or **Locally** (without Docker).

### Option A: Run using Docker (Recommended)
If you have Docker Desktop installed and running:
1. Open a terminal at the project root directory.
2. Run the command:
   ```bash
   docker compose up -d
   ```
   *This starts PostgreSQL (database), Redis (queues), and MinIO (file storage) in the background.*

### Option B: Run locally (Without Docker)
If you don't have Docker, you must install and start these 3 services manually on your system:
1. **PostgreSQL**: Download and start PostgreSQL on port `5432`. Ensure the database user is `postgres` with password `postgres`.
2. **Redis**: Download and start Redis server on port `6379`.
3. **MinIO**: Download MinIO Server and run it:
   ```cmd
   minio.exe server C:\minio_data --console-address :9001
   ```
   Ensure MinIO API is listening on port `9000`.

---

## 💻 Step 2: Set Up and Run the Express Backend

1. Navigate to the `backend/` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your Environment variables. Create or edit `backend/.env` file:
   ```env
   PORT=4000
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/legalease?schema=public
   REDIS_URL=redis://localhost:6379
   S3_ENDPOINT=http://localhost:9000
   S3_ACCESS_KEY=minioadmin
   S3_SECRET_KEY=minioadminpassword
   S3_BUCKET_NAME=legalease-contracts
   JWT_ACCESS_SECRET=your_super_secret_access_key
   JWT_REFRESH_SECRET=your_super_secret_refresh_key
   
   # IMPORTANT CONFIGURATION:
   # Set to "true" to run in Mock Mode (runs without needing Docker, S3, or PostgreSQL).
   # Set to "false" to run in real Production mode.
   MOCK_SERVICES=true
   
   AI_SERVICE_URL=http://localhost:8000
   ```
4. Update the database schema:
   * **If running in real mode** (with PostgreSQL active):
     ```bash
     npx prisma db push
     ```
   * **If running in mock mode** (`MOCK_SERVICES=true`): You can skip this database sync step.
5. Start the backend development server:
   ```bash
   npm run dev
   ```
   *The backend will now be running at [http://localhost:4000](http://localhost:4000).*

---

## 🎨 Step 3: Set Up and Run the React Frontend

1. Open a new terminal window and navigate to the `frontend/` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend website will open at [http://localhost:5173](http://localhost:5173).*

---

## 🤖 Step 4: Set Up and Run the AI/ML Python Service

*(Only required when `MOCK_SERVICES=false` in the backend environment)*

1. Open a new terminal window and navigate to the `ai-service/` folder:
   ```bash
   cd ai-service
   ```
2. Create and activate a Python virtual environment:
   * **On Windows**:
     ```bash
     python -m venv venv
     .\venv\Scripts\activate
     ```
   * **On macOS/Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *The AI/ML Service is now running at [http://localhost:8000](http://localhost:8000).*

---

