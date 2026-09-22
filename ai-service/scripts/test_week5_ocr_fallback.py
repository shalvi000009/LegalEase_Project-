"""
scripts/test_week5_ocr_fallback.py
==================================
Week 5 Acceptance Test Script.
Tests:
  1. Multi-page scanned PDF OCR extraction (rasterizing all pages, preprocessing, and Tesseract OCR).
  2. Rule-based checklist comparison and suggested questions generation.
  3. POST /internal/classify and POST /api/v1/analyze FastAPI routes, including document_id alias.
"""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path

# Add project root to sys.path
REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(REPO_ROOT))

# pyrefly: ignore [missing-import]
from fastapi.testclient import TestClient
from main import app
from extraction.pdf_extractor import extract_text_from_scanned_pdf, is_scanned_pdf
from classification.checklist import (
    detect_contract_type,
    get_rule_based_missing_clauses,
    get_rule_based_suggested_questions,
)

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"

failures: list[str] = []


def ok(msg: str) -> None:
    print(f"{PASS} {msg}")


def fail(msg: str) -> None:
    print(f"{FAIL} {msg}")
    failures.append(msg)


def create_temp_scanned_pdf(image_path: Path, output_pdf_path: Path) -> None:
    """
    Creates a 2-page scanned PDF by inserting the same image onto 2 pages.
    """
    import fitz  # type: ignore
    doc = fitz.open()
    for _ in range(2):
        page = doc.new_page()
        rect = page.rect
        page.insert_image(rect, filename=str(image_path))
    doc.save(str(output_pdf_path))
    doc.close()


def main() -> None:
    print("\n=== Week 5 Reporting & OCR Fallback Acceptance Tests ===\n")

    # Paths to sample files
    sample_img = REPO_ROOT / "sample_docs" / "sample_scanned.png"
    if not sample_img.exists():
        fail(f"Required test image not found at {sample_img}")
        sys.exit(1)

    # ---------------------------------------------------------------------------
    # Test 1: Multi-page Scanned PDF OCR Fallback
    # ---------------------------------------------------------------------------
    print("--- Test 1: Scanned PDF Multi-page OCR Fallback ---")
    with tempfile.TemporaryDirectory() as tmpdir:
        temp_pdf = Path(tmpdir) / "test_scanned.pdf"
        try:
            create_temp_scanned_pdf(sample_img, temp_pdf)
            
            # Verify it's recognized as a scanned PDF
            assert is_scanned_pdf(temp_pdf) is True, "PDF should be flagged as scanned"
            ok("is_scanned_pdf correctly flagged scanned PDF")

            # Extract text via multi-page OCR
            ocr_result = extract_text_from_scanned_pdf(temp_pdf)
            
            assert ocr_result["ocr_used"] is True, "ocr_used must be True"
            assert ocr_result["page_count"] == 2, f"Expected 2 pages, got {ocr_result['page_count']}"
            assert len(ocr_result["pages"]) == 2, f"Expected 2 page records, got {len(ocr_result['pages'])}"
            assert len(ocr_result["full_text"]) > 100, "Expected some text extracted"
            
            ok(f"Scanned PDF multi-page OCR extraction succeeded: page_count={ocr_result['page_count']}, chars={len(ocr_result['full_text'])}")
        except Exception as exc:
            fail(f"Scanned PDF OCR Fallback test failed: {exc}")

    # ---------------------------------------------------------------------------
    # Test 2: Rule-Based Checklist & Suggested Questions Logic
    # ---------------------------------------------------------------------------
    print("\n--- Test 2: Checklist & Suggested Questions Logic ---")
    try:
        sample_text = "This Employment Agreement is made between Employer and Employee. Salary is $100,000."
        
        # Test contract type detection
        detected_type = detect_contract_type(sample_text)
        assert detected_type == "employment_agreement", f"Expected employment_agreement, got {detected_type}"
        ok(f"detect_contract_type correctly detected: {detected_type}")

        # Test missing clause detection
        # With only one confidentiality clause present, termination should be flagged as missing
        classified = [
            {"clause_type": "confidentiality", "risk_score": 10, "risk_level": "low"}
        ]
        missing = get_rule_based_missing_clauses(classified, detected_type)
        assert len(missing) > 0, "Expected missing clauses list to be non-empty"
        # "Termination clause (notice period and terms)" should be in the missing list
        assert any("Termination" in m for m in missing), "Expected termination to be marked missing"
        ok(f"get_rule_based_missing_clauses successfully detected: {missing}")

        # Test suggested questions generator
        # Add a risky clause to trigger a specific question
        risky_classified = [
            {"clause_type": "non_compete", "risk_score": 90, "risk_level": "high"}
        ]
        questions = get_rule_based_suggested_questions(risky_classified)
        assert len(questions) >= 3 and len(questions) <= 5, f"Expected 3-5 questions, got {len(questions)}"
        assert any("non-compete" in q.lower() for q in questions), "Expected a non-compete specific question"
        ok(f"get_rule_based_suggested_questions successfully generated: {questions}")

    except Exception as exc:
        fail(f"Checklist and Questions test failed: {exc}")

    # ---------------------------------------------------------------------------
    # Test 3: FastAPI Routers & document_id Alias
    # ---------------------------------------------------------------------------
    print("\n--- Test 3: FastAPI Routers & Alias Testing ---")
    try:
        client = TestClient(app)

        # A. Test /internal/classify with doc_id
        payload_internal = {"doc_id": "test-uuid-1", "s3_key": "sample_contract.pdf"}
        response = client.post("/internal/classify", json=payload_internal)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["doc_id"] == "test-uuid-1"
        assert "ocr_used" in data
        assert "missing_clauses" in data
        assert "suggested_questions" in data
        assert isinstance(data["ocr_used"], bool)
        assert isinstance(data["missing_clauses"], list)
        assert isinstance(data["suggested_questions"], list)
        ok("/internal/classify returns expected schema fields")

        # B. Test /api/v1/analyze with document_id alias
        payload_api = {"document_id": "test-uuid-2", "s3_key": "sample_contract.pdf"}
        response = client.post("/api/v1/analyze", json=payload_api)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data_api = response.json()
        assert data_api["doc_id"] == "test-uuid-2", f"Expected doc_id 'test-uuid-2', got {data_api['doc_id']}"
        assert data_api["ocr_used"] is False, "sample_contract.pdf is digital, ocr_used should be False"
        ok("/api/v1/analyze route successfully handles document_id and returns correct data")

    except Exception as exc:
        fail(f"FastAPI Routers & Alias test failed: {exc}")

    print("\n--- Summary ---")
    if failures:
        print(f"{FAIL} Week 5 tests failed with {len(failures)} failures.")
        for f in failures:
            print(f" - {f}")
        sys.exit(1)
    else:
        print(f"{PASS} All Week 5 Reporting & OCR Fallback tests passed successfully!")


if __name__ == "__main__":
    main()
