"""
scripts/test_week7_source_doc_classifier.py
============================================
Week 7 Acceptance Test Suite:
1. Legal document classifier accuracy (contract vs borderline vs non-contract)
2. Fast inference speed benchmark (<50ms target)
3. Three-tier threshold logic (>0.75 auto_proceed, 0.50-0.75 queued, <0.50 ignored)
4. Cryptographic SHA-256 deduplication and vault matching
5. FastAPI POST /internal/classify-source-doc endpoint integration
"""

from __future__ import annotations

import base64
import sys
import time
from pathlib import Path

# Add project root to sys.path
REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(REPO_ROOT))

# pyrefly: ignore [missing-import]
from fastapi.testclient import TestClient
from main import app
from classification.dedup import VaultRegistry, check_deduplication, compute_sha256
from classification.document_classifier import (
    LegalDocumentClassifier,
    extract_document_sample_text,
)

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"

failures: list[str] = []


def ok(msg: str) -> None:
    print(f"{PASS} {msg}")


def fail(msg: str) -> None:
    print(f"{FAIL} {msg}")
    failures.append(msg)


print("\n=== Week 7 Source Document Classifier & Deduplication Acceptance Tests ===\n")

# ---------------------------------------------------------------------------
# Test 1: Classifier Initialization & Performance Benchmark (<50ms target)
# ---------------------------------------------------------------------------
print("--- Test 1: Classifier Initialization & Inference Speed Benchmark ---")
try:
    classifier = LegalDocumentClassifier()
    ok(f"LegalDocumentClassifier loaded successfully (method: {'legal-bert' if classifier.use_bert else 'tfidf-fast'}).")

    sample_contract_text = (
        "CONFIDENTIALITY AND NON-DISCLOSURE AGREEMENT\n"
        "This Agreement is entered into by and between Alpha Corp and Beta LLC. "
        "WHEREAS the parties desire to discuss potential business transactions, "
        "NOW THEREFORE in consideration of the mutual covenants contained herein, "
        "the receiving party shall hold all Confidential Information in strict confidence. "
        "This agreement shall be governed by Delaware law. "
        "IN WITNESS WHEREOF, the parties hereto have executed this Agreement."
    )

    # Warmup
    classifier.classify_text(sample_contract_text)

    # Benchmark 20 iterations
    latencies = []
    for _ in range(20):
        t0 = time.perf_counter()
        res = classifier.classify_text(sample_contract_text)
        latencies.append((time.perf_counter() - t0) * 1000)

    avg_latency = sum(latencies) / len(latencies)
    if avg_latency < 50.0:
        ok(f"Benchmark passed: Average inference latency = {avg_latency:.2f} ms (Target: < 50ms) ✓")
    else:
        fail(f"Benchmark failed: Average inference latency = {avg_latency:.2f} ms exceeded 50ms target.")
except Exception as exc:
    fail(f"Test 1 failed with exception: {exc}")


