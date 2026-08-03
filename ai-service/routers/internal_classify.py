"""
routers/internal_classify.py
=============================
Week 3 — Deliverable 3: POST /internal/classify

Internal FastAPI route called by Shalvi's BullMQ classification worker to
classify clauses and score risk for a document.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from classification.classifier import ClauseClassifier
from classification.risk_scoring import RiskEngine
from extraction.chunker import chunk_text
from extraction.ocr_preprocessor import preprocess_and_ocr
from extraction.pdf_extractor import extract_text_from_pdf, is_scanned_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal", tags=["Internal"])

# Sample docs directory for offline fallback
_SAMPLE_DOCS_DIR = Path(__file__).parent.parent / "sample_docs"


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ClassifyRequest(BaseModel):
    doc_id: str = Field(..., description="Unique document identifier (UUID).")
    s3_key: Optional[str] = Field(
        None,
        description=(
            "Optional S3/MinIO object key. If not provided, falls back "
            "to using local sample docs for testing."
        ),
    )


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


# ---------------------------------------------------------------------------
# Helper function: retrieve and chunk document
# ---------------------------------------------------------------------------

def _get_document_chunks(doc_id: str, s3_key: Optional[str]) -> List[Dict[str, Any]]:
    """
    Fetches the document text from S3/MinIO (or local sample fallback) and splits it into chunks.
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
    image_extensions = {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp", ".webp"}

    try:
        if suffix == ".pdf":
            if is_scanned_pdf(str(local_path)):
                logger.info("Classify pipeline: Scanned PDF detected; routing through OCR.")
                import fitz as _fitz  # type: ignore[import-untyped]
                doc_fitz = _fitz.open(str(local_path))
                page = doc_fitz.load_page(0)
                mat = _fitz.Matrix(2.0, 2.0)
                pix = page.get_pixmap(matrix=mat)
                import numpy as _np
                import cv2 as _cv2
                img_bytes = pix.tobytes("png")
                arr = _np.frombuffer(img_bytes, _np.uint8)
                img_bgr = _cv2.imdecode(arr, _cv2.IMREAD_COLOR)
                doc_fitz.close()

                ocr_result = preprocess_and_ocr(img_bgr)
                full_text = ocr_result["text"]
            else:
                logger.info("Classify pipeline: Digital PDF detected; routing through text extractor.")
                result = extract_text_from_pdf(str(local_path))
                full_text = result["full_text"]

        elif suffix in image_extensions:
            logger.info("Classify pipeline: Raw image detected; routing through OCR.")
            ocr_result = preprocess_and_ocr(str(local_path))
            full_text = ocr_result["text"]
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
        return chunks
    except Exception as exc:
        logger.exception("Chunking failed during classification for doc_id='%s'", doc_id)
        raise HTTPException(status_code=500, detail=f"Chunking error: {exc}") from exc


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post(
    "/classify",
    response_model=ClassifyResponse,
    summary="Classify clauses and calculate risk scores for a document",
    description=(
        "Internal endpoint called by Shalvi's BullMQ classification worker. "
        "Accepts `{doc_id, s3_key}`, retrieves/extracts the contract text, chunks it, "
        "and runs Legal-BERT (or TF-IDF fallback) and the risk scoring rule engine on each clause chunk. "
        "Returns the classification labels, confidence metrics, individual risk levels, and the overall document risk."
    ),
)
async def classify_document(request: ClassifyRequest) -> ClassifyResponse:
    """
    POST /internal/classify
    """
    doc_id = request.doc_id
    s3_key = request.s3_key
    
    logger.info("POST /internal/classify — doc_id='%s' s3_key='%s'", doc_id, s3_key)

    # 1. Fetch chunks
    chunks = _get_document_chunks(doc_id, s3_key)
    if not chunks:
        logger.warning("No chunks generated for doc_id='%s'. Returning empty clauses list.", doc_id)
        return ClassifyResponse(
            status="ok",
            doc_id=doc_id,
            overall_risk_score=0,
            overall_risk_level="low",
            clauses=[],
            classifier_method="empty-doc",
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

    logger.info(
        "Classification complete for doc_id='%s': %d clauses classified, "
        "overall_score=%d, overall_level='%s', method='%s'",
        doc_id,
        len(clauses),
        overall_score,
        overall_level,
        method_str,
    )

    return ClassifyResponse(
        status="ok",
        doc_id=doc_id,
        overall_risk_score=overall_score,
        overall_risk_level=overall_level,
        clauses=clauses,
        classifier_method=method_str,
    )
