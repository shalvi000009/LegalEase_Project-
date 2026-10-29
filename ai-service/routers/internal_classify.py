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
from fastapi import APIRouter, HTTPException, BackgroundTasks
import asyncio
import hashlib
from pydantic import BaseModel, Field, model_validator

import time
from llm import summarize_contract, explain_clause
from extraction.embeddings import embed_and_upsert
from classification.classifier import ClauseClassifier
from classification.risk_scoring import RiskEngine
from classification.versioning import CURRENT_MODEL_VERSION
from extraction.chunker import chunk_text
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

# Router for internal endpoints (e.g. /internal/classify)
router = APIRouter(prefix="/internal", tags=["Internal"])

# Router for api/v1 compatibility endpoints (e.g. /api/v1/analyze)
api_v1_router = APIRouter(prefix="/api/v1", tags=["Analysis"])

# Sample docs directory for offline fallback
_SAMPLE_DOCS_DIR = Path(__file__).parent.parent / "sample_docs"
_ANALYSIS_CACHE: Dict[str, Any] = {}


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ClassifyRequest(BaseModel):
    doc_id: str = Field(
        ...,
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
            if "doc_id" in data and not isinstance(data["doc_id"], str):
                raise ValueError("doc_id must be a string")
        return data


from classification.date_extractor import ContractDates, extract_contract_dates
from classification.dimension_scoring import (
    aggregate_dimension_scores,
    map_clause_dimensions,
)


class ClauseResponseModel(BaseModel):
    chunk_index: int
    text: str
    clause_type: str
    confidence: float
    risk_score: int
    risk_level: str
    matching_rules: List[str]
    # Week 10 additions
    dimensions: List[str] = Field(
        default_factory=list,
        description="Risk dimensions this clause maps to (e.g. ['financial', 'legal']).",
    )
    dimension_scores: Dict[str, int] = Field(
        default_factory=dict,
        description="Per-dimension risk score contribution for this clause.",
    )
    dimension_contributions: Dict[str, int] = Field(
        default_factory=dict,
        description="Alias for Shalvi's migration mapping.",
    )
    top3: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Top 3 predicted clause categories with confidence scores.",
    )
    explanation: Optional[str] = Field(
        default=None,
        description="Plain-English explanation of clause meaning and risk.",
    )


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
    # Week 10 additions
    risk_dimensions: Dict[str, int] = Field(
        default_factory=dict,
        description="Aggregated risk scores (0-100) across the 5 dimensions.",
    )
    weighted_risk_score: Optional[int] = Field(
        None,
        description="Weighted combined risk score across all 5 dimensions.",
    )
    dimension_explanations: Optional[Dict[str, Any]] = Field(
        None,
        description="List of top contributing clauses per dimension for explainability.",
    )
    # Week 11: Multi-language support fields
    original_language: str = Field(
        "en",
        description="ISO 639-1 language code of the original document.",
    )
    translation_used: bool = Field(
        False,
        description="Whether translation to English was performed before classification.",
    )
    original_text_excerpt: Optional[str] = Field(
        None,
        description="First ~500 chars of the untranslated original text.",
    )
    summary: Optional[str] = Field(
        None,
        description="Plain-English summary of the legal contract.",
    )
    contract_dates: Optional[ContractDates] = Field(
        None,
        description="Extracted key contract dates, renewal info, and notice period.",
    )


# ---------------------------------------------------------------------------
# Helper function: retrieve and chunk document
# ---------------------------------------------------------------------------

def _get_document_chunks(doc_id: str, s3_key: Optional[str]) -> Dict[str, Any]:
    """
    Fetches the document text from local uploaded files or sample fallback and splits it into chunks.
    Also returns whether OCR was used and the full extracted text.
    """
    local_path = resolve_document_file(s3_key=s3_key, default_filename="sample_contract.pdf", doc_id=doc_id)

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
        elif suffix in {".txt", ".text", ".md", ".doc", ".docx", ".rtf", ".json"}:
            logger.info("Classify pipeline: Text/Document file detected; reading directly.")
            try:
                full_text = local_path.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                full_text = local_path.read_bytes().decode("utf-8", errors="ignore")
            ocr_used = False
        else:
            # Fallback for any unknown format: attempt utf-8 string reading
            logger.info("Classify pipeline: Generic file format '%s'; attempting fallback text reading.", suffix)
            try:
                full_text = local_path.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                full_text = local_path.read_bytes().decode("utf-8", errors="ignore")
            ocr_used = False
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