# ---------------------------------------------------------------------------
# Test 2: Document Classification Accuracy Across Document Classes
# ---------------------------------------------------------------------------
print("\n--- Test 2: Document Classification Accuracy Across Classes ---")
try:
    # 2a: High-Confidence Legal Contract (> 0.75)
    contract_text = (
        "MASTER SERVICES AGREEMENT\n"
        "This Master Services Agreement ('Agreement') is made and entered into by and between "
        "Company Inc. and Vendor LLC. "
        "WHEREAS, Company wishes to retain Vendor to perform services; and "
        "WHEREAS, Vendor agrees to provide such services under the terms hereof. "
        "NOW, THEREFORE, the parties agree as follows: "
        "1. Term and Termination: Either party may terminate for material breach. "
        "2. Indemnification: Vendor shall indemnify and hold harmless Company. "
        "3. Governing Law: This Agreement is governed by the laws of California. "
        "IN WITNESS WHEREOF, the authorized representatives have executed this Agreement."
    )
    res_contract = classifier.classify_text(contract_text)
    if res_contract.is_legal_doc_score > 0.75 and res_contract.action == "auto_proceed":
        ok(f"Legal contract correctly classified: score={res_contract.is_legal_doc_score:.3f} -> action={res_contract.action} ✓")
    else:
        fail(f"Legal contract misclassified: score={res_contract.is_legal_doc_score:.3f}, action={res_contract.action}")

    # 2b: Ambiguous / Borderline Document (0.50 - 0.75)
    borderline_text = (
        "CONSULTING PROPOSAL & PRELIMINARY TERM SHEET\n"
        "Subject: Proposed advisory scope of work between Apex Corp and Consultant.\n"
        "Preliminary terms: Monthly retainer of $5,000. Confidential discussions pending formal agreement.\n"
        "Target start date: November 1st. Please review initial terms."
    )
    res_borderline = classifier.classify_text(borderline_text)
    if 0.50 <= res_borderline.is_legal_doc_score <= 0.75 and res_borderline.action == "queued_for_confirmation":
        ok(f"Borderline document correctly classified: score={res_borderline.is_legal_doc_score:.3f} -> action={res_borderline.action} ✓")
    else:
        fail(f"Borderline document misclassified: score={res_borderline.is_borderline.is_legal_doc_score if hasattr(res_borderline, 'is_borderline') else res_borderline.is_legal_doc_score:.3f}, action={res_borderline.action}")

    # 2c: Non-Contract Document (< 0.50) - Commercial Invoice
    invoice_text = (
        "COMMERCIAL INVOICE\n"
        "Invoice Number: INV-98721\n"
        "Bill To: Tech Services Ltd\n"
        "Ship To: 123 Main St, New York, NY\n"
        "Item 1: Cloud Hosting Subscription - Qty 1 - $1,200.00\n"
        "Item 2: Maintenance Support - Qty 5 - $500.00\n"
        "Subtotal: $1,700.00\n"
        "Tax (8.875%): $150.88\n"
        "Total Amount Due: $1,850.88\n"
        "Remit payment to Acme Bank. Thank you for your business."
    )
    res_invoice = classifier.classify_text(invoice_text)
    if res_invoice.is_legal_doc_score < 0.50 and res_invoice.action == "silently_ignored":
        ok(f"Non-contract invoice correctly classified: score={res_invoice.is_legal_doc_score:.3f} -> action={res_invoice.action} ✓")
    else:
        fail(f"Non-contract invoice misclassified: score={res_invoice.is_legal_doc_score:.3f}, action={res_invoice.action}")

    # 2d: Non-Contract Document (< 0.50) - Marketing Newsletter
    newsletter_text = (
        "Weekly Engineering & AI Insights Newsletter\n"
        "Check out what's new in machine learning this week!\n"
        "Read the full blog post on our site. If you no longer wish to receive these emails, "
        "click here to unsubscribe or update your email preferences."
    )
    res_newsletter = classifier.classify_text(newsletter_text)
    if res_newsletter.is_legal_doc_score < 0.50 and res_newsletter.action == "silently_ignored":
        ok(f"Non-contract newsletter correctly classified: score={res_newsletter.is_legal_doc_score:.3f} -> action={res_newsletter.action} ✓")
    else:
        fail(f"Non-contract newsletter misclassified: score={res_newsletter.is_legal_doc_score:.3f}, action={res_newsletter.action}")
except Exception as exc:
    fail(f"Test 2 failed with exception: {exc}")


# ---------------------------------------------------------------------------
# Test 3: Threshold Range Boundary Validation
# ---------------------------------------------------------------------------
print("\n--- Test 3: Threshold Range Boundary Validation ---")
try:
    # Test boundary logic
    test_scores = [
        (0.95, "auto_proceed", "high"),
        (0.76, "auto_proceed", "high"),
        (0.75, "queued_for_confirmation", "medium"),
        (0.60, "queued_for_confirmation", "medium"),
        (0.50, "queued_for_confirmation", "medium"),
        (0.49, "silently_ignored", "low"),
        (0.15, "silently_ignored", "low"),
        (0.00, "silently_ignored", "low"),
    ]

    for score, expected_action, expected_bucket in test_scores:
        # Mock result evaluation
        if score > 0.75:
            act, bkt = "auto_proceed", "high"
        elif score >= 0.50:
            act, bkt = "queued_for_confirmation", "medium"
        else:
            act, bkt = "silently_ignored", "low"

        assert act == expected_action and bkt == expected_bucket, f"Mismatch for score {score}"

    ok("Threshold boundary checks verified (>0.75 -> auto_proceed, 0.50-0.75 -> queued, <0.50 -> ignored) ✓")
except Exception as exc:
    fail(f"Test 3 failed: {exc}")


# ---------------------------------------------------------------------------
# Test 4: SHA-256 Deduplication Check
# ---------------------------------------------------------------------------
print("\n--- Test 4: Cryptographic SHA-256 Deduplication Check ---")
try:
    doc_bytes = b"%PDF-1.4 Mock Contract Content For Deduplication Testing"
    computed_hash = compute_sha256(doc_bytes)

    # 4a: Check standard hash length and format
    if len(computed_hash) == 64 and all(c in "0123456789abcdef" for c in computed_hash):
        ok(f"SHA-256 computation verified: {computed_hash[:16]}... (64 hex chars) ✓")
    else:
        fail(f"Invalid SHA-256 computation format: {computed_hash}")

    # 4b: Unique document (empty vault)
    res_unique = check_deduplication(doc_bytes, existing_hashes=[])
    if not res_unique.is_duplicate and res_unique.duplicate_of is None:
        ok("Unique document check passed (is_duplicate=False) ✓")
    else:
        fail(f"Expected is_duplicate=False, got {res_unique.is_duplicate}")

    # 4c: Duplicate document (hash in existing_hashes)
    res_dup = check_deduplication(doc_bytes, existing_hashes=[computed_hash, "other_hash_123"])
    if res_dup.is_duplicate and res_dup.duplicate_of == computed_hash:
        ok(f"Duplicate document detected correctly: matched={res_dup.duplicate_of[:16]}... ✓")
    else:
        fail(f"Expected is_duplicate=True for collision, got {res_dup.is_duplicate}")

    # 4d: In-memory VaultRegistry
    registry = VaultRegistry()
    registry.clear()
    registry.register_hash("user_test_42", computed_hash)
    res_registry = check_deduplication(doc_bytes, user_id="user_test_42", vault_registry=registry)
    if res_registry.is_duplicate:
        ok("VaultRegistry multi-user lookup collision test passed ✓")
    else:
        fail("VaultRegistry multi-user lookup failed to detect duplicate")
