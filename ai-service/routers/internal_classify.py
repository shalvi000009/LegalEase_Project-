"""
routers/internal_classify.py
=============================
Week 3 & Week 5: POST /internal/classify & POST /api/v1/analyze

Exposes the classification & risk scoring router.
Updated in Week 5 to support:
  - Scanned PDF OCR fallback
  - Expected clause checklist / missing clause detection
  - Suggested questions generation
  - Compatibility with Shalvi's worker (supporting both doc_id/document_id and /api/v1/analyze)
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, model_validator

from classification.classifier import ClauseClassifier
from classification.risk_scoring import RiskEngine
from classification.versioning import CURRENT_MODEL_VERSION
from extraction.chunker import chunk_text
from extraction.ocr_preprocessor import preprocess_and_ocr
from extraction.pdf_extractor import (
    extract_text_from_pdf,
    extract_text_from_scanned_pdf,
    is_scanned_pdf,
)

logger = logging.getLogger(__name__)

# Router for internal endpoints (e.g. /internal/classify)
router = APIRouter(prefix="/internal", tags=["Internal"])

# Router for api/v1 compatibility endpoints (e.g. /api/v1/analyze)
api_v1_router = APIRouter(prefix="/api/v1", tags=["Analysis"])

# Sample docs directory for offline fallback
_SAMPLE_DOCS_DIR = Path(__file__).parent.parent / "sample_docs"


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ClassifyRequest(BaseModel):
    doc_id: Optional[str] = Field(
        None,
        description="Unique document identifier (UUID). Populated automatically from document_id if needed."
    )
    s3_key: Optional[str] = Field(
        None,
        description=(
            "Optional S3/MinIO object key. If not provided, falls back "
            "to using local sample docs for testing."
        ),
    )

    @model_validator(mode="before")
    @classmethod
    def populate_doc_id(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Support document_id sent by Shalvi's worker
            if "document_id" in data and "doc_id" not in data:
                data["doc_id"] = data["document_id"]
        return data


class ClauseResponseModel(BaseModel):
    chunk_index: int
    text: str
    clause_type: str
    confidence: float
    risk_score: int
    risk_level: str
    matching_rules: List[str]


class ClassifyResponse(BaseModel):
    status: str
    doc_id: str
    overall_risk_score: int
    overall_risk_level: str
    clauses: List[ClauseResponseModel]
    classifier_method: str
    # Week 5 additions
    ocr_used: bool
    missing_clauses: List[str]
    suggested_questions: List[str]
    # Week 8 additions
    model_version: str = CURRENT_MODEL_VERSION


# ---------------------------------------------------------------------------
# Helper function: retrieve and chunk document
# ---------------------------------------------------------------------------

def _get_document_chunks(doc_id: str, s3_key: Optional[str]) -> Dict[str, Any]:
    """
    Fetches the document text from S3/MinIO (or local sample fallback) and splits it into chunks.
    Also returns whether OCR was used and the full extracted text.
    """
    # 1. Resolve local path
    if s3_key:
        filename = Path(s3_key).name
    else:
        # Default fallback sample contract
        filename = "sample_contract.pdf"

    local_path = _SAMPLE_DOCS_DIR / filename
    
    if not s3_key:
        logger.warning(
            "No s3_key provided for classify on doc_id='%s'. Falling back to local file '%s'.",
            doc_id,
            local_path,
        )

    if not local_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Local document file not found at: '{local_path}'.",
        )

    # 2. Extract text based on file extension
    suffix = local_path.suffix.lower()
    full_text = ""
    ocr_used = False
    image_extensions = {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp", ".webp"}

    try:
        if suffix == ".pdf":
            if is_scanned_pdf(str(local_path)):
                logger.info("Classify pipeline: Scanned PDF detected; routing through OCR.")
                ocr_result = extract_text_from_scanned_pdf(str(local_path))
                full_text = ocr_result["full_text"]
                ocr_used = True
            else:
                logger.info("Classify pipeline: Digital PDF detected; routing through text extractor.")
                result = extract_text_from_pdf(str(local_path))
                full_text = result["full_text"]
                ocr_used = False

        elif suffix in image_extensions:
            logger.info("Classify pipeline: Raw image detected; routing through OCR.")
            ocr_result = preprocess_and_ocr(str(local_path))
            full_text = ocr_result["text"]
            ocr_used = True
        else:
            raise HTTPException(
                status_code=422,
                detail=f"Unsupported file type '{suffix}'. Supported: .pdf, {', '.join(sorted(image_extensions))}",
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Text extraction failed during classification for doc_id='%s'", doc_id)
        raise HTTPException(status_code=500, detail=f"Extraction error: {exc}") from exc

    # 3. Chunk text
    try:
        chunks = chunk_text(full_text, doc_id=doc_id)
        return {
            "chunks": chunks,
            "ocr_used": ocr_used,
            "full_text": full_text
        }
    except Exception as exc:
        logger.exception("Chunking failed during classification for doc_id='%s'", doc_id)
        raise HTTPException(status_code=500, detail=f"Chunking error: {exc}") from exc


# ---------------------------------------------------------------------------
# Route handler
# ---------------------------------------------------------------------------

async def classify_document_handler(request: ClassifyRequest) -> ClassifyResponse:
    """
    Core handler logic for both endpoints.
    """
    doc_id = request.doc_id or "unknown"
    s3_key = request.s3_key
    
    logger.info("Classify request received — doc_id='%s' s3_key='%s'", doc_id, s3_key)

    # 1. Fetch chunks & extraction metadata
    doc_data = _get_document_chunks(doc_id, s3_key)
    chunks = doc_data["chunks"]
    ocr_used = doc_data["ocr_used"]
    full_text = doc_data["full_text"]

    if not chunks:
        logger.warning("No chunks generated for doc_id='%s'. Returning empty clauses list.", doc_id)
        return ClassifyResponse(
            status="ok",
            doc_id=doc_id,
            overall_risk_score=0,
            overall_risk_level="low",
            clauses=[],
            classifier_method="empty-doc",
            ocr_used=ocr_used,
            missing_clauses=[],
            suggested_questions=[],
        )

    # 2. Initialize classifier & risk engine (singletons/cached)
    classifier = ClauseClassifier()
    risk_engine = RiskEngine()

    # 3. Process each chunk
    clauses: List[ClauseResponseModel] = []
    classifier_methods_used = set()

    for chunk in chunks:
        text = chunk["text"]
        chunk_index = chunk["chunk_index"]

        # Classify clause
        classification = classifier.classify_text(text)
        clause_type = classification["clause_type"]
        confidence = classification["confidence"]
        method = classification["method"]
        classifier_methods_used.add(method)

        # Score risk
        risk_result = risk_engine.score_clause(text, clause_type, confidence)
        risk_score = risk_result["risk_score"]
        risk_level = risk_result["risk_level"]
        matching_rules = risk_result["matching_rules"]

        clauses.append(
            ClauseResponseModel(
                chunk_index=chunk_index,
                text=text,
                clause_type=clause_type,
                confidence=confidence,
                risk_score=risk_score,
                risk_level=risk_level,
                matching_rules=matching_rules,
            )
        )

    # 4. Calculate overall risk
    overall_score, overall_level = risk_engine.calculate_overall_risk(
        [c.dict() for c in clauses]
    )

    # Determine classifier method reporting
    method_str = ", ".join(sorted(classifier_methods_used))

    # 5. Missing clauses & suggested questions analysis
    from classification.checklist import analyze_reporting_features
    report_features = analyze_reporting_features(full_text, [c.dict() for c in clauses])
    missing_clauses = report_features["missing_clauses"]
    suggested_questions = report_features["suggested_questions"]

    logger.info(
        "Classification complete for doc_id='%s': %d clauses classified, "
        "overall_score=%d, overall_level='%s', method='%s', ocr_used=%s, "
        "missing_clauses_count=%d, suggested_questions_count=%d",
        doc_id,
        len(clauses),
        overall_score,
        overall_level,
        method_str,
        ocr_used,
        len(missing_clauses),
        len(suggested_questions),
    )

    return ClassifyResponse(
        status="ok",
        doc_id=doc_id,
        overall_risk_score=overall_score,
        overall_risk_level=overall_level,
        clauses=clauses,
        classifier_method=method_str,
        ocr_used=ocr_used,
        missing_clauses=missing_clauses,
        suggested_questions=suggested_questions,
        model_version=CURRENT_MODEL_VERSION,
    )


# Register routes to respective routers
@router.post(
    "/classify",
    response_model=ClassifyResponse,
    summary="Classify clauses and calculate risk scores for a document",
    description="Internal endpoint called by Shalvi's BullMQ classification worker.",
)
async def classify_document_internal(request: ClassifyRequest) -> ClassifyResponse:
    return await classify_document_handler(request)


@api_v1_router.post(
    "/analyze",
    response_model=ClassifyResponse,
    summary="Classify clauses and calculate risk scores for a document (api compatibility)",
    description="Compatibility endpoint called by Shalvi's BullMQ worker.",
)
async def classify_document_api(request: ClassifyRequest) -> ClassifyResponse:
    return await classify_document_handler(request)
