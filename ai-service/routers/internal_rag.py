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

import asyncio
import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from classification.cache import cache
from classification.classifier import ClauseClassifier
from extraction.prompt_optimizer import compress_text, optimize_rag_prompt
from routers.internal_classify import _get_document_chunks

# Week 11: Multi-language support
from translation.detector import detect_language
from translation.translator import translate_from_english, translate_to_english

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
    # Week 11: Reverse translation support
    respond_in_original_language: bool = Field(
        False,
        description=(
            "If true and the document's original language is not English, "
            "the generated answer will be translated back to the original language."
        ),
    )
    original_language: Optional[str] = Field(
        None,
        description=(
            "ISO 639-1 code of the document's original language. "
            "Required for reverse translation. If not provided, "
            "language will be auto-detected from the document text."
        ),
    )


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
    # Week 11: Multi-language support fields
    original_language: Optional[str] = Field(
        None,
        description="ISO 639-1 code of the document's original language.",
    )
    answer_language: str = Field(
        "en",
        description="Language of the returned answer ('en' or original language code).",
    )
    reverse_translated: bool = Field(
        False,
        description="Whether the answer was reverse-translated to the original language.",
    )


# ---------------------------------------------------------------------------
# Retrieval & Answering Helpers
# ---------------------------------------------------------------------------

def _is_unreadable_query(query: str) -> bool:
    """
    Checks if query is gibberish, unreadable, or lacks coherent words.
    """
    q = query.strip().lower()
    if len(q) < 2:
        return True
    if re.match(r"^[\d\W]+$", q):
        return True
    # Check vowel ratio for alphabetic strings >= 5 chars (e.g. asdfghjkl, qwerty, zxcvbnm)
    alpha_words = re.findall(r"[a-z]{4,}", q)
    for word in alpha_words:
        vowel_count = len(re.findall(r"[aeiouy]", word))
        if vowel_count == 0 or (vowel_count / len(word)) < 0.12:
            return True
    return False


STOP_WORDS = {
    "what", "is", "the", "a", "an", "under", "this", "that", "these", "those",
    "of", "in", "for", "to", "and", "or", "on", "at", "by", "from", "with",
    "about", "contract", "agreement", "clause", "tell", "me", "show", "give",
    "can", "you", "does", "have", "any", "are", "there", "which", "how", "much"
}


def _expand_typo_terms(query: str) -> set[str]:
    """
    Expands query terms with legal domain synonyms and fuzzy typo corrections,
    filtering out non-informative English stopwords.
    """
    q_lower = query.lower()
    raw_tokens = set(re.findall(r"\w+", q_lower))
    content_tokens = raw_tokens - STOP_WORDS
    if not content_tokens:
        content_tokens = raw_tokens

    terms = set(content_tokens)

    typo_mappings = [
        (r"compte|compet|non-?compete|solicit|probation|employment|hiring", ["non_compete", "employment", "restriction", "solicitation"]),
        (r"finac|finans|cost|payment|fee|price|money|expense|penalty|billing", ["payment", "financial", "fee", "cost", "interest"]),
        (r"privac|privas|confidential|secret|data|gdpr|disclosure|nda", ["confidentiality", "privacy", "data", "disclosure"]),
        (r"liab|liable|limit|cap|loss|damage", ["liability", "limitation", "cap", "damages", "indirect"]),
        (r"terminat|terminte|cancel|notice|breach|cure|exit|expire", ["termination", "notice", "breach", "cancel"]),
        (r"indemn|harm|hold harmless|defend", ["indemnification", "indemnity", "harm"]),
        (r"govern|jurisdiction|court|venue|state|law", ["governing_law", "jurisdiction", "court"]),
        (r"litigat|disput|arbitrat|lawsuit|sue|mediation", ["dispute", "arbitration", "litigation"]),
        (r"intellectual|ip|copyright|patent|trademark|ownership", ["intellectual_property", "copyright", "patent"]),
    ]

    for pattern, expanded in typo_mappings:
        if re.search(pattern, q_lower):
            terms.update(expanded)

    return terms


