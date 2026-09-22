"""
routers/internal_dates.py
==========================
Week 6 — Deliverable 5: POST /internal/extract-dates
Exposes the date extraction and resolution endpoint.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Optional

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from extraction.date_extractor import detect_signing_date, process_date_extraction

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal", tags=["Internal"])

_SAMPLE_DOCS_DIR = Path(__file__).parent.parent / "sample_docs"


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ExtractDatesRequest(BaseModel):
    doc_id: str = Field(..., description="Unique document identifier (UUID).")
    s3_key: Optional[str] = Field(
        None,
        description=(
            "Optional S3/MinIO object key. If not provided, falls back "
            "to using local sample docs for testing."
        ),
    )
    signing_date: Optional[str] = Field(
        None,
        description="Optional custom contract signing date (ISO format YYYY-MM-DD)."
    )


class DateEntityModel(BaseModel):
    type: str
    raw_text: str
    resolved_date: Optional[str] = None
    confidence: float


class ExtractDatesResponse(BaseModel):
    status: str
    doc_id: str
    signing_date: str
    dates: List[DateEntityModel]


# ---------------------------------------------------------------------------
# Helper: retrieve full text
# ---------------------------------------------------------------------------

def _get_document_text(doc_id: str, s3_key: Optional[str]) -> str:
    """
    Fetches the document text from S3/MinIO (or local sample fallback)
    by running standard extraction.
    """
    if s3_key:
        filename = Path(s3_key).name
    else:
        filename = "sample_contract.pdf"

    local_path = _SAMPLE_DOCS_DIR / filename
    
    if not local_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Local document file not found at: '{local_path}'.",
        )

    suffix = local_path.suffix.lower()
    image_extensions = {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp", ".webp"}

    try:
        if suffix == ".pdf":
            from extraction.pdf_extractor import extract_text_from_pdf, extract_text_from_scanned_pdf, is_scanned_pdf
            if is_scanned_pdf(str(local_path)):
                ocr_result = extract_text_from_scanned_pdf(str(local_path))
                return ocr_result["full_text"]
            else:
                result = extract_text_from_pdf(str(local_path))
                return result["full_text"]

        elif suffix in image_extensions:
            from extraction.ocr_preprocessor import preprocess_and_ocr
            ocr_result = preprocess_and_ocr(str(local_path))
            return ocr_result["text"]
        else:
            raise HTTPException(
                status_code=422,
                detail=f"Unsupported file type '{suffix}'. Supported: .pdf, {', '.join(sorted(image_extensions))}",
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Text extraction failed during date extraction for doc_id='%s'", doc_id)
        raise HTTPException(status_code=500, detail=f"Extraction error: {exc}") from exc


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post(
    "/extract-dates",
    response_model=ExtractDatesResponse,
    summary="Extract dates, resolve relative dates, and classify them",
    description=(
        "Internal endpoint called by Shalvi's contract_dates process. "
        "Accepts `{doc_id, s3_key, signing_date}`, extracts all dates, "
        "resolves relative expressions (e.g. '90 days after signing'), "
        "and classifies them into expiry_date, renewal_date, notice_deadline, etc."
    ),
)
async def extract_dates_from_document(request: ExtractDatesRequest) -> ExtractDatesResponse:
    """
    POST /internal/extract-dates
    """
    doc_id = request.doc_id
    s3_key = request.s3_key
    custom_signing_date = request.signing_date
    
    logger.info("POST /internal/extract-dates — doc_id='%s' s3_key='%s'", doc_id, s3_key)

    # 1. Fetch text
    text = _get_document_text(doc_id, s3_key)

    # 2. Detect/Verify signing date
    resolved_signing_date = custom_signing_date
    if not resolved_signing_date:
        resolved_signing_date = detect_signing_date(text)
        logger.info("Auto-detected signing date: %s", resolved_signing_date)

    # 3. Run date processing pipeline
    extracted_dates = process_date_extraction(text, resolved_signing_date)

    # 4. Map to response schema
    date_entities = []
    for item in extracted_dates:
        date_entities.append(
            DateEntityModel(
                type=item["type"],
                raw_text=item["raw_text"],
                resolved_date=item["resolved_date"],
                confidence=item["confidence"],
            )
        )

    return ExtractDatesResponse(
        status="ok",
        doc_id=doc_id,
        signing_date=resolved_signing_date,
        dates=date_entities,
    )