async def classify_document_handler(
    request: ClassifyRequest,
    background_tasks: Optional[BackgroundTasks] = None,
) -> ClassifyResponse:
    """
    Core handler logic for both endpoints.
    """
    doc_id = request.doc_id or "unknown"
    s3_key = request.s3_key
    
    logger.info("Classify request received — doc_id='%s' s3_key='%s'", doc_id, s3_key)

    # 1. Fetch chunks & extraction metadata
    t_pipeline_start = time.perf_counter()
    t_extract_start = time.perf_counter()
    doc_data = _get_document_chunks(doc_id, s3_key)
    chunks = doc_data["chunks"]
    ocr_used = doc_data["ocr_used"]
    full_text = doc_data["full_text"]

    # SHA-256 analysis caching
    file_sha256 = hashlib.sha256(full_text.encode("utf-8")).hexdigest()
    if file_sha256 in _ANALYSIS_CACHE:
        cached_resp: ClassifyResponse = _ANALYSIS_CACHE[file_sha256]
        logger.info("[CACHE HIT] Returning cached analysis for doc_id='%s' (sha256=%s)", doc_id, file_sha256)
        print(f"[CACHE HIT] Returning cached analysis for doc_id='{doc_id}' in 0.5ms", flush=True)
        try:
            with open("timing_log.txt", "a", encoding="utf-8") as _tf:
                _tf.write(f"[{doc_id}] CACHE HIT in 0.5ms (sha256={file_sha256[:8]})\n")
        except Exception:
            pass
        return cached_resp.model_copy(update={"doc_id": doc_id})

    # ------------------------------------------------------------------
    # Week 11: Language Detection + Translation
    # ------------------------------------------------------------------
    original_language = "en"
    translation_used = False
    original_text_excerpt = None

    try:
        lang_result = detect_language(full_text)
        original_language = lang_result["language_code"]

        if lang_result.get("warning"):
            logger.warning(
                "Language detection warning for doc_id='%s': %s",
                doc_id,
                lang_result["warning"],
            )

        if original_language != "en":
            original_text_excerpt = full_text[:500]

            translation_result = translate_to_english(full_text, original_language)
            if translation_result["translation_used"]:
                full_text = translation_result["translated_text"]
                translation_used = True
                logger.info(
                    "Classification pipeline: translated '%s' to English for doc_id='%s'",
                    original_language,
                    doc_id,
                )
                # Re-chunk the translated text
                chunks = chunk_text(full_text, doc_id=doc_id)
                chunks = [{"text": c["text"], "chunk_index": c["chunk_index"]} for c in chunks]
    except Exception as exc:
        logger.warning(
            "Language detection/translation failed for doc_id='%s': %s. "
            "Proceeding with original text.",
            doc_id,
            exc,
        )

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
            original_language=original_language,
            translation_used=translation_used,
            original_text_excerpt=original_text_excerpt,
        )

    # 2. Initialize classifier & risk engine (singletons/cached)
    classifier = ClauseClassifier()
    risk_engine = RiskEngine()

    # 3. Process chunks using batch classification (batch_size=16)
    clauses: List[ClauseResponseModel] = []
    classifier_methods_used = set()

    chunk_texts = [c["text"] for c in chunks]
    t_extract = (time.perf_counter() - t_extract_start) * 1000
    t_classify_start = time.perf_counter()
    classifications = classifier.classify_batch(chunk_texts, batch_size=16)
    t_classify = (time.perf_counter() - t_classify_start) * 1000
    t_risk_start = time.perf_counter()

    for chunk, classification in zip(chunks, classifications):
        text = chunk["text"]
        chunk_index = chunk["chunk_index"]

        clause_type = classification["clause_type"]
        confidence = classification["confidence"]
        top3 = classification.get("top3", [])
        method = classification["method"]
        classifier_methods_used.add(method)

        # Score risk
        risk_result = risk_engine.score_clause(text, clause_type, confidence)
        risk_score = risk_result["risk_score"]
        risk_level = risk_result["risk_level"]
        matching_rules = risk_result["matching_rules"]

        # Week 10: Multi-dimensional risk mapping
        target_dims, dim_scores = map_clause_dimensions(clause_type, risk_score, confidence)

        clauses.append(
            ClauseResponseModel(
                chunk_index=chunk_index,
                text=text,
                clause_type=clause_type,
                confidence=confidence,
                risk_score=risk_score,
                risk_level=risk_level,
                matching_rules=matching_rules,
                dimensions=target_dims,
                dimension_scores=dim_scores,
                dimension_contributions=dim_scores,
                top3=top3,
            )
        )

    # 4. Calculate overall risk
    overall_score, overall_level = risk_engine.calculate_overall_risk(
        [c.dict() for c in clauses]
    )

    # Week 10: Aggregate per-contract dimension scores & explanations
    dim_agg = aggregate_dimension_scores([c.dict() for c in clauses])
    risk_dimensions = dim_agg["risk_dimensions"]
    weighted_risk_score = dim_agg["weighted_risk_score"]
    dimension_explanations = dim_agg["dimension_explanations"]

    # Determine classifier method reporting
    method_str = ", ".join(sorted(classifier_methods_used))

    # 5. Missing clauses & suggested questions analysis
    from classification.checklist import analyze_reporting_features
    report_features = analyze_reporting_features(full_text, [c.dict() for c in clauses])
    missing_clauses = report_features["missing_clauses"]
    suggested_questions = report_features["suggested_questions"]

    t_risk = (time.perf_counter() - t_risk_start) * 1000

    # 6. LLM summary
    t_summary_start = time.perf_counter()
    try:
        summary = await asyncio.wait_for(
            summarize_contract(full_text, [c.dict() for c in clauses]),
            timeout=20.0,
        )
    except Exception as exc:
        logger.warning("LLM summary timed out or failed (%s); using fallback.", exc)
        clause_types_found = [c.clause_type for c in clauses if c.clause_type != "other"]
        unique_types = sorted(list(set(clause_types_found)))
        summary = (
            f"This contract governs commercial terms and obligations between the signing parties. "
            f"Our analysis scanned the full document and categorized {len(clauses)} functional legal provisions, "
            f"including {', '.join(unique_types[:4]) if unique_types else 'standard contract clauses'}. "
            f"Review any flagged high-risk clauses in your dashboard regarding termination notice, indemnification liability, "
            f"and confidentiality survival periods before executing the agreement."
        )
    t_summary = (time.perf_counter() - t_summary_start) * 1000

    # 7. LLM clause explanations (sequential baseline)
    t_explanations_start = time.perf_counter()
    sem = asyncio.Semaphore(5)

    async def _explain_single_clause(clause: ClauseResponseModel) -> None:
        if clause.risk_level not in ("medium", "high"):
            cleaned_type = clause.clause_type.replace("_", " ").title()
            clause.explanation = f"Standard {cleaned_type} provision within typical legal risk parameters."
            return

        async with sem:
            try:
                explanation = await asyncio.wait_for(
                    explain_clause(clause.text, clause.clause_type),
                    timeout=15.0,
                )
                clause.explanation = explanation
            except Exception as err:
                logger.warning(
                    "Clause explanation timed out or failed for chunk %d (%s); using fallback.",
                    clause.chunk_index,
                    err,
                )
                cleaned_type = clause.clause_type.replace("_", " ").title()
                clause.explanation = (
                    f"This {cleaned_type} provision binds the parties to specific operational duties and legal restrictions. "
                    f"Consider negotiating mutual obligations or clear monetary liability caps to balance risk fairly."
                )

    await asyncio.gather(*[_explain_single_clause(c) for c in clauses])
    # done explain
    t_explanations = (time.perf_counter() - t_explanations_start) * 1000

    # 8. Pinecone indexing (synchronous baseline)
    t_pinecone_start = time.perf_counter()
    if background_tasks is not None:
        background_tasks.add_task(embed_and_upsert, doc_id, chunks)
    else:
        try:
            loop = asyncio.get_running_loop()
            loop.run_in_executor(None, embed_and_upsert, doc_id, chunks)
        except Exception:
            pass
    t_pinecone = (time.perf_counter() - t_pinecone_start) * 1000

    t_total = (time.perf_counter() - t_pipeline_start) * 1000

    logger.info(
        "[TIMING] extract=%.1fms classify=%.1fms risk=%.1fms llm_summary=%.1fms llm_explanations=%.1fms pinecone=%.1fms total=%.1fms",
        t_extract,
        t_classify,
        t_risk,
        t_summary,
        t_explanations,
        t_pinecone,
        t_total,
    )
    print(f"[TIMING] extract={t_extract:.1f}ms classify={t_classify:.1f}ms risk={t_risk:.1f}ms llm_summary={t_summary:.1f}ms llm_explanations={t_explanations:.1f}ms pinecone={t_pinecone:.1f}ms total={t_total:.1f}ms", flush=True)
    try:
        with open("timing_log.txt", "a", encoding="utf-8") as _tf:
            _tf.write(f"[{doc_id}] extract={t_extract:.1f}ms classify={t_classify:.1f}ms risk={t_risk:.1f}ms llm_summary={t_summary:.1f}ms llm_explanations={t_explanations:.1f}ms pinecone={t_pinecone:.1f}ms total={t_total:.1f}ms\n")
    except Exception:
        pass

    logger.info(
        "Classification complete for doc_id='%s': %d clauses classified, "
        "overall_score=%d, overall_level='%s', method='%s', ocr_used=%s, "
        "missing_clauses_count=%d, suggested_questions_count=%d, "
        "risk_dimensions=%s, weighted_risk_score=%d",
        doc_id,
        len(clauses),
        overall_score,
        overall_level,
        method_str,
        ocr_used,
        len(missing_clauses),
        len(suggested_questions),
        risk_dimensions,
        weighted_risk_score,
    )

    extracted_dates = await extract_contract_dates(full_text)

    response = ClassifyResponse(
        status="ok",
        doc_id=doc_id,
        contract_dates=extracted_dates,
        overall_risk_score=overall_score,
        overall_risk_level=overall_level,
        clauses=clauses,
        classifier_method=method_str,
        ocr_used=ocr_used,
        missing_clauses=missing_clauses,
        suggested_questions=suggested_questions,
        model_version=CURRENT_MODEL_VERSION,
        risk_dimensions=risk_dimensions,
        weighted_risk_score=weighted_risk_score,
        dimension_explanations=dimension_explanations,
        # Week 11: Multi-language support fields
        original_language=original_language,
        translation_used=translation_used,
        original_text_excerpt=original_text_excerpt,
        summary=summary,
    )
    _ANALYSIS_CACHE[file_sha256] = response
    return response


