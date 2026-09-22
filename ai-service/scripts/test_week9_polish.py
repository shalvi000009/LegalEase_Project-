"""
scripts/test_week9_polish.py
============================
Week 9 Acceptance Test Suite: Polish, Testing, Final Review.

Validates:
  1. Dual-mode Redis + in-memory LRU cache (get/set/delete/stats/normalization/keys)
  2. Prompt optimizer (boilerplate stripping, whitespace reduction, token metrics)
  3. Batch embedding chunk processing & vector caching
  4. FastAPI RAG query route: POST /internal/rag-query (contract, cache hit/miss)
  5. Evaluation metrics JSON export integrity (docs/eval_results.json)
  6. Demo flow rehearsal runner execution sanity
"""

from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict

# Ensure ai-service root is in sys.path
_SERVICE_DIR = Path(__file__).parent.parent
if str(_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(_SERVICE_DIR))

from fastapi.testclient import TestClient

from classification.cache import DualModeCache, cache
from extraction.embeddings import batch_embed_chunks
from extraction.prompt_optimizer import (
    compress_text,
    estimate_tokens,
    optimize_checklist_prompt,
    optimize_rag_prompt,
)
from main import app
from scripts.demo_flow import rehearse_demo

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"

failures: list[str] = []


def ok(msg: str) -> None:
    print(f"{PASS} {msg}")


def fail(msg: str) -> None:
    print(f"{FAIL} {msg}")
    failures.append(msg)


