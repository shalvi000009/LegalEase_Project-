"""
classification/diff_detector.py
================================
Week 8 — Deliverable 3: Diff Detection Engine.

Detects meaningful discrepancies between a document's previous analysis
and its freshly re-analyzed state. Flags changes if:
1. The overall risk_score shifts by +/-15 points or more.
2. A new high-risk / red-flag clause (risk_score >= 70 or risk_level == 'high')
   surfaces that was not flagged as high-risk in the prior analysis.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set

logger = logging.getLogger(__name__)

# Minimum absolute score change triggering user notification
SCORE_DELTA_THRESHOLD = 15

# Minimum clause risk score defining a "red flag"
RED_FLAG_SCORE_THRESHOLD = 70


@dataclass
class RedFlagClause:
    """Represents a red-flag clause surfaced in analysis."""
    clause_type: str
    risk_score: int
    risk_level: str
    text_snippet: str
    matching_rules: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "clause_type": self.clause_type,
            "risk_score": self.risk_score,
            "risk_level": self.risk_level,
            "text_snippet": self.text_snippet[:150],
            "matching_rules": self.matching_rules,
        }


@dataclass
class AnalysisDiffResult:
    """Result of diff comparison between previous and new analysis."""
    diff_detected: bool
    notify_user: bool
    score_delta: int
    previous_overall_score: Optional[int]
    new_overall_score: int
    significant_score_change: bool
    new_red_flags: List[Dict[str, Any]]
    reasons: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "diff_detected": self.diff_detected,
            "notify_user": self.notify_user,
            "score_delta": self.score_delta,
            "previous_overall_score": self.previous_overall_score,
            "new_overall_score": self.new_overall_score,
            "significant_score_change": self.significant_score_change,
            "new_red_flags_count": len(self.new_red_flags),
            "new_red_flags": self.new_red_flags,
            "reasons": self.reasons,
        }


def _extract_red_flag_types(clauses: List[Dict[str, Any]]) -> Set[str]:
    """Returns the set of clause types that were scored as high risk / red flag."""
    red_flags = set()
    for c in clauses:
        score = c.get("risk_score", 0)
        level = str(c.get("risk_level", "")).lower()
        if score >= RED_FLAG_SCORE_THRESHOLD or level == "high":
            c_type = c.get("clause_type") or "other"
            red_flags.add(c_type)
    return red_flags


def detect_analysis_diff(
    previous_analysis: Optional[Dict[str, Any]],
    new_analysis: Dict[str, Any],
) -> AnalysisDiffResult:
    """
    Compares previous analysis results against new analysis results.

    Args:
        previous_analysis: Dict containing 'overall_risk_score' and 'clauses' (or None).
        new_analysis: Dict containing new 'overall_risk_score' and 'clauses'.

    Returns:
        AnalysisDiffResult with flags and explanations for Shalvi's notification service.
    """
    new_score = int(new_analysis.get("overall_risk_score", 0))
    new_clauses = new_analysis.get("clauses", [])

    # If no previous analysis exists, this is a baseline run — not a diff
    if not previous_analysis:
        return AnalysisDiffResult(
            diff_detected=False,
            notify_user=False,
            score_delta=0,
            previous_overall_score=None,
            new_overall_score=new_score,
            significant_score_change=False,
            new_red_flags=[],
            reasons=["Initial baseline analysis (no previous analysis to compare against)."],
        )

    prev_score_raw = previous_analysis.get("overall_risk_score")
    prev_score = int(prev_score_raw) if prev_score_raw is not None else new_score
    prev_clauses = previous_analysis.get("clauses", [])

    # 1. Evaluate Overall Risk Score Delta (+/-15 threshold)
    score_delta = new_score - prev_score
    significant_score_change = abs(score_delta) >= SCORE_DELTA_THRESHOLD

    reasons: List[str] = []
    if significant_score_change:
        direction = f"+{score_delta}" if score_delta > 0 else f"{score_delta}"
        reasons.append(
            f"Overall contract risk score shifted significantly by {direction} points "
            f"(from {prev_score} to {new_score})."
        )

    # 2. Evaluate Newly Surfaced Red-Flag Clauses
    prev_red_flag_types = _extract_red_flag_types(prev_clauses)
    new_red_flags: List[Dict[str, Any]] = []

    for c in new_clauses:
        score = c.get("risk_score", 0)
        level = str(c.get("risk_level", "")).lower()
        c_type = c.get("clause_type") or "other"

        is_red_flag = score >= RED_FLAG_SCORE_THRESHOLD or level == "high"

        # Check if this high-risk clause is newly surfaced
        if is_red_flag and (c_type not in prev_red_flag_types):
            red_flag_item = RedFlagClause(
                clause_type=c_type,
                risk_score=score,
                risk_level=level or "high",
                text_snippet=str(c.get("text") or c.get("original_text") or "")[:150],
                matching_rules=c.get("matching_rules", []),
            )
            new_red_flags.append(red_flag_item.to_dict())
            reasons.append(
                f"Surfaced a new red-flag clause: '{c_type}' (Risk score: {score}, level: '{level}')."
            )

    # 3. Aggregate Verdict
    diff_detected = significant_score_change or (len(new_red_flags) > 0)
    notify_user = diff_detected

    if not diff_detected:
        reasons.append("No material discrepancies found (risk delta < 15 and no new red flags).")

    return AnalysisDiffResult(
        diff_detected=diff_detected,
        notify_user=notify_user,
        score_delta=score_delta,
        previous_overall_score=prev_score,
        new_overall_score=new_score,
        significant_score_change=significant_score_change,
        new_red_flags=new_red_flags,
        reasons=reasons,
    )
