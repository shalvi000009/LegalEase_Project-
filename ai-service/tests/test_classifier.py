"""
tests/test_classifier.py
========================
Tests the fine-tuned Legal-BERT clause classifier against archetypal clause sentences.
Skipped automatically if the model folder is missing.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

# Ensure ai-service root is in sys.path
AI_SERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AI_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_DIR))

from classification.classifier import ClauseClassifier, resolve_model_path

MODEL_DIR = resolve_model_path()
MODEL_EXISTS = MODEL_DIR.exists() and MODEL_DIR.is_dir()

TEST_CASES = [
    (
        "Either party may terminate this Agreement for convenience upon thirty (30) days written notice.",
        "termination",
    ),
    (
        "Employee shall not engage in any competing business within 24 months after termination.",
        "non_compete",
    ),
    (
        "In no event shall either party be liable for indirect or consequential damages exceeding the fees paid.",
        "liability_limitation",
    ),
    (
        "This Agreement shall be governed by the laws of the State of New York.",
        "governing_law",
    ),
    (
        "Neither party shall be liable for delay caused by events beyond its reasonable control such as natural disasters.",
        "force_majeure",
    ),
    (
        "The parties shall settle any dispute by binding arbitration in London under ICC rules.",
        "arbitration",
    ),
    (
        "This Agreement shall automatically renew for successive one-year terms unless either party gives notice.",
        "auto_renewal",
    ),
    (
        "The Processor shall process personal data only in accordance with applicable data protection laws.",
        "data_privacy",
    ),
]


@pytest.mark.skipif(not MODEL_EXISTS, reason=f"Model directory missing at {MODEL_DIR}")
def test_fine_tuned_clause_classifier():
    classifier = ClauseClassifier()
    assert classifier.mode == "finetuned", f"Expected 'finetuned' mode, but got '{classifier.mode}'"

    correct = 0
    for text, expected_label in TEST_CASES:
        result = classifier.classify_text(text)

        assert "clause_type" in result
        assert "confidence" in result
        assert "top3" in result
        assert isinstance(result["top3"], list)
        assert len(result["top3"]) > 0

        predicted_label = result["clause_type"]
        if predicted_label == expected_label:
            correct += 1

    assert correct >= 7, f"Expected at least 7 of 8 correct, got {correct}/8"


@pytest.mark.skipif(not MODEL_EXISTS, reason=f"Model directory missing at {MODEL_DIR}")
def test_numbered_heading_clauses():
    classifier = ClauseClassifier()
    res1 = classifier.classify_text(
        "2. PAYMENT TERMS\nClient shall pay Service Provider USD 5,000 per month, due within 30 days of invoice."
    )
    assert res1["clause_type"] == "payment_terms"

    res2 = classifier.classify_text(
        "6. INTELLECTUAL PROPERTY\nAll deliverables created under this Agreement remain the exclusive property of the Client."
    )
    assert res2["clause_type"] == "ip_ownership"