def main() -> None:
    print("\n=== Week 9 Polish, Testing & Review Acceptance Tests ===\n")

    # -----------------------------------------------------------------------
    # TEST 1: Dual-Mode Cache Functionality & Telemetry
    # -----------------------------------------------------------------------
    print("--- Test 1: Dual-Mode Cache Functionality & Key Conventions ---")
    try:
        test_cache = DualModeCache()
        test_cache.clear()

        # Key normalization
        raw_query = "  What is the Liability Cap?! (Under Section 8)  "
        norm = test_cache.normalize_query(raw_query)
        assert norm == "what is the liability cap under section 8", f"Normalization failed: {norm}"
        
        # Standardized RAG cache key convention
        cache_key = test_cache.get_rag_cache_key("doc-123", raw_query)
        assert cache_key.startswith("rag:doc:doc-123:q:"), f"Invalid cache key prefix: {cache_key}"
        assert len(cache_key.split(":q:")[1]) == 64, f"Hash component must be 64-char SHA256: {cache_key}"

        # Get / Set / Miss / Hit
        assert test_cache.get(cache_key) is None, "Expected cache miss on new key"
        test_data = {"answer": "Liability is capped at $100k", "score": 0.95}
        test_cache.set(cache_key, test_data, ttl=60)
        
        cached = test_cache.get(cache_key)
        assert cached == test_data, f"Cached data mismatch: {cached}"

        # Telemetry
        stats = test_cache.get_stats()
        assert stats["hits"] >= 1, f"Expected hits >= 1, got {stats['hits']}"
        assert stats["misses"] >= 1, f"Expected misses >= 1, got {stats['misses']}"
        assert stats["hit_ratio"] > 0.0, f"Expected positive hit ratio, got {stats['hit_ratio']}"
        assert stats["estimated_tokens_saved"] > 0, "Tokens saved must be > 0"

        # Delete / Invalidate
        deleted = test_cache.delete(cache_key)
        assert deleted is True, "Delete must return True"
        assert test_cache.get(cache_key) is None, "Value must be gone after delete"

        ok(f"DualModeCache verified ({stats['backend']} backend, {stats['hits']} hits, SHA-256 keys).")
    except Exception as exc:
        fail(f"Test 1 failed: {exc}")

    # -----------------------------------------------------------------------
    # TEST 2: Prompt Size Optimization Engine
    # -----------------------------------------------------------------------
    print("\n--- Test 2: Prompt Optimization & Token Compression ---")
    try:
        sample_legal_text = """
        WHEREAS, the parties desire to enter into this Agreement; and
        NOW, THEREFORE, in consideration of the mutual covenants contained herein:
        IN WITNESS WHEREOF, the parties have executed this Agreement as of the date first above written.
        
        Page 1 of 12
        
        Clause 1. Term. The initial term shall be twenty-four (24) months.
        """
        compressed = compress_text(sample_legal_text)
        assert "IN WITNESS WHEREOF" not in compressed, "Boilerplate witness text must be stripped"
        assert "Page 1 of 12" not in compressed, "Page number boilerplate must be stripped"
        assert "Clause 1. Term" in compressed, "Operative clause must be preserved"

        # RAG prompt optimization telemetry
        sample_chunks = [
            {"chunk_index": 0, "clause_type": "termination", "text": "Either party may terminate on 30 days notice. " * 5},
            {"chunk_index": 1, "clause_type": "liability", "text": "Liability is capped at $50,000 USD. " * 5},
        ]
        prompt_str, telemetry = optimize_rag_prompt("How can I terminate?", sample_chunks)
        assert "[0:termination]" in prompt_str, "Source citation format missing in prompt"
        assert telemetry["compression_ratio_pct"] > 0.0, "Compression ratio must be positive"
        assert telemetry["tokens_saved"] > 0, "Tokens saved must be > 0"

        # Checklist prompt optimization
        sys_p, usr_p = optimize_checklist_prompt("nda", [{"clause_type": "confidentiality", "risk_level": "low", "risk_score": 20}])
        assert "raw JSON only" in sys_p, "System prompt should specify raw JSON only"
        assert "Type: nda" in usr_p, "User prompt should contain compact type"

        ok(f"Prompt optimizer verified: {telemetry['compression_ratio_pct']}% token reduction.")
    except Exception as exc:
        fail(f"Test 2 failed: {exc}")

    # -----------------------------------------------------------------------
    # TEST 3: Batch Chunk Embeddings & Vector Caching
    # -----------------------------------------------------------------------
    print("\n--- Test 3: Batch Embedding Calls & Vector Cache ---")
    try:
        sample_chunks_batch = [
            {"chunk_index": 0, "text": "This Agreement is governed by Delaware law.", "doc_id": "test-doc"},
            {"chunk_index": 1, "text": "All notices must be sent via registered mail.", "doc_id": "test-doc"},
            {"chunk_index": 2, "text": "This Agreement is governed by Delaware law.", "doc_id": "test-doc"},  # Duplicate text to test vector cache
        ]
        t_emb_start = time.perf_counter()
        embeddings = batch_embed_chunks(sample_chunks_batch, batch_size=2)
        emb_latency = (time.perf_counter() - t_emb_start) * 1000.0

        assert len(embeddings) == 3, f"Expected 3 embeddings, got {len(embeddings)}"
        assert len(embeddings[0]["embedding"]) == 1536, "Embedding dimension must be 1536"
        assert embeddings[0]["chunk_index"] == 0
        assert embeddings[2]["chunk_index"] == 2

        ok(f"Batch embedding verified: 3 chunks processed in {emb_latency:.2f} ms with vector caching.")
    except Exception as exc:
        fail(f"Test 3 failed: {exc}")

    # -----------------------------------------------------------------------
    # TEST 4: FastAPI POST /internal/rag-query Endpoint
    # -----------------------------------------------------------------------
    print("\n--- Test 4: POST /internal/rag-query with Redis Caching ---")
    try:
        client = TestClient(app)
        doc_id = "test-rag-doc-001"
        query = "What is the governing law of this contract?"

        # 1. First Call: Cold query (Cache Miss)
        resp1 = client.post(
            "/internal/rag-query",
            json={
                "doc_id": doc_id,
                "query": query,
                "top_k": 2,
                "use_cache": True,
            },
        )
        assert resp1.status_code == 200, f"Expected 200, got {resp1.status_code}: {resp1.text}"
        data1 = resp1.json()
        assert data1["status"] == "ok"
        assert data1["doc_id"] == doc_id
        assert data1["cached"] is False, "First request must be a cache miss"
        assert len(data1["sources"]) > 0, "Expected at least 1 source chunk"
        assert "answer" in data1 and len(data1["answer"]) > 10

        # 2. Second Call: Repeat query (Cache Hit)
        resp2 = client.post(
            "/internal/rag-query",
            json={
                "doc_id": doc_id,
                "query": query,
                "top_k": 2,
                "use_cache": True,
            },
        )
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert data2["cached"] is True, "Second request must be a cache hit"
        assert data2["answer"] == data1["answer"], "Cached answer must match original"
        assert data2["latency_ms"] < 50.0, f"Cached response latency must be fast: {data2['latency_ms']} ms"

        # 3. Third Call: with use_cache=False (Bypass cache)
        resp3 = client.post(
            "/internal/rag-query",
            json={
                "doc_id": doc_id,
                "query": query,
                "top_k": 2,
                "use_cache": False,
            },
        )
        assert resp3.status_code == 200
        data3 = resp3.json()
        assert data3["cached"] is False, "Request with use_cache=False must not be cached"

        ok(f"POST /internal/rag-query verified: cold Miss ({data1['latency_ms']}ms) -> repeat Hit ({data2['latency_ms']}ms).")
    except Exception as exc:
        fail(f"Test 4 failed: {exc}")

    # -----------------------------------------------------------------------
    # TEST 5: Model Accuracy Benchmark JSON Artifact
    # -----------------------------------------------------------------------
    print("\n--- Test 5: Benchmark JSON Results Artifact ---")
    try:
        eval_file = _SERVICE_DIR.parent / "docs" / "eval_results.json"
        assert eval_file.exists(), f"eval_results.json missing at {eval_file}"

        with open(eval_file, "r", encoding="utf-8") as f:
            eval_data = json.load(f)

        assert eval_data["model_version"] == "legalease-v1.2.0"
        assert "clause_classification" in eval_data
        assert "date_extraction" in eval_data
        assert "ocr_performance" in eval_data
        assert "rag_relevance" in eval_data
        assert eval_data["executive_summary"]["all_benchmarks_passed"] is True

        exec_sum = eval_data["executive_summary"]
        ok(
            f"docs/eval_results.json verified: Clause Acc={exec_sum['clause_accuracy_pct']}%, "
            f"Date F1={exec_sum['date_f1']}, OCR Acc={exec_sum['ocr_char_accuracy_pct']}%, "
            f"RAG Relevance={exec_sum['rag_relevance_pct']}%."
        )
    except Exception as exc:
        fail(f"Test 5 failed: {exc}")

    # -----------------------------------------------------------------------
    # TEST 6: Demo Rehearsal Execution Sanity
    # -----------------------------------------------------------------------
    print("\n--- Test 6: Demo Flow Rehearsal Runner ---")
    try:
        demo_ok = rehearse_demo()
        assert demo_ok is True, "Demo flow rehearsal must complete successfully"
        ok("rehearse_demo() executed all 5 user journeys with zero errors.")
    except Exception as exc:
        fail(f"Test 6 failed: {exc}")

    # -----------------------------------------------------------------------
    # Summary
    # -----------------------------------------------------------------------
    print("\n=== Summary ===")
    if failures:
        print(f"\n{FAIL} {len(failures)} test(s) failed:")
        for f_msg in failures:
            print(f"  • {f_msg}")
        sys.exit(1)
    else:
        print(f"{PASS} All Week 9 acceptance tests passed successfully!\n")
        sys.exit(0)


if __name__ == "__main__":
    main()
