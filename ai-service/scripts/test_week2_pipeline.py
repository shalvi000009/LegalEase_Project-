"""
scripts/test_week2_pipeline.py
===============================
Week 2 acceptance test script — run without live API keys.

Tests:
  1. PyMuPDF text extraction on sample_docs/sample_contract.pdf
  2. OpenCV preprocessing on sample_docs/sample_scanned.png
  3. LangChain chunking — verify chunk count and size bounds
  4. Stub embed_and_upsert — verify return shape and stub flag
  5. POST /internal/extract — verify correctly-shaped JSON response with stubbed internals
  6. Verify all stubs carry a TODO comment (static grep)

Run:
    .venv/bin/python scripts/test_week2_pipeline.py
"""

from __future__ import annotations

import importlib
import re
import subprocess
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(REPO_ROOT))

PASS = "\033[92m[PASS]\033[0m"
FAIL = "\033[91m[FAIL]\033[0m"
WARN = "\033[93m[WARN]\033[0m"

failures: list[str] = []


def ok(msg: str) -> None:
    print(f"{PASS} {msg}")


def fail(msg: str) -> None:
    print(f"{FAIL} {msg}")
    failures.append(msg)


def warn(msg: str) -> None:
    print(f"{WARN} {msg}")


# ---------------------------------------------------------------------------
# Pre-flight: sample docs must exist
# ---------------------------------------------------------------------------
SAMPLE_PDF = REPO_ROOT / "sample_docs" / "sample_contract.pdf"
SAMPLE_IMG = REPO_ROOT / "sample_docs" / "sample_scanned.png"

print("\n=== Week 2 Pipeline Acceptance Tests ===\n")

if not SAMPLE_PDF.exists() or not SAMPLE_IMG.exists():
    print("Sample docs not found — generating them first...")
    result = subprocess.run(
        [sys.executable, str(REPO_ROOT / "scripts" / "generate_sample_docs.py")],
        capture_output=True, text=True
    )
    print(result.stdout)
    if result.returncode != 0:
        fail(f"generate_sample_docs.py failed: {result.stderr}")

# ---------------------------------------------------------------------------
# Test 1: PyMuPDF PDF extraction
# ---------------------------------------------------------------------------
print("--- Test 1: PDF Extraction (PyMuPDF) ---")
try:
    from extraction.pdf_extractor import extract_text_from_pdf, is_scanned_pdf

    result = extract_text_from_pdf(str(SAMPLE_PDF))
    assert result["page_count"] >= 1, "Expected at least 1 page"
    assert len(result["full_text"]) > 100, "Expected substantial text"
    assert isinstance(result["metadata"], dict), "metadata should be a dict"
    ok(f"PDF extracted: {result['page_count']} pages, {len(result['full_text'])} chars")

    is_scanned = is_scanned_pdf(str(SAMPLE_PDF))
    assert is_scanned is False, "Sample PDF is digital — should not be flagged as scanned"
    ok(f"is_scanned_pdf = {is_scanned} (correct: digital PDF)")

except Exception as exc:
    fail(f"PDF extraction failed: {exc}")

# ---------------------------------------------------------------------------
# Test 2: OpenCV preprocessing
# ---------------------------------------------------------------------------
print("\n--- Test 2: OpenCV Preprocessing ---")
try:
    from extraction.ocr_preprocessor import preprocess_image

    result = preprocess_image(str(SAMPLE_IMG))
    assert result["processed_image"] is not None, "processed_image should not be None"
    assert result["deskew_applied"] is True, "deskew should be applied"
    assert result["enhance_applied"] is True, "enhance should be applied"
    ok(
        f"Preprocessing done: original_shape={result['original_shape']}, "
        f"processed_shape={result['processed_shape']}, "
        f"warp={result['warp_applied']}, deskew={result['deskew_applied']}, "
        f"enhance={result['enhance_applied']}"
    )

except Exception as exc:
    fail(f"OpenCV preprocessing failed: {exc}")

# ---------------------------------------------------------------------------
# Test 3: Text chunking
# ---------------------------------------------------------------------------
print("\n--- Test 3: Text Chunking (LangChain) ---")
try:
    from extraction.chunker import chunk_text, chunk_stats, CHUNK_SIZE, CHUNK_OVERLAP

    # Use extracted PDF text (from Test 1 if available)
    sample_text = ""
    try:
        from extraction.pdf_extractor import extract_text_from_pdf as _etf
        sample_text = _etf(str(SAMPLE_PDF))["full_text"]
    except Exception:
        pass
    if not sample_text:
        sample_text = "This is a test contract clause. " * 200

    chunks = chunk_text(sample_text, doc_id="test-doc-001")
    stats = chunk_stats(chunks)

    assert len(chunks) >= 1, "Expected at least 1 chunk"
    assert stats["max_chars"] <= CHUNK_SIZE * 1.1, (
        f"Max chunk size {stats['max_chars']} exceeds limit {CHUNK_SIZE}"
    )
    assert all("chunk_index" in c for c in chunks), "Every chunk must have chunk_index"
    assert all("text" in c for c in chunks), "Every chunk must have text"
    assert all("approx_tokens" in c for c in chunks), "Every chunk must have approx_tokens"
    assert all(c["doc_id"] == "test-doc-001" for c in chunks), "doc_id must propagate"

    ok(f"Chunking: {stats['total_chunks']} chunks, avg={stats['avg_chars']:.0f} chars, "
       f"max={stats['max_chars']} chars (limit={CHUNK_SIZE}), "
       f"avg_tokens≈{stats['avg_approx_tokens']:.0f}")