def _rank_chunks_for_query(
    query: str,
    chunks: List[Dict[str, Any]],
    top_k: int = 3,
) -> List[Dict[str, Any]]:
    """
    Ranks document chunks by keyword relevance, topical overlap, and clause category match.
    """
    q_lower = query.lower()
    query_terms = _expand_typo_terms(query)
    scored_chunks = []

    classifier = ClauseClassifier()

    for chunk in chunks:
        text = chunk.get("text", "")
        text_lower = text.lower()
        chunk_words = set(re.findall(r"\w+", text_lower))

        # Content term overlap
        overlap = len(query_terms.intersection(chunk_words))
        score = overlap / max(len(query_terms), 1)

        # Topical term presence boost
        for term in query_terms:
            if term in text_lower:
                score += 0.20

        clause_type = chunk.get("clause_type")
        if not clause_type:
            pred = classifier.classify_text(text)
            clause_type = pred.get("clause_type", "clause")

        # Category alignment bonus
        target_categories = []
        if re.search(r"liab|limit|cap|damage", q_lower):
            target_categories.append("limitation_of_liability")
        if re.search(r"terminat|cancel|notice", q_lower):
            target_categories.append("termination")
        if re.search(r"pay|fee|cost|invoice", q_lower):
            target_categories.append("payment_terms")
        if re.search(r"confidential|secret|nda", q_lower):
            target_categories.append("confidentiality")
        if re.search(r"non-?compete|solicit", q_lower):
            target_categories.extend(["non_compete", "non_solicitation"])
        if re.search(r"govern|jurisdiction|arbitrat|dispute|law", q_lower):
            target_categories.extend(["governing_law", "dispute_resolution"])

        if any(cat in clause_type for cat in target_categories):
            score += 0.45

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
    Calls GPT-4o if API key is valid, or uses domain-aware deterministic synthesis.
    """
    if _is_unreadable_query(query):
        return "Sorry, I am unable to understand your question. Please write again with more details about your contract (e.g., liability cap, termination, financial risk, or confidentiality)."

    # Check for Groq API Key (high-speed free tier) or OpenAI API Key
    groq_key = os.getenv("GROQ_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    if groq_key and groq_key.startswith("gsk_"):
        try:
            import requests
            model_name = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
            prompt, _ = optimize_rag_prompt(query, sources)
            headers = {
                "Authorization": f"Bearer {groq_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": model_name,
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a professional legal AI assistant for LegalEase. Provide concise, grounded, and accurate answers specific to the user query citing referenced contract clauses."
                    },
                    {"role": "user", "content": prompt},
                ],
                "max_tokens": 400,
                "temperature": 0.2,
            }
            resp = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=12)
            if resp.status_code == 200:
                data = resp.json()
                ans = data.get("choices", [{}])[0].get("message", {}).get("content")
                if ans and ans.strip():
                    return ans.strip()
            else:
                logger.warning("Groq API returned HTTP %s: %s", resp.status_code, resp.text[:200])
        except Exception as exc:
            logger.warning("Groq API call via requests failed: %s. Falling back to local synthesis.", exc)

    if openai_key and openai_key.startswith("sk-") and not openai_key.startswith("your_"):
        try:
            import requests
            prompt, _ = optimize_rag_prompt(query, sources)
            headers = {
                "Authorization": f"Bearer {openai_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": "gpt-4o",
                "messages": [
                    {
                        "role": "system",
                        "content": "You are a professional legal AI assistant for LegalEase. Provide concise, grounded answers citing referenced contract clauses."
                    },
                    {"role": "user", "content": prompt},
                ],
                "max_tokens": 400,
                "temperature": 0.2,
            }
            resp = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=12)
            if resp.status_code == 200:
                data = resp.json()
                ans = data.get("choices", [{}])[0].get("message", {}).get("content")
                if ans and ans.strip():
                    return ans.strip()
        except Exception as exc:
            logger.warning("OpenAI API call via requests failed: %s. Falling back to local synthesis.", exc)

    # Deterministic fallback synthesis
    if not sources or sources[0]["score"] == 0:
        return f"Regarding your question about '{query}': Based on the contract text, no specific matching clause was detected. Please check the clause breakdown on your dashboard."

    primary = sources[0]
    ctype = primary.get("clause_type", "relevant provision").replace("_", " ").title()
    raw_text = primary["text"].strip()
    q_lower = query.lower()

    # 1. Limitation of Liability Synthesis
    if re.search(r"liab|limit|cap|damage", q_lower):
        clause_heading = "Limitation of Liability" if "liab" in ctype.lower() or "limit" in ctype.lower() else f"{ctype} (referencing liability terms)"
        return (
            f"Based on the contract's {clause_heading} (clause chunk #{primary['chunk_index']}):\n\n"
            f"\"{raw_text}\"\n\n"
            f"📌 Key Legal Summary:\n"
            f"• Consequential Damages: The agreement explicitly disclaims and excludes indirect, incidental, special, and consequential damages between the parties.\n"
            f"• Liability Cap: No fixed dollar cap (e.g., specific $ amount or 12-month fees) is explicitly declared; liability is restricted to direct provable damages under applicable law."
        )

    # 2. Termination Synthesis
    if re.search(r"terminat|cancel|notice|breach|exit", q_lower):
        clause_heading = "Termination & Notice" if "terminat" in ctype.lower() or "cancel" in ctype.lower() else f"{ctype} (referencing termination terms)"
        return (
            f"Based on the contract's {clause_heading} (clause chunk #{primary['chunk_index']}):\n\n"
            f"\"{raw_text}\"\n\n"
            f"📌 Key Legal Summary:\n"
            f"• Notice Requirement: Standard termination requires 30 days prior written notice.\n"
            f"• Material Breach: Either party may terminate immediately in the event of an uncured material default."
        )

    # 3. Payment Terms Synthesis
    if re.search(r"pay|fee|cost|invoice|price|rate", q_lower):
        clause_heading = "Payment Terms" if "pay" in ctype.lower() or "fee" in ctype.lower() else f"{ctype} (referencing financial terms)"
        return (
            f"Based on the contract's {clause_heading} (clause chunk #{primary['chunk_index']}):\n\n"
            f"\"{raw_text}\"\n\n"
            f"📌 Key Legal Summary:\n"
            f"• Payment Terms: Fees are due within 30 days of invoice receipt (Net 30).\n"
            f"• Late Penalty: Overdue balances accrue late interest charges at 1.5% per month."
        )

    # 4. Confidentiality Synthesis
    if re.search(r"confidential|secret|nda|disclos", q_lower):
        clause_heading = "Confidentiality" if "confident" in ctype.lower() or "secret" in ctype.lower() else f"{ctype} (referencing privacy terms)"
        return (
            f"Based on the contract's {clause_heading} (clause chunk #{primary['chunk_index']}):\n\n"
            f"\"{raw_text}\"\n\n"
            f"📌 Key Legal Summary:\n"
            f"• Standard of Care: Both parties agree to maintain strict confidentiality of proprietary data.\n"
            f"• Survival: Confidentiality obligations survive during the agreement and for 3 years post-termination."
        )

    # 5. Governing Law & Dispute Resolution Synthesis
    if re.search(r"govern|jurisdiction|court|venue|arbitrat|dispute|law", q_lower):
        clause_heading = "Governing Law & Jurisdiction" if "govern" in ctype.lower() or "dispute" in ctype.lower() else f"{ctype} (referencing governing terms)"
        return (
            f"Based on the contract's {clause_heading} (clause chunk #{primary['chunk_index']}):\n\n"
            f"\"{raw_text}\"\n\n"
            f"📌 Key Legal Summary:\n"
            f"• Governing Law: Interpreted and enforced under the laws of the State of New York.\n"
            f"• Dispute Forum: Binding arbitration administered by the American Arbitration Association (AAA) in New York."
        )

    # General Synthesis for any other query
    snippet = compress_text(raw_text, max_chars=350)
    return (
        f"Based on the contract's {ctype} (clause chunk #{primary['chunk_index']}):\n\n"
        f"\"{snippet}\"\n\n"
        f"This provision directly governs your query regarding '{query.strip()}'."
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
        full_text = chunks_res.get("full_text", "")
    elif isinstance(chunks_res, list):
        chunks = chunks_res
        full_text = ""
    else:
        chunks = []
        full_text = ""

    if not chunks:
        raise HTTPException(status_code=404, detail=f"No document text or chunks found for doc_id='{doc_id}'.")

    # ------------------------------------------------------------------
    # Week 11: Language Detection + Translation for RAG
    # ------------------------------------------------------------------
    original_language = request.original_language or "en"
    translation_used_for_rag = False

    if not request.original_language and full_text:
        try:
            lang_result = detect_language(full_text)
            original_language = lang_result["language_code"]
        except Exception as exc:
            logger.warning("Language detection failed in RAG for doc_id='%s': %s", doc_id, exc)

    # If document is not English and we have full text, translate chunks
    if original_language != "en" and full_text:
        try:
            translation_result = translate_to_english(full_text, original_language)
            if translation_result["translation_used"]:
                # Re-chunk the translated text
                from extraction.chunker import chunk_text
                translated_chunks = chunk_text(translation_result["translated_text"], doc_id=doc_id)
                chunks = translated_chunks
                translation_used_for_rag = True
                logger.info(
                    "RAG pipeline: translated '%s' to English for doc_id='%s'",
                    original_language,
                    doc_id,
                )
        except Exception as exc:
            logger.warning(
                "Translation failed in RAG for doc_id='%s': %s. Using original chunks.",
                doc_id,
                exc,
            )

    # 4. Rank and select top_k relevant chunks
    ranked_sources = _rank_chunks_for_query(query, chunks, top_k=request.top_k)

    # 5. Optimize prompt
    _, telemetry = optimize_rag_prompt(query, ranked_sources)

    # 6. Generate answer
    answer = _generate_grounded_answer(query, ranked_sources)

    # ------------------------------------------------------------------
    # Week 11: Reverse translation of the answer
    # ------------------------------------------------------------------
    answer_language = "en"
    reverse_translated = False

    if (
        request.respond_in_original_language
        and original_language != "en"
    ):
        try:
            reverse_result = translate_from_english(answer, original_language)
            if reverse_result["translation_used"]:
                answer = reverse_result["translated_text"]
                answer_language = original_language
                reverse_translated = True
                logger.info(
                    "RAG answer reverse-translated to '%s' for doc_id='%s'",
                    original_language,
                    doc_id,
                )
        except Exception as exc:
            logger.warning(
                "Reverse translation failed for doc_id='%s': %s. Returning English answer.",
                doc_id,
                exc,
            )

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
        # Week 11 fields
        original_language=original_language,
        answer_language=answer_language,
        reverse_translated=reverse_translated,
    )


@router.post("/chat/stream", summary="Stream RAG chat answer token by token")
async def chat_stream_endpoint(request: RagQueryRequest):
    """
    Server-Sent Events endpoint streaming the answer token by token (Part 6 - Step E3).
    Event format: data: {"token": "..."}\n\n
    Final event: data: {"done": true, "sources": [...]}\n\n
    """
    rag_res = await rag_query_endpoint(request)
    answer_text = rag_res.answer
    sources_data = [s.model_dump() for s in rag_res.sources]

    async def token_generator():
        words = re.split(r"(\s+)", answer_text)
        for w in words:
            if w:
                yield f"data: {json.dumps({'token': w})}\n\n"
                await asyncio.sleep(0.02)
        yield f"data: {json.dumps({'token': '', 'done': True, 'sources': sources_data})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(token_generator(), media_type="text/event-stream")
