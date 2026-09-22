"""
scripts/test_week10_dimensions.py
=================================
Week 10 (Addition): Multi-Dimensional Risk Analysis Acceptance Tests.

Verifies:
  1. Clause-to-dimension mapping table correctness for all 12 types + aliases.
  2. Multi-dimension distribution and score duplication.
  3. Dimension aggregation mathematics (60% avg + 40% max, 0-100 range, no NaN).
  4. Team-wide weighted overall score calculation (Legal 30%, Financial 25%,
     Litigation 20%, Privacy 15%, Employment 10%).
  5. Explainability layer: top contributing clauses per dimension.
  6. End-to-end FastAPI endpoint behavior on 3 real sample documents:
     - sample_contract.pdf (Digital Service Agreement)
     - sample_scanned.png (Scanned document with OCR)
     - sample_employment.pdf (Executive Employment Agreement)
  7. Full backward-compatibility of response schema for Shalvi and Krina.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict

# Ensure project root is on sys.path
REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(REPO_ROOT))

from classification.dimension_scoring import (
    CLAUSE_DIMENSION_MAPPING,
    DEFAULT_DIMENSION_WEIGHTS,
    RISK_DIMENSIONS,
    aggregate_dimension_scores,
    get_clause_dimensions,
    map_clause_dimensions,
)


def ok(msg: str) -> None:
    print(f"  \033[32m✓\033[0m {msg}")


def fail(msg: str) -> None:
    print(f"  \033[31m✗ FAIL:\033[0m {msg}")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Test 1: Clause-to-Dimension Mapping Table
# ---------------------------------------------------------------------------
def test_dimension_mapping_table() -> None:
    print("\n--- Test 1: Shared Dimension Mapping Table Compliance ---")

    expected_mappings = {
        "payment_terms": ["financial"],
        "indemnity": ["financial", "legal"],
        "termination": ["legal", "employment"],
        "liability": ["legal", "litigation"],
        "limitation_of_liability": ["legal", "litigation"],
        "confidentiality": ["privacy"],
        "non_compete": ["employment"],
        "dispute_resolution": ["litigation"],
        "arbitration": ["litigation"],
        "dispute_resolution/arbitration": ["litigation"],
        "data_sharing": ["privacy"],
        "compensation": ["financial", "employment"],
        "breach_conditions": ["legal", "litigation"],
        "governing_law": ["legal"],
        "other": ["legal"],
    }

    for clause_type, expected_dims in expected_mappings.items():
        actual = get_clause_dimensions(clause_type)
        assert actual == expected_dims, f"Clause '{clause_type}' mapped to {actual}, expected {expected_dims}"

    # Verify unknown clause defaults safely to ["legal"]
    assert get_clause_dimensions("unknown_random_clause") == ["legal"]
    assert get_clause_dimensions("") == ["legal"]

    ok(f"All {len(expected_mappings)} shared clause types and aliases mapped accurately to canonical dimensions.")


# ---------------------------------------------------------------------------
# Test 2: Per-Clause Multi-Dimension Score Distribution
# ---------------------------------------------------------------------------
def test_clause_score_distribution() -> None:
    print("\n--- Test 2: Per-Clause Multi-Dimension Score Distribution ---")

    # Indemnity (Financial + Legal)
    dims, scores = map_clause_dimensions("indemnity", 75, 0.95)
    assert set(dims) == {"financial", "legal"}, f"Expected financial and legal, got {dims}"
    assert scores["financial"] == 75, f"Expected 75, got {scores['financial']}"
    assert scores["legal"] == 75, f"Expected 75, got {scores['legal']}"

    # Clamping tests
    _, clamped_high = map_clause_dimensions("confidentiality", 150)
    assert clamped_high["privacy"] == 100, f"Expected clamped 100, got {clamped_high['privacy']}"

    _, clamped_low = map_clause_dimensions("confidentiality", -20)
    assert clamped_low["privacy"] == 0, f"Expected clamped 0, got {clamped_low['privacy']}"

    ok("Per-clause multi-dimension mapping and clamping verified (0-100 bounded).")


# ---------------------------------------------------------------------------
# Test 3: Dimension Aggregation Mathematics & Boundary Checks
# ---------------------------------------------------------------------------
def test_dimension_aggregation_math() -> None:
    print("\n--- Test 3: Dimension Aggregation Mathematics & Boundaries ---")

    mock_clauses = [
        {"chunk_index": 0, "clause_type": "payment_terms", "risk_score": 40, "text": "Net 30 invoice terms"},
        {"chunk_index": 1, "clause_type": "payment_terms", "risk_score": 80, "text": "Interest on late payments is 5% daily"},
        {"chunk_index": 2, "clause_type": "confidentiality", "risk_score": 30, "text": "5 year confidentiality"},
        {"chunk_index": 3, "clause_type": "termination", "risk_score": 60, "text": "Immediate termination on default"},
    ]

    agg = aggregate_dimension_scores(mock_clauses)
    risk_dims = agg["risk_dimensions"]

    # Verify all 5 dimensions exist
    for dim in RISK_DIMENSIONS:
        assert dim in risk_dims, f"Missing dimension '{dim}' in aggregation results"
        score = risk_dims[dim]
        assert isinstance(score, int), f"Dimension {dim} score is not int: {score}"
        assert 0 <= score <= 100, f"Dimension {dim} score out of range: {score}"

    # Financial has scores [40, 80]:
    # mean = 60, max = 80 -> round(0.6 * 60 + 0.4 * 80) = round(36 + 32) = 68
    assert risk_dims["financial"] == 68, f"Expected financial risk 68, got {risk_dims['financial']}"

    # Privacy has score [30]:
    # mean = 30, max = 30 -> 30
    assert risk_dims["privacy"] == 30, f"Expected privacy risk 30, got {risk_dims['privacy']}"

    # Litigation has 0 clauses -> score must be 0
    assert risk_dims["litigation"] == 0, f"Expected litigation risk 0 for unrepresented dimension, got {risk_dims['litigation']}"

    ok("Dimension aggregation correctly applied 60/40 weighted formula and 0 baseline for absent dimensions.")


# ---------------------------------------------------------------------------
# Test 4: Weighted Overall Score Calculation
# ---------------------------------------------------------------------------
def test_weighted_overall_score() -> None:
    print("\n--- Test 4: Team Weighted Overall Score Calculation ---")

    # Verify default weights sum to 1.00
    total_weight = sum(DEFAULT_DIMENSION_WEIGHTS.values())
    assert abs(total_weight - 1.0) < 1e-6, f"Dimension weights must sum to 1.0, got {total_weight}"

    # Test synthetic balanced distribution
    # Legal: 80, Financial: 60, Litigation: 50, Privacy: 40, Employment: 70
    # Expected weighted: 0.30*80 + 0.25*60 + 0.20*50 + 0.15*40 + 0.10*70
    # = 24 + 15 + 10 + 6 + 7 = 62
    clauses = [
        {"chunk_index": 0, "clause_type": "governing_law", "risk_score": 80},  # legal -> 80
        {"chunk_index": 1, "clause_type": "payment_terms", "risk_score": 60},  # financial -> 60
        {"chunk_index": 2, "clause_type": "dispute_resolution", "risk_score": 50},  # litigation -> 50
        {"chunk_index": 3, "clause_type": "confidentiality", "risk_score": 40},  # privacy -> 40
        {"chunk_index": 4, "clause_type": "non_compete", "risk_score": 70},  # employment -> 70
    ]

    agg = aggregate_dimension_scores(clauses)
    assert agg["weighted_risk_score"] == 62, f"Expected weighted score 62, got {agg['weighted_risk_score']}"
    ok("Weighted overall score formula matches team specifications (30/25/20/15/10).")


# ---------------------------------------------------------------------------
# Test 5: Explainability Layer
# ---------------------------------------------------------------------------
def test_explainability_layer() -> None:
    print("\n--- Test 5: Explainability Layer Metadata ---")

    clauses = [
        {"chunk_index": 0, "clause_type": "payment_terms", "risk_score": 40, "text": "Net 30 invoice terms"},
        {"chunk_index": 1, "clause_type": "payment_terms", "risk_score": 85, "text": "Interest on late payments is 5% per day"},
    ]

    agg = aggregate_dimension_scores(clauses)
    explanations = agg["dimension_explanations"]

    assert "financial" in explanations
    financial_contributors = explanations["financial"]
    assert len(financial_contributors) == 2
    # Highest risk score should be ranked first
    assert financial_contributors[0]["risk_score"] == 85
    assert financial_contributors[0]["chunk_index"] == 1
    assert "Interest on late payments" in financial_contributors[0]["text_snippet"]

    ok("Explainability layer correctly ranked contributing clauses per dimension.")


# ---------------------------------------------------------------------------
# Test 6: FastAPI Endpoints with 3 Real Sample Documents
# ---------------------------------------------------------------------------
def test_fastapi_endpoints_real_documents() -> None:
    print("\n--- Test 6: FastAPI Endpoints on 3 Sample Contracts ---")

    from starlette.testclient import TestClient
    from main import app

    client = TestClient(app)

    contracts_to_test = [
        ("sample_contract.pdf", "doc-contract-pdf-001"),
        ("sample_scanned.png", "doc-scanned-png-002"),
        ("sample_employment.pdf", "doc-employment-pdf-003"),
    ]

    for filename, doc_id in contracts_to_test:
        print(f"  Testing contract: '{filename}' (doc_id='{doc_id}')")

        # Test both /internal/classify and /api/v1/analyze
        for endpoint in ["/internal/classify", "/api/v1/analyze"]:
            payload = {
                "doc_id": doc_id,
                "document_id": doc_id,
                "s3_key": filename,
            }
            resp = client.post(endpoint, json=payload)
            assert resp.status_code == 200, f"Failed {endpoint} for {filename}: {resp.text}"
            data = resp.json()

            # 1. Existing Week 1-9 fields remain intact
            assert data["status"] == "ok"
            assert data["doc_id"] == doc_id
            assert "overall_risk_score" in data
            assert "overall_risk_level" in data
            assert "clauses" in data
            assert "ocr_used" in data
            assert "missing_clauses" in data
            assert "model_version" in data

            # 2. Week 10 Additions: risk_dimensions
            assert "risk_dimensions" in data, f"Missing risk_dimensions in {endpoint}"
            risk_dims = data["risk_dimensions"]
            for dim in ["financial", "legal", "privacy", "employment", "litigation"]:
                assert dim in risk_dims, f"Missing dimension '{dim}' in response"
                val = risk_dims[dim]
                assert isinstance(val, int), f"Dimension {dim} value must be int, got {val}"
                assert 0 <= val <= 100, f"Dimension {dim} score out of bounds: {val}"

            # 3. Week 10 Additions: weighted_risk_score
            assert "weighted_risk_score" in data
            assert 0 <= data["weighted_risk_score"] <= 100

            # 4. Week 10 Additions: per-clause dimensions
            clauses = data["clauses"]
            assert len(clauses) > 0
            for c in clauses:
                assert "dimensions" in c, "Clause missing 'dimensions' list"
                assert "dimension_scores" in c, "Clause missing 'dimension_scores' dict"
                assert "dimension_contributions" in c, "Clause missing 'dimension_contributions' dict"
                assert len(c["dimensions"]) > 0
                for d in c["dimensions"]:
                    assert d in RISK_DIMENSIONS
                    assert 0 <= c["dimension_scores"][d] <= 100

            ok(f"Verified {endpoint} for '{filename}': Overall={data['overall_risk_score']}, "
               f"Weighted={data['weighted_risk_score']}, "
               f"Dims={data['risk_dimensions']}")

    ok("All 3 sample contracts analyzed with valid, sane multi-dimensional risk scores.")


# ---------------------------------------------------------------------------
# Main Test Runner
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("\n===========================================================")
    print("  LegalEase Week 10: Multi-Dimensional Risk Acceptance Tests")
    print("===========================================================")

    test_dimension_mapping_table()
    test_clause_score_distribution()
    test_dimension_aggregation_math()
    test_weighted_overall_score()
    test_explainability_layer()
    test_fastapi_endpoints_real_documents()

    print("\n===========================================================")
    print("  \033[32mALL WEEK 10 MULTI-DIMENSIONAL ACCEPTANCE TESTS PASSED!\033[0m")
    print("===========================================================\n")
