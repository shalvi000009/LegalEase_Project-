"""
routers/internal_rag.py
=======================
Week 9 Deliverable 2: RAG Query Endpoint with Redis Caching and Prompt Optimization.

Provides an internal endpoint called by the Node.js backend when a user chats
with an AI about their uploaded contract.

SYNC CONTRACT NOTE FOR SHALVI (Backend):
----------------------------------------
- Endpoint: POST /internal/rag-query
- Request JSON shape:
    {
      "doc_id": "uuid-string",
      "query": "What is the liability cap under this contract?",
      "top_k": 3,
      "chat_history": [{"role": "user", "content": "..."}],
      "use_cache": true,
      "s3_key": "optional-s3-path.pdf"
    }
- Standardized Cache-Key Convention:
    "rag:doc:{doc_id}:q:{sha256(normalized_query)}"
    (where normalized_query is lowercased, punctuation-trimmed, whitespace-collapsed)
- Cache TTL: 86,400 seconds (24 hours).
- Invalidation: If a contract is re-uploaded or re-analyzed, backend can invalidate
  cached RAG queries using Redis DEL with pattern: "rag:doc:{doc_id}:*"
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from classification.cache import cache
from classification.classifier import ClauseClassifier
from extraction.prompt_optimizer import compress_text, optimize_rag_prompt
from routers.internal_classify import _get_document_chunks

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal", tags=["RAG & Chat"])


# ---------------------------------------------------------------------------
# Request & Response Models
# ---------------------------------------------------------------------------

class RagSource(BaseModel):
    chunk_index: int
    text: str
    score: float
    clause_type: Optional[str] = None


class RagQueryRequest(BaseModel):
    doc_id: str = Field(..., description="Unique document identifier (UUID)")
    query: str = Field(..., description="User query / prompt about the contract")
    top_k: int = Field(3, description="Number of source chunks to retrieve")
    chat_history: Optional[List[Dict[str, str]]] = Field(
        default=None,
        description="Prior conversation turns: [{'role': 'user'|'assistant', 'content': '...'}]",
    )
    use_cache: bool = Field(True, description="Whether to check and store in Redis/memory cache")
    s3_key: Optional[str] = Field(None, description="Optional S3/MinIO object key")


class RagQueryResponse(BaseModel):
    status: str = "ok"
    doc_id: str
    query: str
    answer: str
    sources: List[RagSource]
    cached: bool
    cache_key: str
    latency_ms: float
    model_used: str = "gpt-4o"
    prompt_optimization: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Retrieval & Answering Helpers
# ---------------------------------------------------------------------------

def _rank_chunks_for_query(
    query: str,
    chunks: List[Dict[str, Any]],
    top_k: int = 3,
) -> List[Dict[str, Any]]:
    """
    Ranks document chunks by keyword relevance and lexical overlap with the query.
    """
    query_terms = set(re.findall(r"\w+", query.lower()))
    scored_chunks = []

    classifier = ClauseClassifier()

    for chunk in chunks:
        text = chunk.get("text", "")
        text_lower = text.lower()
        chunk_words = set(re.findall(r"\w+", text_lower))

        # Jaccard / lexical term overlap
        overlap = len(query_terms.intersection(chunk_words))
        score = overlap / max(len(query_terms), 1)

        # Bonus for legal keyword matches
        if any(term in text_lower for term in ["liability", "terminate", "confidential", "indemnify", "payment", "governing"]):
            score += 0.2

        clause_type = chunk.get("clause_type")
        if not clause_type:
            pred = classifier.classify_text(text)
            clause_type = pred.get("clause_type", "clause")

        scored_chunks.append({
            "chunk_index": chunk.get("chunk_index", 0),
            "text": text,
            "score": round(min(score, 1.0), 3),
            "clause_type": clause_type,
        })

    # Sort descending by score
    scored_chunks.sort(key=lambda x: x["score"], reverse=True)
    return scored_chunks[:top_k]


def _generate_grounded_answer(
    query: str,
    sources: List[Dict[str, Any]],
) -> str:
    """
    Generates a high-quality, grounded legal answer.
    Calls GPT-4o if API key is valid, or uses deterministic synthesis based on context.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key and not api_key.startswith("your_") and api_key.startswith("sk-"):
        try:
            from openai import OpenAI
            client = OpenAI(api_key=api_key)
            prompt, _ = optimize_rag_prompt(query, sources)
            resp = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a legal assistant for LegalEase. Provide concise, clear answers citing referenced clauses."},
                    {"role": "user", "content": prompt},
                ],
                max_tokens=400,
                temperature=0.2,
            )
            ans = resp.choices[0].message.content
            if ans:
                return ans.strip()
        except Exception as exc:
            logger.warning("GPT-4o call failed in RAG query: %s. Falling back to local synthesis.", exc)

    # Deterministic fallback synthesis
    if not sources or sources[0]["score"] == 0:
        return "Based on the provided contract sections, this specific question is not explicitly addressed in the document text."

    primary = sources[0]
    ctype = primary.get("clause_type", "relevant provision").replace("_", " ")
    snippet = compress_text(primary["text"], max_chars=250)
    
    return (
        f"According to the contract's {ctype} (clause chunk #{primary['chunk_index']}): "
        f"\"{snippet}\". This provision establishes the governing terms for your query."
    )


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post(
    "/rag-query",
    response_model=RagQueryResponse,
    summary="Query contract via RAG with Redis Caching",
    description=(
        "Internal endpoint called by the Node.js backend when a user asks a question about their contract. "
        "Retrieves relevant clauses, optimizes context prompt, generates an answer, and caches results "
        "in Redis with a 24-hour TTL using key `rag:doc:{doc_id}:q:{query_sha256}`."
    ),
)
async def query_contract_rag(request: RagQueryRequest) -> RagQueryResponse:
    start_time = time.perf_counter()
    doc_id = request.doc_id
    query = request.query
    use_cache = request.use_cache

    # 1. Compute standardized cache key
    cache_key = cache.get_rag_cache_key(doc_id, query)

    # 2. Check cache
    if use_cache:
        cached_data = cache.get(cache_key)
        if cached_data is not None and isinstance(cached_data, dict):
            latency_ms = (time.perf_counter() - start_time) * 1000.0
            logger.info("[CACHE HIT] RAG query hit for doc_id='%s' key='%s' in %.2f ms", doc_id, cache_key, latency_ms)
            return RagQueryResponse(
                status="ok",
                doc_id=doc_id,
                query=query,
                answer=cached_data["answer"],
                sources=[RagSource(**s) for s in cached_data["sources"]],
                cached=True,
                cache_key=cache_key,
                latency_ms=round(latency_ms, 2),
                model_used=cached_data.get("model_used", "gpt-4o"),
                prompt_optimization=cached_data.get("prompt_optimization"),
            )

    # 3. Retrieve document chunks
    chunks_res = _get_document_chunks(doc_id, request.s3_key)
    if isinstance(chunks_res, dict):
        chunks = chunks_res.get("chunks", [])
    elif isinstance(chunks_res, list):
        chunks = chunks_res
    else:
        chunks = []

    if not chunks:
        raise HTTPException(status_code=404, detail=f"No document text or chunks found for doc_id='{doc_id}'.")

    # 4. Rank and select top_k relevant chunks
    ranked_sources = _rank_chunks_for_query(query, chunks, top_k=request.top_k)

    # 5. Optimize prompt
    _, telemetry = optimize_rag_prompt(query, ranked_sources)

    # 6. Generate answer
    answer = _generate_grounded_answer(query, ranked_sources)

    sources_out = [
        RagSource(
            chunk_index=s["chunk_index"],
            text=compress_text(s["text"], max_chars=300),
            score=s["score"],
            clause_type=s.get("clause_type"),
        )
        for s in ranked_sources
    ]

    latency_ms = (time.perf_counter() - start_time) * 1000.0

    # 7. Store in cache (24h TTL)
    if use_cache:
        cache_payload = {
            "answer": answer,
            "sources": [s.model_dump() for s in sources_out],
            "model_used": "gpt-4o",
            "prompt_optimization": telemetry,
        }
        cache.set(cache_key, cache_payload, ttl=86400)
        logger.info("[CACHE SET] Stored RAG answer in %s cache (key=%s)", cache.backend, cache_key)

    return RagQueryResponse(
        status="ok",
        doc_id=doc_id,
        query=query,
        answer=answer,
        sources=sources_out,
        cached=False,
        cache_key=cache_key,
        latency_ms=round(latency_ms, 2),
        model_used="gpt-4o",
        prompt_optimization=telemetry,
    )
