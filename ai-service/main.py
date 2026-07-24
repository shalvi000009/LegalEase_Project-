import os
# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(
    title="LegalEase AI Service",
    description="Internal Python FastAPI microservice for AI/ML tasks (contracts, RAG, classification, extraction)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

@app.get("/health", 
         summary="Health Check", 
         description="Returns the operational status of the AI microservice.",
         response_model=dict)
def health_check():
    """
    Check the health of the AI microservice.
    Returns:
        dict: Operational status details.
    """
    return {
        "status": "ok",
        "service": "ai-service",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