except Exception as exc:
    fail(f"Chunking failed: {exc}")

# ---------------------------------------------------------------------------
# Test 4: Embeddings stub
# ---------------------------------------------------------------------------
print("\n--- Test 4: Embed+Upsert Stub ---")
try:
    from extraction.embeddings import embed_and_upsert, EMBEDDING_DIM

    sample_chunks = [
        {"chunk_index": 0, "text": "Clause 1 text", "doc_id": "doc-001"},
        {"chunk_index": 1, "text": "Clause 2 text", "doc_id": "doc-001"},
    ]
    eu_result = embed_and_upsert("doc-001", sample_chunks)

    assert eu_result["stub"] is True, "stub flag must be True"
    assert eu_result["total_chunks"] == 2, "total_chunks must equal input"
    assert eu_result["upserted_count"] == 2, "upserted_count must equal input"
    assert eu_result["doc_id"] == "doc-001"
    assert eu_result["namespace"] == "doc-001"
    ok(f"Stub embed_and_upsert returned: {eu_result}")

except Exception as exc:
    fail(f"Embeddings stub failed: {exc}")

# ---------------------------------------------------------------------------
# Test 5: POST /internal/extract returns correctly-shaped JSON (with stubs)
# ---------------------------------------------------------------------------
print("\n--- Test 5: POST /internal/extract route shape ---")
try:
    from fastapi.testclient import TestClient  # type: ignore[import-untyped]
    from main import app

    client = TestClient(app)
    payload = {"doc_id": "route-test-001", "s3_key": f"usr_test/route-test-001/sample_contract.pdf"}
    response = client.post("/internal/extract", json=payload)

    assert response.status_code == 200, (
        f"Expected 200, got {response.status_code}: {response.text}"
    )

    body = response.json()
    required_top_keys = {"status", "doc_id", "pipeline", "chunk_stats", "embed_upsert", "stubs_active"}
    missing = required_top_keys - set(body.keys())
    assert not missing, f"Response missing keys: {missing}"
    assert body["status"] == "ok"
    assert body["doc_id"] == "route-test-001"
    assert body["pipeline"] in ("pdf", "ocr")
    assert body["stubs_active"]["s3_fetch"] is True
    assert body["stubs_active"]["embeddings"] is True
    assert body["stubs_active"]["pinecone_upsert"] is True

    cs = body["chunk_stats"]
    for k in ("total_chunks", "total_chars", "avg_chars", "min_chars", "max_chars", "avg_approx_tokens"):
        assert k in cs, f"chunk_stats missing key: {k}"

    eu = body["embed_upsert"]
    for k in ("doc_id", "namespace", "total_chunks", "upserted_count", "stub"):
        assert k in eu, f"embed_upsert missing key: {k}"
    assert eu["stub"] is True

    ok(f"/internal/extract → pipeline='{body['pipeline']}', "
       f"chunks={cs['total_chunks']}, stubs={body['stubs_active']}")

except Exception as exc:
    fail(f"Route test failed: {exc}")

# Test the health check still works
try:
    from fastapi.testclient import TestClient
    from main import app
    client = TestClient(app)
    r = client.get("/health")
    assert r.status_code == 200
    ok("/health still returns 200 (Week 1 not broken)")
except Exception as exc:
    fail(f"/health broken: {exc}")

# ---------------------------------------------------------------------------
# Test 6: All stubs carry a TODO comment (static analysis)
# ---------------------------------------------------------------------------
print("\n--- Test 6: TODO comment presence in stub code ---")
stub_files = [
    REPO_ROOT / "extraction" / "embeddings.py",
    REPO_ROOT / "routers" / "internal_extract.py",
]
TODO_PATTERN = re.compile(r"#\s*TODO:\s*BLOCKED", re.IGNORECASE)

for f in stub_files:
    content = f.read_text()
    matches = TODO_PATTERN.findall(content)
    if matches:
        ok(f"{f.name}: {len(matches)} TODO:BLOCKED comment(s) found ✓")
    else:
        fail(f"{f.name}: No TODO:BLOCKED comments found!")

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
    print(f"{PASS} All tests passed!")
    sys.exit(0)
