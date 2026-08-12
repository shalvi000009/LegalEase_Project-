# ⚡ LegalEase Execution Guide (Run Everything)

This document provides clear, step-by-step instructions to run the **LegalEase** project. You will learn how to run the entire system at once, or how to run each specific service (Backend, Frontend, or AI/ML) individually depending on your needs.

---

## 🗺️ Port & Address Reference

When up and running, the services will occupy the following addresses on your local machine:

| Service | Address / URL | Description / Notes |
| :--- | :--- | :--- |
| **Frontend Web App** | [http://localhost:5173](http://localhost:5173) | The user interface you open in the browser |
| **Backend REST API** | [http://localhost:4000/api/v1](http://localhost:4000/api/v1) | Express backend server endpoint |
| **API Interactive Docs** | [http://localhost:4000/docs](http://localhost:4000/docs) | Swagger Documentation for the backend APIs |
| **AI Service Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Swagger docs for FastAPI AI Service |
| **MinIO Console** | [http://localhost:9001](http://localhost:9001) | S3 Storage Console (User: `minioadmin`, Pass: `minioadminpassword`) |
| **PostgreSQL DB** | `localhost:5432` | Database (User: `postgres`, Pass: `postgrespassword`, DB: `legalease`) |
| **Redis Cache** | `localhost:6379` | BullMQ queue connector |

---

## 🚀 Scenario 1: Run the Complete Project Stack (Recommended)

This is the easiest and fastest way to start everything. We spin up backing databases and the backend server inside Docker, and run the Frontend and AI microservice locally.

### Prerequisites:
1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and ensure it is running.
2. Install [Node.js](https://nodejs.org/) (v18 or v20).
3. Install [Python 3.10 or 3.11](https://www.python.org/downloads/).

---

### Step-by-Step Instructions:

#### Step 1: Start Databases & Backend (via Docker)
Open your terminal in the project root folder and execute:
```bash
docker compose up -d
```
> [!NOTE]
> This command automatically pulls, installs, and starts PostgreSQL, Redis, MinIO storage, and builds the Node.js backend. The `-d` flag runs them silently in the background. Check if they are running with `docker compose ps`.

#### Step 2: Set Up and Run the AI Microservice (Python FastAPI)
Open a **new terminal window** in the project root and execute:
```bash
# 1. Navigate to the AI directory
cd ai-service

# 2. Create a virtual environment (keeps dependencies clean)
python -m venv .venv

# 3. Activate the virtual environment
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On Windows (Command Prompt / CMD):
.venv\Scripts\activate.bat
# On macOS / Linux:
source .venv/bin/activate

# 4. Install all Python packages
pip install -r requirements.txt

# 5. Start the FastAPI microservice
uvicorn main:app --reload --port 8000
```

#### Step 3: Set Up and Run the Frontend (React Vite)
Open a **third terminal window** in the project root and execute:
```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install package dependencies
npm install

# 3. Start the Vite development server
npm run dev
```

**🎉 That's it!** Open **[http://localhost:5173](http://localhost:5173)** in your browser to use the application.

---

## 🖥️ Scenario 2: Run ONLY the Backend (And databases)

If you are a backend engineer and only want to work on APIs, test databases, or write worker logic:

### Method A: With Docker (Easiest)
Run the following in the project root:
```bash
docker compose up -d postgres redis minio backend
```
This launches Postgres, Redis, MinIO, and the backend container. You can now test endpoints at `http://localhost:4000/docs`.

### Method B: Fully Local (No Docker at all)
If you do not want to use Docker, you must install PostgreSQL, Redis, and MinIO locally on your OS. Once they are running:

1. Open a terminal in the `/backend` directory:
   ```bash
   cd backend
   ```
2. Copy the configuration file:
   ```bash
   cp .env.example .env
   ```
   *(Open `.env` and verify your `DATABASE_URL`, `REDIS_URL`, and `S3_ENDPOINT` configurations match your local installations)*
3. Install packages:
   ```bash
   npm install
   ```
4. Run migrations and database setup:
   ```bash
   # Generate Prisma client
   npx prisma generate
   # Create database tables
   npx prisma migrate dev --name init
   ```
5. Start development server:
   ```bash
   npm run dev
   ```

---

## 🤖 Scenario 3: Run ONLY the AI/ML Microservice

If you want to run or test only the Python classification and extraction microservice:

1. Open a terminal in `/ai-service`:
   ```bash
   cd ai-service
   ```
2. Activate your virtual environment (create one first if you haven't, using instructions in Scenario 1):
   * Windows PowerShell: `.venv\Scripts\Activate.ps1`
   * Windows CMD: `.venv\Scripts\activate.bat`
   * macOS/Linux: `source .venv/bin/activate`
3. Start the server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
You can access the AI microservice documentation and test endpoints directly at **[http://localhost:8000/docs](http://localhost:8000/docs)**.

---

## 🎨 Scenario 4: Run ONLY the Frontend

If you are a frontend developer tweaking the design or routing:

1. Open a terminal in `/frontend`:
   ```bash
   cd frontend
   ```
2. Install packages:
   ```bash
   npm install
   ```
3. Start the Vite server:
   ```bash
   npm run dev
   ```
*Note: Without a running backend, login, signup, and uploads will fail. You can enable mock responses in the backend if you are testing styling details.*

---

## 🧪 Verification & Health Check Scripts

We have provided automated scripts to ensure all configurations, connections, and ML engines are working correctly.

### 1. Test the Node.js Backend & Queues
From the `/backend` directory:
```bash
# Verify auth token generation, DB connections, and environment variables
npx ts-node scripts/verify-week1.ts

# Verify MinIO connection and BullMQ queue flow
npx ts-node scripts/verify-week2.ts

# Verify risk calculations and endpoint connections
npx ts-node scripts/verify-week3.ts
```

### 2. Test the AI/ML Service
Ensure your python virtual environment is active in the `/ai-service` directory, then run:
```bash
# Basic FastAPI microservice smoke test
python scripts/smoke_test.py

# Test PDF extraction and OpenCV/OCR pipelines
python scripts/test_week2_pipeline.py

# Test Legal-BERT clause classification & risk rules
python scripts/test_week3_classifier.py
```

---

## ❓ Troubleshooting Common Errors

### 1. "Docker command not found" or "Cannot connect to Docker daemon"
* Make sure **Docker Desktop** is open and fully started (check your taskbar for the green Docker whale).
* If running on Windows WSL2, check that "WSL integration" is enabled in Docker settings.

### 2. Python: "ImportError: No module named..."
* Make sure you activated the virtual environment (`.venv`) before installing `requirements.txt` or starting `uvicorn`. Your terminal line should start with `(.venv)`.
* If Tesseract OCR fails, you must install Tesseract on your computer:
  * **Windows**: Download installer from GitHub (e.g. UB Mannheim) and add `C:\Program Files\Tesseract-OCR` to your System Environment variables (`PATH`).
  * **macOS**: Run `brew install tesseract`.
  * **Ubuntu/Linux**: Run `sudo apt-get install tesseract-ocr`.

### 3. Backend: "PrismaClientInitializationError"
* Your database is not running or the connection string is wrong.
* If running without Docker, double-check that PostgreSQL is running on port `5432` and that the password matches the `DATABASE_URL` in your backend `/backend/.env` file.
