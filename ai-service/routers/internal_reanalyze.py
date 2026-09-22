"""
routers/internal_reanalyze.py
=============================
Week 8 — Deliverables 2 & 3:
POST /internal/reanalyze-batch & POST /internal/check-stale.

Exposes the weekly re-analysis endpoint called by Shalvi's Sunday-2am BullMQ job.
Processes documents in batches of up to 50, throttled by a Token Bucket rate
limiter to control LLM costs, and runs diff detection to flag user notifications.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, model_validator

from classification.diff_detector import detect_analysis_diff
from classification.rate_limiter import TokenBucketRateLimiter
from classification.versioning import (
    CURRENT_MODEL_VERSION,
    check_analysis_staleness,
    is_stale_version,
)
from routers.internal_classify import (
    ClassifyRequest,
    ClassifyResponse,
    classify_document_handler,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal", tags=["Weekly Re-Analysis"])

# Singleton rate limiter instance (default 60 requests/min = 1/sec)
_RATE_LIMITER = TokenBucketRateLimiter(capacity=60.0, refill_rate=1.0)


# ---------------------------------------------------------------------------
# Request / Response Schemas
# ---------------------------------------------------------------------------

class PreviousAnalysisModel(BaseModel):
    """Snapshot of prior analysis for diff computation."""
    overall_risk_score: Optional[int] = Field(None, description="Previous overall contract risk score.")
    model_version: Optional[str] = Field(None, description="Version under which previous analysis was run.")
    clauses: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Previous clause breakdown.")


class ReanalyzeDocumentItem(BaseModel):
    """Document item to be re-analyzed in the batch."""
    document_id: str = Field(..., description="Unique document UUID.")
    doc_id: Optional[str] = Field(None, description="Alias for document_id.")
    s3_key: Optional[str] = Field(None, description="S3/MinIO key or local sample filename.")
    previous_analysis: Optional[PreviousAnalysisModel] = Field(
        None,
        description="Prior analysis data used to detect score shifts and new red flags.",
    )

    @model_validator(mode="before")
    @classmethod
    def populate_doc_id(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "doc_id" in data and "document_id" not in data:
                data["document_id"] = data["doc_id"]
            elif "document_id" in data and "doc_id" not in data:
                data["doc_id"] = data["document_id"]
        return data


class ReanalyzeBatchRequest(BaseModel):
    """Request payload for POST /internal/reanalyze-batch."""
    documents: List[ReanalyzeDocumentItem] = Field(
        ...,
        description="List of documents to re-analyze. Maximum batch size is 50.",
    )
    force_reanalyze: bool = Field(
        False,
        description="If True, re-analyzes even if the document's model_version is current.",
    )
    rate_limit_rpm: Optional[int] = Field(
        60,
        description="Target rate limit in requests per minute (used to configure token bucket).",
    )


class SingleReanalyzeResult(BaseModel):
    document_id: str
    status: str  # 'reanalyzed' | 'skipped_up_to_date' | 'error'
    model_version: str
    diff_detected: bool
    notify_user: bool
    score_delta: int
    new_overall_score: int
    previous_overall_score: Optional[int] = None
    new_red_flags_count: int
    reasons: List[str]
    new_analysis: Optional[ClassifyResponse] = None
    error_message: Optional[str] = None


class ReanalyzeBatchResponse(BaseModel):
    status: str = "ok"
    current_model_version: str
    total_requested: int
    total_processed: int
    total_reanalyzed: int
    total_skipped: int
    total_notifications_triggered: int
    results: List[SingleReanalyzeResult]


# Schemas for POST /internal/check-stale
class CheckStaleItem(BaseModel):
    document_id: str
    model_version: Optional[str] = None


class CheckStaleRequest(BaseModel):
    analyses: List[CheckStaleItem] = Field(
        ...,
        description="List of document analyses with their current model_version.",
    )


class CheckStaleResponse(BaseModel):
    status: str = "ok"
    current_model_version: str
    total_checked: int
    stale_count: int
    up_to_date_count: int
    stale_document_ids: List[str]
    details: List[Dict[str, Any]]


# ---------------------------------------------------------------------------
# Endpoint: POST /internal/reanalyze-batch
# ---------------------------------------------------------------------------

@router.post(
    "/reanalyze-batch",
    response_model=ReanalyzeBatchResponse,
    summary="Batch Re-Analyze Stale Documents (Sunday 2am Job)",
    description=(
        "Called by Shalvi's Sunday 2:00 AM BullMQ re-analysis worker. "
        "Processes up to 50 documents per batch with Token Bucket rate limiting. "
        "Detects score shifts >= 15 points and new red-flag clauses to notify users."
    ),
)
async def reanalyze_batch(request: ReanalyzeBatchRequest) -> ReanalyzeBatchResponse:
    # 1. Enforce batch size limit of 50
    if len(request.documents) > 50:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Batch size {len(request.documents)} exceeds the maximum allowed limit of 50 documents per batch.",
        )

    # 2. Adjust rate limiter if custom RPM provided
    limiter = _RATE_LIMITER
    if request.rate_limit_rpm and request.rate_limit_rpm > 0:
        # 60 RPM = 1.0 tokens/sec
        refill_rate = request.rate_limit_rpm / 60.0
        limiter = TokenBucketRateLimiter(
            capacity=float(request.rate_limit_rpm),
            refill_rate=refill_rate,
        )

    results: List[SingleReanalyzeResult] = []
    reanalyzed_count = 0
    skipped_count = 0
    notifications_count = 0

    for item in request.documents:
        doc_id = item.document_id
        prev_data = item.previous_analysis.dict() if item.previous_analysis else None
        prev_version = prev_data.get("model_version") if prev_data else None

        # Check if re-analysis is needed (unless force_reanalyze is enabled)
        if not request.force_reanalyze and not is_stale_version(prev_version, CURRENT_MODEL_VERSION):
            prev_score = prev_data.get("overall_risk_score", 0) if prev_data else 0
            results.append(
                SingleReanalyzeResult(
                    document_id=doc_id,
                    status="skipped_up_to_date",
                    model_version=prev_version or CURRENT_MODEL_VERSION,
                    diff_detected=False,
                    notify_user=False,
                    score_delta=0,
                    new_overall_score=prev_score,
                    previous_overall_score=prev_score,
                    new_red_flags_count=0,
                    reasons=[f"Document analysis is already on current model version '{CURRENT_MODEL_VERSION}'."],
                )
            )
            skipped_count += 1
            continue

        # Acquire token bucket permission (throttles to protect API quotas/costs)
        await limiter.acquire_async(tokens=1.0)

        # Run fresh analysis via standard pipeline
        try:
            classify_req = ClassifyRequest(doc_id=doc_id, s3_key=item.s3_key)
            new_analysis: ClassifyResponse = await classify_document_handler(classify_req)

            # Evaluate diff against prior analysis
            diff_res = detect_analysis_diff(
                previous_analysis=prev_data,
                new_analysis=new_analysis.dict(),
            )

            if diff_res.notify_user:
                notifications_count += 1

            results.append(
                SingleReanalyzeResult(
                    document_id=doc_id,
                    status="reanalyzed",
                    model_version=CURRENT_MODEL_VERSION,
                    diff_detected=diff_res.diff_detected,
                    notify_user=diff_res.notify_user,
                    score_delta=diff_res.score_delta,
                    new_overall_score=diff_res.new_overall_score,
                    previous_overall_score=diff_res.previous_overall_score,
                    new_red_flags_count=len(diff_res.new_red_flags),
                    reasons=diff_res.reasons,
                    new_analysis=new_analysis,
                )
            )
            reanalyzed_count += 1

        except Exception as exc:
            logger.error("Re-analysis failed for doc_id='%s': %s", doc_id, exc)
            results.append(
                SingleReanalyzeResult(
                    document_id=doc_id,
                    status="error",
                    model_version=CURRENT_MODEL_VERSION,
                    diff_detected=False,
                    notify_user=False,
                    score_delta=0,
                    new_overall_score=0,
                    previous_overall_score=prev_data.get("overall_risk_score") if prev_data else None,
                    new_red_flags_count=0,
                    reasons=[f"Execution failed: {str(exc)}"],
                    error_message=str(exc),
                )
            )

    return ReanalyzeBatchResponse(
        status="ok",
        current_model_version=CURRENT_MODEL_VERSION,
        total_requested=len(request.documents),
        total_processed=len(results),
        total_reanalyzed=reanalyzed_count,
        total_skipped=skipped_count,
        total_notifications_triggered=notifications_count,
        results=results,
    )


# ---------------------------------------------------------------------------
# Endpoint: POST /internal/check-stale
# ---------------------------------------------------------------------------

@router.post(
    "/check-stale",
    response_model=CheckStaleResponse,
    summary="Query Staleness of Document Analyses",
    description="Identifies which document analyses require re-analysis under the current model version.",
)
def check_stale_documents(request: CheckStaleRequest) -> CheckStaleResponse:
    stale_ids: List[str] = []
    details: List[Dict[str, Any]] = []

    for item in request.analyses:
        res = check_analysis_staleness(item.model_version, CURRENT_MODEL_VERSION)
        details.append({
            "document_id": item.document_id,
            "model_version": item.model_version,
            "is_stale": res.is_stale,
            "reason": res.reason,
        })
        if res.is_stale:
            stale_ids.append(item.document_id)

    return CheckStaleResponse(
        status="ok",
        current_model_version=CURRENT_MODEL_VERSION,
        total_checked=len(request.analyses),
        stale_count=len(stale_ids),
        up_to_date_count=len(request.analyses) - len(stale_ids),
        stale_document_ids=stale_ids,
        details=details,
    )