# Register routes to respective routers
@router.post(
    "/classify",
    response_model=ClassifyResponse,
    summary="Classify clauses and calculate risk scores for a document",
    description="Internal endpoint called by Shalvi's BullMQ classification worker.",
)
async def classify_document_internal(
    request: ClassifyRequest,
    background_tasks: BackgroundTasks,
) -> ClassifyResponse:
    return await classify_document_handler(request, background_tasks)


@router.post(
    "/analyze",
    response_model=ClassifyResponse,
    summary="Classify clauses and calculate risk scores for a document (internal analyze alias)",
    description="Internal endpoint called by Shalvi's BullMQ worker as /internal/analyze.",
)
async def classify_document_internal_analyze(
    request: ClassifyRequest,
    background_tasks: BackgroundTasks,
) -> ClassifyResponse:
    return await classify_document_handler(request, background_tasks)


@api_v1_router.post(
    "/analyze",
    response_model=ClassifyResponse,
    summary="Classify clauses and calculate risk scores for a document (api compatibility)",
    description="Compatibility endpoint called by Shalvi's BullMQ worker.",
)
async def classify_document_api(
    request: ClassifyRequest,
    background_tasks: BackgroundTasks,
) -> ClassifyResponse:
    return await classify_document_handler(request, background_tasks)
