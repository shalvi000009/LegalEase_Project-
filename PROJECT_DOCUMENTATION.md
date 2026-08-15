# LegalEase Project Documentation & Architecture Guide

Welcome to the **LegalEase** project documentation. If you built this project using "vibe coding," this document is designed to explain exactly how every piece of the system fits together, what technologies are used, the core legal and software concepts behind them, and why those technologies were chosen.

---

## 📌 1. Project Overview & What We Built

**LegalEase** is an AI-powered legal contract analysis platform. It helps users upload contracts (PDFs or images), automatically extracts the text, identifies important clauses (like liability, confidentiality, or termination), scores their risk level, checks for typical missing clauses, and allows users to chat with the document using an AI assistant.

### High-Level Architecture
The system is divided into three main components:
1. **Frontend (Client)**: The user interface where users upload documents, see analysis scores, download reports, and chat.
2. **Backend (Server)**: The brain of the application that manages user accounts, handles document uploads, schedules background jobs, generates reports, and runs the APIs.
3. **AI/ML Service (AI Engine)**: A Python service that performs text extraction, runs machine learning models (Legal-BERT), extracts clauses, calculates risks, and communicates with OpenAI for advanced analysis.

```
+-------------------------------------------------------------+
|                     React Frontend (UI)                     |
+------------------------------+------------------------------+
                               |
                               | (HTTP REST & SSE Stream)
                               v
+-------------------------------------------------------------+
|                   Express Backend (APIs)                    |
+--------------+-------------------------------+--------------+
               |                               |
               | (Prisma)                      | (Redis/BullMQ Jobs)
               v                               v
+--------------+-------------+   +-------------+--------------+
|      PostgreSQL Database   |   |        Redis Queue         |
+----------------------------+   +-------------+--------------+
                                               |
                                               v
                                 +-------------+--------------+
                                 |    BullMQ Worker Thread    |
                                 +-------------+--------------+
                                               |
                                               | (HTTP POST /analyze)
                                               v
+-------------------------------------------------------------+
|                Python FastAPI AI Service                    |
+--------------+-------------------------------+--------------+
               |                               |
               | (If Scanned PDF)              | (For Missing Clauses)
               v                               v
+--------------+-------------+   +-------------+--------------+
|     Tesseract OCR Engine   |   |     OpenAI GPT-4o API      |
+----------------------------+   +----------------------------+
```

---

## 🛠️ 2. Detailed Technical Stack & Why We Chose It

### A. Frontend (User Interface)
* **React + TypeScript + Vite**:
  * *What it is*: A modern build tool (Vite) and library (React) for building interactive web pages.
  * *Why we chose it*: Vite is incredibly fast compared to older setups (like Create React App). React is component-based, making it easy to build reusable UI elements like buttons, input fields, and chat boxes.
* **Zustand (State Management)**:
  * *What it is*: A very lightweight, fast, hooks-based state manager for React.
  * *Why we chose it over Redux*: Redux requires a lot of boilerplate code (actions, reducers, stores). Zustand does the same job in 10 lines of code, making it simple, highly reactive, and easy to maintain.
* **Vanilla CSS (Styling)**:
  * *What it is*: Core CSS files without frameworks.
  * *Why we chose it*: Vanilla CSS gives us absolute control over the styling and layouts, avoiding overhead from styling frameworks.

### B. Backend (Business Logic & Orchestration)
* **Node.js + Express + TypeScript**:
  * *What it is*: A JavaScript/TypeScript server-side runtime (Node.js) and a simple routing framework (Express).
  * *Why we chose it*: Express is simple, lightweight, and has a massive community. Writing both frontend and backend in TypeScript/JavaScript makes it easy to share interface definitions and concepts.
* **Prisma (ORM)**:
  * *What it is*: An Object-Relational Mapper that lets us interact with our PostgreSQL database using TypeScript functions instead of raw SQL queries.
  * *Why we chose it*: Prisma auto-generates TypeScript types based on our database schema, preventing database syntax errors during compilation.
* **BullMQ + Redis (Job Queues)**:
  * *What it is*: A message queue (BullMQ) powered by a fast in-memory key-value database (Redis) to run background jobs.
  * *Why we chose it*: Extracting text and running ML models on a 100-page PDF can take minutes. If we did this directly in the API request, the server would freeze or timeout. BullMQ allows us to respond immediately with "Uploading/Processing" and let a background worker process the file separately.
