"""
scripts/test_week3_classifier.py
=================================
Week 3 acceptance test script.
Tests clause classifier, risk scoring engine, and the POST /internal/classify route.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Add project root to sys.path
REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(REPO_ROOT))

# pyrefly: ignore [missing-import]
from fastapi.testclient import TestClient
from main import app
from classification.classifier import ClauseClassifier
from classification.risk_scoring import RiskEngine

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"

failures: list[str] = []


def ok(msg: str) -> None:
    print(f"{PASS} {msg}")


def fail(msg: str) -> None:
    print(f"{FAIL} {msg}")
    failures.append(msg)


print("\n=== Week 3 Classifier & Risk Scoring Acceptance Tests ===\n")

# ---------------------------------------------------------------------------
# Test 1: Classifier Initialization & fallback behaviour
# ---------------------------------------------------------------------------
print("--- Test 1: Classifier Loading ---")
try:
    classifier = ClauseClassifier()
    ok(f"Classifier loaded successfully. Fallback active: {classifier.use_fallback}")
except Exception as exc:
    fail(f"Classifier loading failed: {exc}")

# ---------------------------------------------------------------------------
# Test 2: Classification Accuracy (2-3 sample clauses)
# ---------------------------------------------------------------------------
print("\n--- Test 2: Classification Accuracy ---")
test_cases = [
    (
        "Either party may terminate this agreement upon 30 days written notice.",
        "termination",
    ),
    (
        "The vendor will indemnify and hold harmless the buyer from all damages.",
        "indemnification",
    ),
    (
        "Employee shall not engage in any competing business in the restricted area.",
        "non_compete",
    ),
    (
        "The parties must keep all proprietary data strictly confidential.",
        "confidentiality",
    ),
    (
        "The liability of the service provider is capped at the fees paid.",
        "liability",
    ),
    (
        "Governed by and construed in accordance with New York law.",
        "governing_law",
    ),
]

try:
    for text, expected in test_cases:
        res = classifier.classify_text(text)
        assert res["clause_type"] == expected, (
            f"Expected classification to be '{expected}', but got '{res['clause_type']}' "
            f"(confidence={res['confidence']}, method={res['method']}) for text: '{text}'"
        )
        ok(f"Classified as '{res['clause_type']}' (conf: {res['confidence']}, method: {res['method']}) ✓")
except Exception as exc:
    fail(f"Classification accuracy test failed: {exc}")

# ---------------------------------------------------------------------------
# Test 3: Risk Scoring Logic
# ---------------------------------------------------------------------------
print("\n--- Test 3: Risk Scoring Rule Engine ---")
try:
    risk_engine = RiskEngine()

    # Case A: Standard termination (base risk 40)
    res_a = risk_engine.score_clause(
        "Termination upon material breach of agreement.",
        "termination",
        1.0
    )
    # No risk-increasing modifiers, base risk = 40
    assert res_a["risk_score"] == 40, f"Expected 40, got {res_a['risk_score']}"
    assert res_a["risk_level"] == "medium"
    ok(f"Standard termination scored: {res_a}")

    # Case B: High-risk termination (without cause + convenience = 40 + 20 + 20 = 80)
    res_b = risk_engine.score_clause(
        "Either party may terminate this contract for convenience and without cause at any time.",
        "termination",
        1.0
    )
    # Fired: "without cause" (+20), "termination for convenience" (+20), "at any time" (+15)
    # raw: 40 + 20 + 20 + 15 = 95. Clamped at 95.
    assert res_b["risk_score"] >= 80, f"Expected high risk >= 80, got {res_b['risk_score']}"
    assert res_b["risk_level"] == "high"
    assert "Unilateral termination without cause / for convenience" in res_b["matching_rules"]
    ok(f"High-risk termination scored: {res_b}")

    # Case C: Low confidence risk adjustment
    res_c = risk_engine.score_clause(
        "This is an unclear clause.",
        "termination",
        0.1  # very low confidence
    )
    # Base risk is blended toward 35 because confidence is low (0.1 < 0.4)
    # Ensures we don't return an extreme risk score if classifier is unsure
    ok(f"Low confidence risk adjustment scored: {res_c}")

except Exception as exc:
    fail(f"Risk engine test failed: {exc}")

# ---------------------------------------------------------------------------
# Test 4: Overall risk aggregation
# ---------------------------------------------------------------------------
print("\n--- Test 4: Overall Risk Aggregation ---")
try:
    risk_engine = RiskEngine()
    clauses = [
        {"risk_score": 10},
        {"risk_score": 20},
        {"risk_score": 90},  # one high-risk clause
    ]
    score, level = risk_engine.calculate_overall_risk(clauses)
    # Simple average of 10, 20, 90 is 40.
    # Weighted average: 0.6 * average(40) + 0.4 * max(90) = 24 + 36 = 60.
    assert score == 60, f"Expected overall score 60, got {score}"
    assert level == "medium"
    ok(f"Aggregated overall score: {score} ({level}) ✓")
except Exception as exc:
    fail(f"Overall risk aggregation failed: {exc}")

# ---------------------------------------------------------------------------
# Test 5: POST /internal/classify Router
# ---------------------------------------------------------------------------
print("\n--- Test 5: POST /internal/classify endpoint ---")
try:
    client = TestClient(app)
    
    # payload with s3_key omitted - should fall back to sample_contract.pdf
    payload = {"doc_id": "test-doc-uuid"}
    response = client.post("/internal/classify", json=payload)
    
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    body = response.json()
    
    # Check top level structure
    required_keys = {"status", "doc_id", "overall_risk_score", "overall_risk_level", "clauses", "classifier_method"}
    missing = required_keys - set(body.keys())
    assert not missing, f"Response missing keys: {missing}"
    
    assert body["status"] == "ok"
    assert body["doc_id"] == "test-doc-uuid"
    assert len(body["clauses"]) >= 1, "Expected at least 1 classified clause"
    
    # Verify clause format
    clause = body["clauses"][0]
    required_clause_keys = {"chunk_index", "text", "clause_type", "confidence", "risk_score", "risk_level", "matching_rules"}
    missing_clause = required_clause_keys - set(clause.keys())
    assert not missing_clause, f"Clause missing keys: {missing_clause}"
    
    ok(
        f"API response verified: clauses={len(body['clauses'])}, "
        f"overall_score={body['overall_risk_score']} ({body['overall_risk_level']}), "
        f"method={body['classifier_method']}"
    )

except Exception as exc:
    fail(f"API endpoint test failed: {exc}")

# ---------------------------------------------------------------------------
# Test 6: API Error Handling / Validation
# ---------------------------------------------------------------------------
print("\n--- Test 6: API Error Handling ---")
try:
    client = TestClient(app)
    
    # Empty request
    response_empty = client.post("/internal/classify", json={})
    assert response_empty.status_code == 422, f"Expected 422, got {response_empty.status_code}"
    
    # Invalid doc_id type
    response_invalid = client.post("/internal/classify", json={"doc_id": 12345})
    assert response_invalid.status_code == 422, f"Expected 422, got {response_invalid.status_code}"
    
    ok("API validation errors handled correctly.")
except Exception as exc:
    fail(f"API error handling test failed: {exc}")

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print("\n=== Summary ===")
if failures:
    print(f"\n{FAIL} {len(failures)} test(s) failed:")
    for f_msg in failures:
        print(f"  • {f_msg}")
    sys.exit(1)
else:
    print(f"{PASS} All acceptance tests passed!")
    sys.exit(0)
