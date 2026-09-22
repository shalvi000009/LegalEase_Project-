"""
classification/versioning.py
============================
Week 8 — Deliverable 1: Model Versioning System.

Defines model versioning conventions, metadata tracking, and staleness
detection utilities for LegalEase contract analyses.
"""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

# Standard model version identifier (can be overridden via environment)
CURRENT_MODEL_VERSION: str = os.getenv("MODEL_VERSION", "legalease-v1.2.0")

# Detailed metadata for the current production model release
MODEL_METADATA: Dict[str, Any] = {
    "version": CURRENT_MODEL_VERSION,
    "release_date": "2026-09-22",
    "clause_classifier": "legal-bert-base-uncased / tfidf-calibrated",
    "risk_scoring_rules_version": "2.4.0",
    "document_classifier_version": "1.0.0",
    "date_extractor_version": "1.1.0",
    "description": (
        "Production multi-stage pipeline: Legal-BERT clause classification, "
        "calibrated risk scoring, OCR fallback, and multi-channel document screening."
    ),
}


def parse_semver(version_str: str) -> Tuple[int, int, int]:
    """
    Extracts (major, minor, patch) integers from version strings such as:
    'legalease-v1.2.0', 'v1.2.0', '1.2.0', 'legal-bert-v1.0.0', etc.
    Falls back to (0, 0, 0) if parsing fails.
    """
    if not version_str:
        return (0, 0, 0)

    # Find the first sequence of digits separated by dots
    match = re.search(r"(\d+)\.(\d+)(?:\.(\d+))?", version_str.strip())
    if match:
        major = int(match.group(1))
        minor = int(match.group(2))
        patch = int(match.group(3)) if match.group(3) else 0
        return (major, minor, patch)

    return (0, 0, 0)


@dataclass
class StaleCheckResult:
    """Outcome of a version staleness check."""
    is_stale: bool
    current_version: str
    document_version: str
    reason: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_stale": self.is_stale,
            "current_version": self.current_version,
            "document_version": self.document_version,
            "reason": self.reason,
        }


def is_stale_version(
    doc_version: Optional[str],
    current_version: str = CURRENT_MODEL_VERSION,
) -> bool:
    """
    Determines whether an analysis model version is stale compared to the current version.

    Rules:
    - If doc_version is None or empty -> True (stale)
    - If doc_version == current_version -> False (up to date)
    - If semver(doc_version) < semver(current_version) -> True (stale)
    - Otherwise (different prefix or unrecognized tag) -> True (stale)
    """
    if not doc_version or not doc_version.strip():
        return True

    doc_version_clean = doc_version.strip().lower()
    current_version_clean = current_version.strip().lower()

    if doc_version_clean == current_version_clean:
        return False

    v_doc = parse_semver(doc_version_clean)
    v_curr = parse_semver(current_version_clean)

    if v_doc < v_curr:
        return True

    # If versions match numerically but tag is legacy (e.g. 'fallback' or 'v1.0.0' vs 'legalease-v1.2.0')
    if v_doc == v_curr and doc_version_clean != current_version_clean:
        return True

    return False


def check_analysis_staleness(
    model_version: Optional[str],
    current_version: str = CURRENT_MODEL_VERSION,
) -> StaleCheckResult:
    """
    Returns a detailed StaleCheckResult explaining why an analysis is or isn't stale.
    """
    doc_ver_str = model_version or "unknown"
    stale = is_stale_version(model_version, current_version)

    if not model_version:
        reason = "Analysis lacks model_version metadata (legacy analysis)."
    elif stale:
        reason = (
            f"Analysis was generated using '{model_version}', which is older than "
            f"the active production version '{current_version}'."
        )
    else:
        reason = f"Analysis is up to date with active production version '{current_version}'."

    return StaleCheckResult(
        is_stale=stale,
        current_version=current_version,
        document_version=doc_ver_str,
        reason=reason,
    )