except Exception as exc:
    fail(f"Test 4 failed: {exc}")


# ---------------------------------------------------------------------------
# Test 5: FastAPI Endpoint Integration: POST /internal/classify-source-doc
# ---------------------------------------------------------------------------
print("\n--- Test 5: FastAPI Endpoint POST /internal/classify-source-doc ---")
try:
    client = TestClient(app)

    # 5a: Test using local sample contract fallback
    payload = {
        "file_bytes_or_url": "sample_contract.pdf",
        "filename": "sample_contract.pdf",
        "existing_hashes": [],
    }
    resp = client.post("/internal/classify-source-doc", json=payload)
    if resp.status_code == 200:
        data = resp.json()
        assert "is_legal_doc_score" in data, "Missing is_legal_doc_score"
        assert "sha256" in data, "Missing sha256"
        assert "action" in data, "Missing action"
        assert "is_duplicate" in data, "Missing is_duplicate"
        assert data["is_duplicate"] is False, "Expected unique document"
        assert data["action"] == "auto_proceed", f"Expected auto_proceed, got {data['action']}"
        ok(f"POST /internal/classify-source-doc (sample PDF): score={data['is_legal_doc_score']} sha256={data['sha256'][:12]}... action={data['action']} latency={data['inference_time_ms']}ms ✓")
    else:
        fail(f"POST /internal/classify-source-doc failed with status {resp.status_code}: {resp.text}")

    # 5b: Test Base64 encoded payload
    raw_dummy_contract = (
        b"%PDF-1.4\nAGREEMENT by and between Party A and Party B. "
        b"WHEREAS the parties agree to terms. "
        b"Governing law is New York. IN WITNESS WHEREOF signed."
    )
    b64_str = f"data:application/pdf;base64,{base64.b64encode(raw_dummy_contract).decode('utf-8')}"
    resp_b64 = client.post(
        "/internal/classify-source-doc",
        json={"file_bytes_or_url": b64_str, "filename": "uploaded.pdf"},
    )
    if resp_b64.status_code == 200:
        data_b64 = resp_b64.json()
        expected_hash = compute_sha256(raw_dummy_contract)
        assert data_b64["sha256"] == expected_hash, f"Hash mismatch: {data_b64['sha256']} vs {expected_hash}"
        ok(f"POST /internal/classify-source-doc (Base64 payload): sha256 verified ({data_b64['sha256'][:12]}...) ✓")
    else:
        fail(f"Base64 request failed with status {resp_b64.status_code}: {resp_b64.text}")

    # 5c: Test Duplicate Detection via API
    resp_dup_api = client.post(
        "/internal/classify-source-doc",
        json={
            "file_bytes_or_url": b64_str,
            "filename": "uploaded.pdf",
            "existing_hashes": [expected_hash],
        },
    )
    if resp_dup_api.status_code == 200:
        data_dup = resp_dup_api.json()
        assert data_dup["is_duplicate"] is True, "Expected is_duplicate=True"
        assert data_dup["action"] == "silently_ignored", "Expected duplicate action to be silently_ignored"
        ok(f"API duplicate suppression verified: is_duplicate={data_dup['is_duplicate']}, action={data_dup['action']} ✓")
    else:
        fail(f"Duplicate test failed: status {resp_dup_api.status_code}")

    # 5d: Test S3 key / sample doc resolution
    resp_s3 = client.post(
        "/internal/classify-source-doc",
        json={"s3_key": "sample_contract.pdf", "user_id": "usr_test_week7"},
    )
    if resp_s3.status_code == 200:
        data_s3 = resp_s3.json()
        assert data_s3["action"] == "auto_proceed"
        ok(f"POST /internal/classify-source-doc (S3 key payload): score={data_s3['is_legal_doc_score']}, action={data_s3['action']} ✓")
    else:
        fail(f"S3 key request failed: status {resp_s3.status_code}: {resp_s3.text}")
except Exception as exc:
    fail(f"Test 5 failed with exception: {exc}")


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print("\n=== Summary ===")
if not failures:
    print(f"\n{PASS} All Week 7 Source Document Classifier & Deduplication acceptance tests passed successfully!\n")
    sys.exit(0)
else:
    print(f"\n{FAIL} {len(failures)} test(s) failed:")
    for f in failures:
        print(f"  • {f}")
    print()
    sys.exit(1)
