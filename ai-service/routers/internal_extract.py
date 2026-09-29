"""
routers/internal_extract.py
============================
Week 2 — Deliverable 5: POST /internal/extract

Internal FastAPI route called by Shalvi's BullMQ worker to trigger the
full extraction + chunking + embedding pipeline for a single uploaded document.

REQUEST BODY:
    {
        "doc_id": "string",   // Unique document identifier (UUID recommended)
        "s3_key": "string"    // S3/MinIO object key from Shalvi's `documents` table
    }

RESPONSE (200 OK):
    {
        "status": "ok",
        "doc_id": "string",
        "pipeline": "pdf" | "ocr",          // Which extraction path was taken
        "page_count": int | null,            // PDF pages (null for image input)
        "chunk_stats": {
            "total_chunks": int,
            "total_chars": int,
            "avg_chars": float,
            "min_chars": int,
            "max_chars": int,
            "avg_approx_tokens": float
        },
        "embed_upsert": {
            "doc_id": "string",
            "namespace": "string",
            "total_chunks": int,
            "upserted_count": int,
            "stub": bool
        },
        "stubs_active": {
            "s3_fetch": true,               // always true until Shalvi's creds arrive
            "embeddings": true,             // true until OPENAI_API_KEY is set
            "pinecone_upsert": true         // true until PINECONE_API_KEY is set
        }
    }

ERROR (422 Unprocessable Entity): FastAPI default validation errors.
ERROR (500 Internal Server Error):
    {
        "detail": "string"   // human-readable error message
    }
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Dict, Optional

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from extraction.chunker import chunk_stats, chunk_text
from extraction.embeddings import embed_and_upsert
from extraction.file_resolver import resolve_document_file
from extraction.ocr_preprocessor import preprocess_and_ocr
from extraction.pdf_extractor import (
    extract_text_from_pdf,
    extract_text_from_scanned_pdf,
    is_scanned_pdf,
)

# Week 11: Multi-language support
from translation.detector import detect_language
from translation.translator import translate_to_english

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal", tags=["Internal"])

# ---------------------------------------------------------------------------
# Sample docs folder — used for local development and integration tests.
# In production this is replaced by the real S3 fetch (see stub below).
# ---------------------------------------------------------------------------
_SAMPLE_DOCS_DIR = Path(__file__).parent.parent / "sample_docs"


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ExtractRequest(BaseModel):
    doc_id: str = Field(..., description="Unique document identifier (UUID).")
    s3_key: str = Field(
        ...,
        description=(
            "S3/MinIO object key for the document, as stored in Shalvi's "
            "`documents` table. Format: '<user_id>/<doc_id>/<filename>'. "
            "Example: 'usr_abc123/doc_xyz789/contract.pdf'"
        ),
    )


class ChunkStatsModel(BaseModel):
    total_chunks: int
    total_chars: int
    avg_chars: float
    min_chars: int
    max_chars: int
    avg_approx_tokens: float


class EmbedUpsertModel(BaseModel):
    doc_id: str
    namespace: str
    total_chunks: int
    upserted_count: int
    stub: bool


class StubsActiveModel(BaseModel):
    s3_fetch: bool
    embeddings: bool
    pinecone_upsert: bool


class ExtractResponse(BaseModel):
    status: str
    doc_id: str
    pipeline: str                              # "pdf" | "ocr"
    page_count: Optional[int] = None
    chunk_stats: ChunkStatsModel
    embed_upsert: EmbedUpsertModel
    stubs_active: StubsActiveModel
    # Week 11: Multi-language support fields
    original_language: str = Field(
        "en",
        description="ISO 639-1 language code of the original document (e.g. 'en', 'hi', 'fr').",
    )
    translation_used: bool = Field(
        False,
        description="Whether translation to English was performed before processing.",
    )
    original_text_excerpt: Optional[str] = Field(
        None,
        description="First ~500 chars of the untranslated original text, for reference/debugging.",
    )


# ---------------------------------------------------------------------------
# S3 fetch stub
# ---------------------------------------------------------------------------

def _stub_fetch_from_s3(doc_id: str, s3_key: str) -> Path:
    """
    # TODO: BLOCKED on Shalvi's S3 config — replace this stub with real S3/MinIO fetch.
    #
    # Real implementation (example using boto3):
    #   import boto3, tempfile
    #   s3 = boto3.client(
    #       "s3",
    #       endpoint_url=os.environ["S3_ENDPOINT_URL"],       # MinIO or AWS
    #       aws_access_key_id=os.environ["S3_ACCESS_KEY"],
    #       aws_secret_access_key=os.environ["S3_SECRET_KEY"],
    #   )
    #   bucket = os.environ["S3_BUCKET_NAME"]
    #   suffix = Path(s3_key).suffix
    #   tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    #   s3.download_fileobj(bucket, s3_key, tmp)
    #   tmp.close()
    #   return Path(tmp.name)
    #
    # Expected s3_key convention (from Shalvi's documents table):
    #   "<user_id>/<doc_id>/<filename>"
    #   e.g. "usr_abc123/doc_xyz789/contract.pdf"

    Instead, resolves a local file from sample_docs/ based on the filename
    component of s3_key for offline development.
    """
    filename = Path(s3_key).name
    local_path = _SAMPLE_DOCS_DIR / filename

    logger.warning(
        "[STUB] _stub_fetch_from_s3: would fetch s3_key='%s' from S3/MinIO. "
        "Using local file '%s' instead. "
        "Replace with real S3 call once Shalvi's config is available.",
        s3_key,
        local_path,
    )

    if not local_path.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                f"[STUB] Local sample file not found: '{local_path}'. "
                f"Drop the file into ai-service/sample_docs/{filename} to test locally, "
                f"or wait for Shalvi's S3 credentials."
            ),
        )
    return local_path


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post(
    "/extract",
    response_model=ExtractResponse,
    summary="Extract, chunk, and embed a document (internal use by BullMQ worker)",
    description=(
        "Internal endpoint called by Shalvi's BullMQ upload worker. "
        "Accepts `{doc_id, s3_key}`, runs the full pipeline: "
        "S3 fetch → text extraction (PyMuPDF or OpenCV+Tesseract) → "
        "LangChain chunking → OpenAI embedding → Pinecone upsert. "
        "S3 fetch, embedding, and Pinecone calls are **stubbed** pending API keys/config. "
        "Returns correctly-shaped JSON so the BullMQ integration is not blocked."
    ),
)
async def extract_document(request: ExtractRequest) -> ExtractResponse:
    """
    POST /internal/extract

    Full upload pipeline. See module docstring for request/response contract.
    """
    doc_id = request.doc_id
    s3_key = request.s3_key
    logger.info("POST /internal/extract — doc_id='%s' s3_key='%s'", doc_id, s3_key)

    # ------------------------------------------------------------------
    # Step 1 — Fetch document bytes (STUBBED — local fallback)
    # ------------------------------------------------------------------
    # TODO: BLOCKED on Shalvi's S3 config — _stub_fetch_from_s3 reads from sample_docs/
    try:
        local_file: Path = resolve_document_file(s3_key)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("S3 fetch failed for doc_id='%s'", doc_id)
        raise HTTPException(status_code=500, detail=f"S3 fetch error: {exc}") from exc

    suffix = local_file.suffix.lower()

    # ------------------------------------------------------------------
    # Step 2 — Extract text
    # ------------------------------------------------------------------
    pipeline_used: str
    page_count: Optional[int] = None
    full_text: str = ""

    image_extensions = {".jpg", ".jpeg", ".png", ".tiff", ".tif", ".bmp", ".webp"}

    try:
        if suffix == ".pdf":
            # Heuristic: check if the PDF is digital or scanned
            if is_scanned_pdf(str(local_file)):
                # Scanned PDF → rasterise pages and run OCR pipeline
                logger.info("Scanned PDF detected; routing through OCR pipeline.")
                ocr_result = extract_text_from_scanned_pdf(str(local_file))
                full_text = ocr_result["full_text"]
                pipeline_used = "ocr"
                page_count = ocr_result["page_count"]
            else:
                # Digital PDF — direct PyMuPDF extraction
                result = extract_text_from_pdf(str(local_file))
                full_text = result["full_text"]
                page_count = result["page_count"]
                pipeline_used = "pdf"

        elif suffix in image_extensions:
            # Raw scanned image (JPEG, PNG, etc.)
            ocr_result = preprocess_and_ocr(str(local_file))
            full_text = ocr_result["text"]
            pipeline_used = "ocr"

        elif suffix in {".txt", ".text", ".md", ".doc", ".docx", ".rtf", ".json"}:
            logger.info("Text/Document file detected; reading directly.")
            try:
                full_text = local_file.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                full_text = local_file.read_bytes().decode("utf-8", errors="ignore")
            pipeline_used = "text"

        else:
            # Fallback for any unknown format
            logger.info("Generic file format '%s'; attempting fallback text reading.", suffix)
            try:
                full_text = local_file.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                full_text = local_file.read_bytes().decode("utf-8", errors="ignore")
            pipeline_used = "text"

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Text extraction failed for doc_id='%s'", doc_id)
        raise HTTPException(status_code=500, detail=f"Extraction error: {exc}") from exc

    logger.info(
        "Extraction done: pipeline='%s', page_count=%s, chars=%d",
        pipeline_used,
        page_count,
        len(full_text),
    )

    # ------------------------------------------------------------------
    # Step 2.5 — Week 11: Language Detection + Translation
    # ------------------------------------------------------------------
    original_language = "en"
    translation_used = False
    original_text_excerpt = None
    text_for_pipeline = full_text  # Default: use extracted text as-is

    try:
        lang_result = detect_language(full_text)
        original_language = lang_result["language_code"]
        lang_confidence = lang_result["confidence"]

        if lang_result.get("warning"):
            logger.warning(
                "Language detection warning for doc_id='%s': %s",
                doc_id,
                lang_result["warning"],
            )

        logger.info(
            "Language detected for doc_id='%s': code='%s' confidence=%.4f",
            doc_id,
            original_language,
            lang_confidence,
        )

        if original_language != "en":
            # Save excerpt of original text before translation
            original_text_excerpt = full_text[:500]

            # Translate to English
            translation_result = translate_to_english(full_text, original_language)
            if translation_result["translation_used"]:
                text_for_pipeline = translation_result["translated_text"]
                translation_used = True
                logger.info(
                    "Translation to English complete for doc_id='%s': "
                    "%d→%d chars, model='%s'",
                    doc_id,
                    translation_result["total_chars_original"],
                    translation_result["total_chars_translated"],
                    translation_result["model_used"],
                )
            else:
                logger.warning(
                    "Translation skipped for doc_id='%s' (lang='%s'): "
                    "no translation model available.",
                    doc_id,
                    original_language,
                )
    except Exception as exc:
        logger.warning(
            "Language detection/translation failed for doc_id='%s': %s. "
            "Proceeding with original text.",
            doc_id,
            exc,
        )

    # ------------------------------------------------------------------
    # Step 3 — Chunk (using translated text if applicable)
    # ------------------------------------------------------------------
    try:
        chunks = chunk_text(text_for_pipeline, doc_id=doc_id)
        stats = chunk_stats(chunks)
    except Exception as exc:
        logger.exception("Chunking failed for doc_id='%s'", doc_id)
        raise HTTPException(status_code=500, detail=f"Chunking error: {exc}") from exc

    logger.info("Chunking done: %d chunks for doc_id='%s'", len(chunks), doc_id)

    # ------------------------------------------------------------------
    # Step 4 — Embed + Upsert (STUBBED)
    # ------------------------------------------------------------------
    # TODO: BLOCKED on Week 1 keys (OPENAI_API_KEY / PINECONE_API_KEY) — stubs active
    try:
        embed_result = embed_and_upsert(doc_id=doc_id, chunks=chunks)
    except Exception as exc:
        logger.exception("Embed/upsert failed for doc_id='%s'", doc_id)
        raise HTTPException(status_code=500, detail=f"Embed/upsert error: {exc}") from exc

    # ------------------------------------------------------------------
    # Build response
    # ------------------------------------------------------------------
    return ExtractResponse(
        status="ok",
        doc_id=doc_id,
        pipeline=pipeline_used,
        page_count=page_count,
        chunk_stats=ChunkStatsModel(**stats),
        embed_upsert=EmbedUpsertModel(**embed_result),
        stubs_active=StubsActiveModel(
            s3_fetch=True,          # always True until Shalvi's creds added
            embeddings=True,        # True until OPENAI_API_KEY set
            pinecone_upsert=True,   # True until PINECONE_API_KEY set
        ),
        # Week 11: Multi-language support fields
        original_language=original_language,
        translation_used=translation_used,
        original_text_excerpt=original_text_excerpt,
    )
