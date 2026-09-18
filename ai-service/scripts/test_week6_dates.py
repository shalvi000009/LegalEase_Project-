"""
scripts/test_week6_dates.py
===========================
Week 6 acceptance test script.
Tests date extraction, signing date detection, relative date resolution,
and the POST /internal/extract-dates FastAPI endpoint.
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
from extraction.date_extractor import (
    classify_date_type_by_context,
    detect_signing_date,
    extract_dates,
    resolve_relative_expression,
)

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"

failures: list[str] = []


def ok(msg: str) -> None:
    print(f"{PASS} {msg}")


def fail(msg: str) -> None:
    print(f"{FAIL} {msg}")
    failures.append(msg)


def main() -> None:
    print("\n=== Week 6 Date Extraction & Resolution Acceptance Tests ===\n")

    # ---------------------------------------------------------------------------
    # Test 1: Signing Date Detection
    # ---------------------------------------------------------------------------
    print("--- Test 1: Signing Date Auto-Detection ---")
    try:
        sample_text_1 = "This AGREEMENT is entered into this 15th day of August, 2026, by and between..."
        detected_1 = detect_signing_date(sample_text_1)
        assert detected_1 == "2026-08-15", f"Expected 2026-08-15, got {detected_1}"
        
        sample_text_2 = "The Effective Date of this contract is 31.03.2026. This governs..."
        detected_2 = detect_signing_date(sample_text_2)
        assert detected_2 == "2026-03-31", f"Expected 2026-03-31, got {detected_2}"
        
        ok("Signing date auto-detection matches standard patterns successfully.")
    except Exception as exc:
        fail(f"Signing date auto-detection failed: {exc}")

    # ---------------------------------------------------------------------------
    # Test 2: Date Entity Extraction (Absolute & Relative)
    # ---------------------------------------------------------------------------
    print("\n--- Test 2: Date Entity Extraction ---")
    try:
        sample_contract = (
            "This contract is signed on March 31, 2026. The employee shall be on a "
            "probationary period ending 90 days after signing. All payments must be "
            "received within 30 days from commencement. Notice for termination is "
            "60 days before expiration."
        )
        entities = extract_dates(sample_contract)
        
        raw_texts = [e["raw_text"].lower() for e in entities]
        
        # Verify absolute dates are caught
        assert any("march 31, 2026" in r or "march 31" in r for r in raw_texts), "Should extract absolute date"
        
        # Verify relative date patterns are caught
        assert any("90 days after signing" in r for r in raw_texts), "Should extract '90 days after signing'"
        assert any("30 days from commencement" in r for r in raw_texts), "Should extract '30 days from commencement'"
        assert any("60 days before expiration" in r for r in raw_texts), "Should extract '60 days before expiration'"
        
        ok(f"Successfully extracted {len(entities)} date candidate entities from contract text.")
    except Exception as exc:
        fail(f"Date extraction failed: {exc}")

    # ---------------------------------------------------------------------------
    # Test 3: Relative Date Arithmetic Resolution
    # ---------------------------------------------------------------------------
    print("\n--- Test 3: Relative Date Resolution ---")
    try:
        anchor = "2026-08-15"
        
        res_1 = resolve_relative_expression("90 days after signing", anchor)
        # 2026-08-15 + 90 days = 2026-11-13 (August: 16 days left, Sept: 30 days, Oct: 31 days, Nov: 13 days)
        assert res_1 == "2026-11-13", f"Expected 2026-11-13, got {res_1}"
        
        res_2 = resolve_relative_expression("2 weeks before signing", anchor)
        # 2026-08-15 - 14 days = 2026-08-01
        assert res_2 == "2026-08-01", f"Expected 2026-08-01, got {res_2}"
        
        res_3 = resolve_relative_expression("1 year after signing", anchor)
        # 2026-08-15 + 365 days = 2027-08-15
        assert res_3 == "2027-08-15", f"Expected 2027-08-15, got {res_3}"

        ok("Relative date calculation arithmetic matches expectations.")
    except Exception as exc:
        fail(f"Relative date calculation failed: {exc}")

    # ---------------------------------------------------------------------------
    # Test 4: Classification of Date Types
    # ---------------------------------------------------------------------------
    print("\n--- Test 4: Context-based Date Classification ---")
    try:
        assert classify_date_type_by_context("90 days after", "employee probationary period ends") == "probation_end"
        assert classify_date_type_by_context("within 30 days", "all payment invoices are due") == "payment_due"
        assert classify_date_type_by_context("60 days before", "provide prior written notice of termination") == "notice_deadline"
        assert classify_date_type_by_context("1 year after", "this contract shall expire and terminate") == "expiry_date"
        assert classify_date_type_by_context("automatic renewal", "for an extended term of 1 year") == "renewal_date"
        
        ok("Date category classification logic passes context verification.")
    except Exception as exc:
        fail(f"Classification test failed: {exc}")

    # ---------------------------------------------------------------------------
    # Test 5: FastAPI Date Route
    # ---------------------------------------------------------------------------
    print("\n--- Test 5: FastAPI extract-dates Route ---")
    try:
        client = TestClient(app)
        
        payload = {
            "doc_id": "test-uuid-dates",
            "s3_key": "sample_contract.pdf",
            "signing_date": "2026-08-15"
        }
        
        response = client.post("/internal/extract-dates", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["doc_id"] == "test-uuid-dates"
        assert data["signing_date"] == "2026-08-15"
        assert "dates" in data
        assert isinstance(data["dates"], list)
        
        # Verify returned dates shape
        if len(data["dates"]) > 0:
            first_date = data["dates"][0]
            assert "type" in first_date
            assert "raw_text" in first_date
            assert "resolved_date" in first_date
            assert "confidence" in first_date
            
        ok("/internal/extract-dates endpoint returns correctly shaped schema response.")
    except Exception as exc:
        fail(f"FastAPI Route test failed: {exc}")

    print("\n--- Summary ---")
    if failures:
        print(f"{FAIL} Week 6 tests failed with {len(failures)} failures.")
        for f in failures:
            print(f" - {f}")
        sys.exit(1)
    else:
        print(f"{PASS} All Week 6 Date Extraction & Resolution tests passed successfully!")


if __name__ == "__main__":
    main()
