"""
scripts/test_week8_reanalysis.py
================================
Week 8 Acceptance Test Suite:
1. Model versioning and staleness evaluation
2. Stale analysis flagging migration logic
3. Token Bucket rate limiter behavior
4. Diff detection (+/-15 score shift and newly surfaced red flags)
5. FastAPI endpoints: POST /internal/check-stale & POST /internal/reanalyze-batch
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

# Add project root to sys.path
REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(REPO_ROOT))

# pyrefly: ignore [missing-import]
from fastapi.testclient import TestClient
from main import app
from classification.diff_detector import detect_analysis_diff
from classification.rate_limiter import TokenBucketRateLimiter
from classification.versioning import (
    CURRENT_MODEL_VERSION,
    check_analysis_staleness,
    is_stale_version,
    parse_semver,
)
from scripts.flag_stale_analyses import flag_stale_analyses_in_records

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"

failures: list[str] = []


def ok(msg: str) -> None:
    print(f"{PASS} {msg}")


def fail(msg: str) -> None:
    print(f"{FAIL} {msg}")
    failures.append(msg)


print("\n=== Week 8 Model Versioning & Weekly Re-Analysis Acceptance Tests ===\n")

# ---------------------------------------------------------------------------
# Test 1: Model Versioning & Staleness Evaluation
# ---------------------------------------------------------------------------
print("--- Test 1: Model Versioning & Semver Logic ---")
try:
    ok(f"Active production model version: '{CURRENT_MODEL_VERSION}'")

    assert parse_semver("legalease-v1.2.0") == (1, 2, 0), "Failed to parse legalease-v1.2.0"
    assert parse_semver("v1.0.5") == (1, 0, 5), "Failed to parse v1.0.5"

    # Staleness checks
    assert is_stale_version("legal-bert-v1.0.0", CURRENT_MODEL_VERSION) is True, "Old version should be stale"
    assert is_stale_version("v1.1.0", CURRENT_MODEL_VERSION) is True, "v1.1.0 should be stale"
    assert is_stale_version(None, CURRENT_MODEL_VERSION) is True, "None should be stale"
    assert is_stale_version("", CURRENT_MODEL_VERSION) is True, "Empty string should be stale"
    assert is_stale_version(CURRENT_MODEL_VERSION, CURRENT_MODEL_VERSION) is False, "Current version must not be stale"
    assert is_stale_version("legalease-v2.0.0", CURRENT_MODEL_VERSION) is False, "Newer version must not be stale"

    stale_check = check_analysis_staleness("legal-bert-v1.0.0", CURRENT_MODEL_VERSION)
    assert stale_check.is_stale is True
    assert "older than" in stale_check.reason
    ok("Model versioning staleness comparisons verified ✓")
except Exception as exc:
    fail(f"Test 1 failed: {exc}")


# ---------------------------------------------------------------------------
# Test 2: Stale Analysis Flagging Migration Logic
# ---------------------------------------------------------------------------
print("\n--- Test 2: Stale Analysis Flagging Migration Script Logic ---")
try:
    sample_records = [
        {"id": "a-1", "document_id": "d-1", "model_version": "legal-bert-v1.0.0"},
        {"id": "a-2", "document_id": "d-2", "model_version": CURRENT_MODEL_VERSION},
        {"id": "a-3", "document_id": "d-3", "model_version": None},
        {"id": "a-4", "document_id": "d-4", "model_version": "v1.1.0"},
    ]

    report = flag_stale_analyses_in_records(sample_records, current_version=CURRENT_MODEL_VERSION)
    assert report["total_evaluated"] == 4
    assert report["total_stale"] == 3
    assert report["total_up_to_date"] == 1
    assert len(report["stale_records"]) == 3
    ok(f"Flagging script partitioned records: {report['total_stale']} stale, {report['total_up_to_date']} up-to-date ✓")
except Exception as exc:
    fail(f"Test 2 failed: {exc}")


# ---------------------------------------------------------------------------
# Test 3: Token Bucket Rate Limiter
# ---------------------------------------------------------------------------
print("\n--- Test 3: Token Bucket Rate Limiter ---")
try:
    # Capacity: 5 tokens, refill rate: 2 tokens/sec
    limiter = TokenBucketRateLimiter(capacity=5.0, refill_rate=2.0, initial_tokens=5.0)

    # Drain all 5 tokens
    for _ in range(5):
        assert limiter.acquire(tokens=1.0, block=False) is True

    # 6th token should fail non-blocking
    assert limiter.acquire(tokens=1.0, block=False) is False, "Should reject when tokens exhausted"

    # Sleep 0.6s -> should refill ~1.2 tokens
    time.sleep(0.6)
    assert limiter.acquire(tokens=1.0, block=False) is True, "Should succeed after refill"
    ok("Token Bucket rate limiter bursts, exhausts, and refills as expected ✓")
except Exception as exc:
    fail(f"Test 3 failed: {exc}")


# ---------------------------------------------------------------------------
# Test 4: Diff Detection Engine
# ---------------------------------------------------------------------------
print("\n--- Test 4: Diff Detection Engine (+/-15 and Red Flags) ---")
try:
    # 4a: Score shift >= 15 (e.g. 40 -> 60, +20 shift)
    prev_a = {"overall_risk_score": 40, "clauses": []}
    new_a = {"overall_risk_score": 60, "clauses": []}
    diff_a = detect_analysis_diff(prev_a, new_a)
    assert diff_a.diff_detected is True, "Expected diff_detected=True for +20 score delta"
    assert diff_a.notify_user is True, "Expected notify_user=True"
    assert diff_a.score_delta == 20
    assert diff_a.significant_score_change is True
    ok("Diff detection: +20 points shift correctly triggered notification flag ✓")

    # 4b: Negative score shift <= -15 (e.g. 80 -> 60, -20 shift)
    prev_b = {"overall_risk_score": 80, "clauses": []}
    new_b = {"overall_risk_score": 60, "clauses": []}
    diff_b = detect_analysis_diff(prev_b, new_b)
    assert diff_b.diff_detected is True
    assert diff_b.score_delta == -20
    assert diff_b.significant_score_change is True
    ok("Diff detection: -20 points shift correctly triggered notification flag ✓")

    # 4c: Insignificant score shift (< 15) and no new red flags (e.g. 40 -> 48, +8 shift)
    prev_c = {"overall_risk_score": 40, "clauses": []}
    new_c = {"overall_risk_score": 48, "clauses": []}
    diff_c = detect_analysis_diff(prev_c, new_c)
    assert diff_c.diff_detected is False, "Expected diff_detected=False for +8 shift"
    assert diff_c.notify_user is False
    assert diff_c.significant_score_change is False
    ok("Diff detection: +8 points shift below threshold safely ignored (no notification) ✓")

    # 4d: Score unchanged, but a NEW red-flag clause appears
    prev_d = {
        "overall_risk_score": 50,
        "clauses": [
            {"clause_type": "confidentiality", "risk_score": 20, "risk_level": "low"}
        ]
    }
    new_d = {
        "overall_risk_score": 50,
        "clauses": [
            {"clause_type": "confidentiality", "risk_score": 20, "risk_level": "low"},
            {
                "clause_type": "limitation_of_liability",
                "risk_score": 90,
                "risk_level": "high",
                "text": "Uncapped liability for all consequential damages.",
            }
        ]
    }
    diff_d = detect_analysis_diff(prev_d, new_d)
    assert diff_d.diff_detected is True, "Expected diff_detected=True for new red flag"
    assert diff_d.notify_user is True
    assert len(diff_d.new_red_flags) == 1
    assert diff_d.new_red_flags[0]["clause_type"] == "limitation_of_liability"
    ok("Diff detection: Newly surfaced high-risk red-flag clause correctly triggered notification ✓")
except Exception as exc:
    fail(f"Test 4 failed: {exc}")


# ---------------------------------------------------------------------------
# Test 5: FastAPI Re-Analysis Endpoints Integration
# ---------------------------------------------------------------------------
print("\n--- Test 5: FastAPI Endpoints: POST /internal/check-stale & reanalyze-batch ---")
try:
    client = TestClient(app)

    # 5a: POST /internal/check-stale
    stale_payload = {
        "analyses": [
            {"document_id": "doc-01", "model_version": "legal-bert-v1.0.0"},
            {"document_id": "doc-02", "model_version": CURRENT_MODEL_VERSION},
            {"document_id": "doc-03", "model_version": None},
        ]
    }
    resp_stale = client.post("/internal/check-stale", json=stale_payload)
    if resp_stale.status_code == 200:
        stale_data = resp_stale.json()
        assert stale_data["stale_count"] == 2
        assert stale_data["up_to_date_count"] == 1
        assert "doc-01" in stale_data["stale_document_ids"]
        assert "doc-03" in stale_data["stale_document_ids"]
        ok(f"POST /internal/check-stale verified: {stale_data['stale_count']} stale of {stale_data['total_checked']} ✓")
    else:
        fail(f"POST /internal/check-stale failed with status {resp_stale.status_code}: {resp_stale.text}")

    # 5b: POST /internal/reanalyze-batch — Exceeding 50 documents limit
    too_many_docs = [{"document_id": f"doc-{i}"} for i in range(51)]
    resp_limit = client.post("/internal/reanalyze-batch", json={"documents": too_many_docs})
    assert resp_limit.status_code == 400, f"Expected 400 for batch > 50, got {resp_limit.status_code}"
    ok("Batch size > 50 boundary rejected with HTTP 400 Bad Request ✓")

    # 5c: POST /internal/reanalyze-batch — Normal batch execution
    batch_payload = {
        "documents": [
            {
                "document_id": "doc-stale-001",
                "s3_key": "sample_contract.pdf",
                "previous_analysis": {
                    "overall_risk_score": 10,  # Score was 10, new sample_contract will score ~30 (delta +20 >= 15!)
                    "model_version": "legal-bert-v1.0.0",
                    "clauses": []
                }
            },
            {
                "document_id": "doc-current-002",
                "s3_key": "sample_contract.pdf",
                "previous_analysis": {
                    "overall_risk_score": 30,
                    "model_version": CURRENT_MODEL_VERSION,
                    "clauses": []
                }
            }
        ],
        "force_reanalyze": False
    }

    resp_batch = client.post("/internal/reanalyze-batch", json=batch_payload)
    if resp_batch.status_code == 200:
        batch_data = resp_batch.json()
        assert batch_data["total_processed"] == 2
        assert batch_data["total_reanalyzed"] == 1, f"Expected 1 reanalyzed, got {batch_data['total_reanalyzed']}"
        assert batch_data["total_skipped"] == 1, f"Expected 1 skipped, got {batch_data['total_skipped']}"

        # Verify diff result for the reanalyzed document
        doc1_result = next(r for r in batch_data["results"] if r["document_id"] == "doc-stale-001")
        assert doc1_result["status"] == "reanalyzed"
        assert doc1_result["diff_detected"] is True, f"Expected diff_detected=True, got {doc1_result['diff_detected']}"
        assert doc1_result["notify_user"] is True, "Expected notify_user=True"
        assert doc1_result["score_delta"] >= 15, f"Expected score_delta >= 15, got {doc1_result['score_delta']}"

        # Verify skipped document
        doc2_result = next(r for r in batch_data["results"] if r["document_id"] == "doc-current-002")
        assert doc2_result["status"] == "skipped_up_to_date"
        assert doc2_result["notify_user"] is False

        ok(f"POST /internal/reanalyze-batch verified: reanalyzed={batch_data['total_reanalyzed']}, skipped={batch_data['total_skipped']}, notifications={batch_data['total_notifications_triggered']} ✓")
    else:
        fail(f"POST /internal/reanalyze-batch failed with status {resp_batch.status_code}: {resp_batch.text}")

except Exception as exc:
    fail(f"Test 5 failed with exception: {exc}")


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print("\n=== Summary ===")
if not failures:
    print(f"\n{PASS} All Week 8 Model Versioning & Re-Analysis acceptance tests passed successfully!\n")
    sys.exit(0)
else:
    print(f"\n{FAIL} {len(failures)} test(s) failed:")
    for f in failures:
        print(f"  • {f}")
    print()
    sys.exit(1)
