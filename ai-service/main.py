import logging
import os

# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# pyrefly: ignore [missing-import]
from fastapi import FastAPI

# Load environment variables early so all modules can read them
load_dotenv()

# ---------------------------------------------------------------------------
# Logging — structured, readable output for local dev and Docker logs
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------
app = FastAPI(
    title="LegalEase AI Service",
    description=(
        "Internal Python FastAPI microservice for AI/ML tasks "
        "(contracts, RAG, classification, extraction). "
        "Called by the Node.js backend over Docker network — not exposed publicly."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# Week 2: Upload pipeline router
# ---------------------------------------------------------------------------
from routers.internal_extract import router as extract_router  # noqa: E402
app.include_router(extract_router)
logger.info("Registered router: /internal/extract")

# Week 3: Clause classification and risk scoring router
from routers.internal_classify import router as classify_router  # noqa: E402
from routers.internal_classify import api_v1_router as classify_api_v1_router  # noqa: E402
app.include_router(classify_router)
app.include_router(classify_api_v1_router)
logger.info("Registered routers: /internal/classify and /api/v1/analyze")

# Week 6: Date extraction and resolution router
from routers.internal_dates import router as dates_router  # noqa: E402
app.include_router(dates_router)
logger.info("Registered router: /internal/extract-dates")

# Week 7: Source document classification and deduplication router
from routers.internal_source_doc import router as source_doc_router  # noqa: E402
app.include_router(source_doc_router)
logger.info("Registered router: /internal/classify-source-doc")

# Week 8: Weekly re-analysis and model versioning router
from routers.internal_reanalyze import router as reanalyze_router  # noqa: E402
app.include_router(reanalyze_router)
logger.info("Registered router: /internal/reanalyze-batch and /internal/check-stale")

# Week 9: RAG Query with Redis caching and prompt optimization
from routers.internal_rag import router as rag_router  # noqa: E402
app.include_router(rag_router)
logger.info("Registered router: /internal/rag-query")


# ---------------------------------------------------------------------------
# Week 1: Health check
# ---------------------------------------------------------------------------
@app.get(
    "/health",
    summary="Health Check",
    description="Returns the operational status of the AI microservice.",
    response_model=dict,
    tags=["System"],
)
def health_check() -> dict:
    """
    Check the health of the AI microservice.

    Returns:
        dict: Operational status and version.
    """
    return {
        "status": "ok",
        "service": "ai-service",
        "version": "2.0.0",
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