* **Puppeteer (PDF Generation)**:
  * *What it is*: A headless Chrome browser controlled by Node.js.
  * *Why we chose it*: Building beautiful PDF pages manually in code is extremely difficult. Puppeteer lets us design the report using standard HTML and CSS, and then prints it to a PDF, producing a beautiful document.
* **JSON Web Tokens (JWT)**:
  * *What it is*: A secure token format containing encoded user information.
  * *Why we chose it*: Used for logging in users securely (Access and Refresh tokens) and generating public, read-only expiring links for sharing document analyses.

### C. AI/ML Service (Engine)
* **FastAPI (Python)**:
  * *What it is*: A modern, fast web API framework for Python.
  * *Why we chose it*: Python is the industry standard for machine learning. FastAPI is asynchronous and auto-generates documentation pages.
* **PyMuPDF**:
  * *What it is*: A fast Python PDF parser.
  * *Why we chose it*: It is significantly faster than other libraries for extracting raw text from digital PDFs.
* **Tesseract OCR + OpenCV**:
  * *What it is*: An Optical Character Recognition engine (Tesseract) and an image processing library (OpenCV).
  * *Why we chose it*: Standard text extraction fails on scanned PDFs (which are just images). OpenCV cleans up, binarizes (converts to black-and-white), and aligns the images so Tesseract can accurately extract text.
* **Legal-BERT**:
  * *What it is*: A BERT language model fine-tuned specifically on legal corpora (contracts, laws, cases).
  * *Why we chose it*: Standard AI models don't understand dense legalese. Legal-BERT understands context, clause definitions, and risk signals much better than general-purpose small models.
* **OpenAI GPT-4o**:
  * *What it is*: OpenAI's state-of-the-art Large Language Model.
  * *Why we chose it*: While Legal-BERT is great at classifying individual clauses, GPT-4o is used to look at the entire contract context, find what clauses are *missing* from a typical contract, and suggest smart questions for the user to ask.

---

## 🧠 3. Key Concepts & Workflows

### 1. The Processing Pipeline (How a Contract is Analyzed)
When you upload a file, the system goes through these steps:
1. **Upload**: The user sends the file to the backend (`POST /api/v1/documents`). The backend saves it to storage (S3/MinIO) and creates a database record with status `uploaded`.
2. **Queue**: The backend adds an analysis job to the BullMQ Redis queue and returns `201 Created` to the user.
3. **Worker**: The BullMQ background worker picks up the job, marks the document status as `processing`, and calls the AI service.
4. **Extraction (Digital vs Scanned)**: The AI service reads the PDF. If it has readable text, it extracts it. If it is empty (scanned), it runs OpenCV to clean the page and Tesseract OCR to read the text.
5. **Classification & Risk**: The extracted text is split into paragraphs. Each paragraph is run through the Legal-BERT model to see if it is a specific clause type. If it is, a risk score is calculated using predefined risk rules.
6. **Checklist & Missing Clauses**: The AI service compares the found clauses against a checklist (e.g. an employment agreement must have termination and non-compete clauses). Anything missing is flagged.
7. **Save**: The worker saves the analysis results (overall score, model version, and clauses list) in the database and updates the document status to `done`.

### 2. RAG (Retrieval-Augmented Generation) Chat
RAG is a concept where instead of just asking an AI a general question, we first *retrieve* the most relevant sections of the contract and paste them into the AI's prompt. 
* When the user asks a question (like "What is the liability limit?"), the system searches the database for clauses matching "liability".
* It passes those specific clauses as context to the AI, so the AI responds based *only* on the uploaded contract, preventing hallucinations.
* The response is streamed to the user character-by-character using **Server-Sent Events (SSE)**.

---

## 🔒 4. Document Sharing & Report Exports

### Shareable Links
To share an analysis report without giving someone your password:
* You request a share link (`POST /api/v1/documents/:id/share`).
* The server signs a **JWT token** containing the document ID, set to expire in 24 hours.
* The recipient opens `GET /api/v1/share/:token`. The server decodes the token, verifies it hasn't expired, and fetches the document details and clauses from the database. No auth header is required!

### PDF Reports
When you request a download:
* The server fetches all analysis data and chat history.
* It injects this data into a beautiful, styled HTML template.
* **Puppeteer** launches a headless Chrome browser in the background, renders that HTML template, prints it to a PDF buffer, and streams the binary PDF back to your browser as an attachment.
