# LegalEase Run Instructions

This guide covers how to set up and run the LegalEase backend application.

---

## Prerequisites
To run this application, you must have the following services running:
1. **PostgreSQL** (port `5432`)
2. **Redis** (port `6379`)
3. **MinIO / S3-compatible storage** (port `9000` for API, port `9001` for Console)

---

## Option A: Run Services using Docker (Recommended)

If you have Docker installed, you can start all backing services with a single command.

### 1. Start Docker Services
Open your terminal at the project root directory and run:
```bash
docker compose up -d
```
> ⚠️ **Common Issue**: If you see `docker: The term 'docker' is not recognized...`, it means Docker Desktop is either not installed or its command-line tools are not added to your system's PATH. 
> 
> **To resolve this**:
> 1. Download and install **Docker Desktop** from [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/).
> 2. Open Docker Desktop to start the Docker engine.
> 3. Restart your terminal window and try the command again.

### 2. Apply Database Migrations
Once Docker has started the database container, run:
```bash
cd backend
npm install
npx prisma migrate dev --name init_week2
```

### 3. Start the Server
```bash
npm run dev
```

---

## Option B: Run Services Locally (Without Docker)

If you cannot or do not want to use Docker, you must install and run the services directly on your machine.

### 1. Install & Start PostgreSQL
- Download and install PostgreSQL from [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/).
- Set the password for the `postgres` user to `postgres` (or adjust your `DATABASE_URL` config inside `backend/.env`).
- Verify that PostgreSQL is running on port `5432`.

### 2. Install & Start Redis
- For Windows, you can download Redis from [https://github.com/tporadowski/redis/releases](https://github.com/tporadowski/redis/releases) or use WSL.
- Start the Redis server so it listens on default port `6379`.

### 3. Install & Start MinIO (Object Storage)
- Download the MinIO server executable for Windows from [https://dl.min.io/server/minio/release/windows-amd64/minio.exe](https://dl.min.io/server/minio/release/windows-amd64/minio.exe).
- Open your terminal and run it:
  ```cmd
  minio.exe server C:\minio_data --console-address :9001
  ```
- Ensure MinIO is running on port `9000`.

### 4. Configure Environment Variables
Verify your `backend/.env` file matches your local service settings:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/legalease?schema=public
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadminpassword
```

### 5. Setup & Run
After your local Postgres, Redis, and MinIO instances are started:
```bash
cd backend
npm install
npx prisma migrate dev --name init_week2
npm run dev
```

---

## Verification & Documentation
- **Swagger Documentation**: Open [http://localhost:4000/docs](http://localhost:4000/docs) in your browser to view the interactive API console.
- **Run Verification Tests**: To verify routes and authentication logic, run:
  ```bash
  npx ts-node scripts/verify-week2.ts
  ```
