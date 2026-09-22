"""
classification/dimension_scoring.py
===================================
Week 10 (Addition): Multi-Dimensional Risk Analysis Engine.

Extends the existing clause classification pipeline to score contracts across
five core risk dimensions instead of a single overall score:
  1. Financial Risk
  2. Legal Risk
  3. Privacy Risk
  4. Employment Risk
  5. Litigation Risk

Shared Team Contract:
---------------------
Dimension mapping:
  payment_terms                  -> Financial
  indemnity                      -> Financial, Legal
  termination                    -> Legal, Employment
  liability                      -> Legal, Litigation
  limitation_of_liability       -> Legal, Litigation
  confidentiality                -> Privacy
  non_compete                    -> Employment
  dispute_resolution/arbitration -> Litigation
  data_sharing                   -> Privacy
  compensation                   -> Financial, Employment
  breach_conditions              -> Legal, Litigation
  governing_law                  -> Legal
  other                          -> Legal (default fallback)

Default dimension weights for the overall score:
  Legal: 30%, Financial: 25%, Litigation: 20%, Privacy: 15%, Employment: 10%
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Canonical Risk Dimensions
# ---------------------------------------------------------------------------
RISK_DIMENSIONS: Tuple[str, ...] = (
    "financial",
    "legal",
    "privacy",
    "employment",
    "litigation",
)

# ---------------------------------------------------------------------------
# Default Team Weights (Must match across Rishi, Shalvi, Krina)
# ---------------------------------------------------------------------------
DEFAULT_DIMENSION_WEIGHTS: Dict[str, float] = {
    "legal": 0.30,
    "financial": 0.25,
    "litigation": 0.20,
    "privacy": 0.15,
    "employment": 0.10,
}

# ---------------------------------------------------------------------------
# Shared Dimension Mapping Table
# Maps clause types to one or more canonical dimensions.
# ---------------------------------------------------------------------------
CLAUSE_DIMENSION_MAPPING: Dict[str, List[str]] = {
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
    "dispute_resolution / arbitration": ["litigation"],
    "data_sharing": ["privacy"],
    "compensation": ["financial", "employment"],
    "breach_conditions": ["legal", "litigation"],
    "governing_law": ["legal"],
    # Extended standard types mapping to logical defaults:
    "non_solicitation": ["employment"],
    "intellectual_property": ["legal"],
    "force_majeure": ["legal"],
    "severability": ["legal"],
    "assignment": ["legal"],
    "other": ["legal"],
}

# Fallback dimension when a clause type is unknown
DEFAULT_FALLBACK_DIMENSIONS: List[str] = ["legal"]


def get_clause_dimensions(clause_type: str) -> List[str]:
    """
    Retrieves the canonical dimension(s) for a given clause type.
    Normalizes input (lowercased, stripped) and falls back to ['legal'].
    """
    if not clause_type:
        return list(DEFAULT_FALLBACK_DIMENSIONS)

    normalized = clause_type.strip().lower().replace("-", "_").replace(" ", "_")
    
    # Direct lookup
    if normalized in CLAUSE_DIMENSION_MAPPING:
        return list(CLAUSE_DIMENSION_MAPPING[normalized])

    # Check for slash variants e.g. "dispute_resolution/arbitration"
    for key, dims in CLAUSE_DIMENSION_MAPPING.items():
        if "/" in key:
            parts = [p.strip().replace(" ", "_") for p in key.split("/")]
            if normalized in parts:
                return list(dims)

    logger.debug(
        "Clause type '%s' not in canonical dimension mapping. Defaulting to %s.",
        clause_type,
        DEFAULT_FALLBACK_DIMENSIONS,
    )
    return list(DEFAULT_FALLBACK_DIMENSIONS)


def map_clause_dimensions(
    clause_type: str,
    risk_score: int,
    confidence: float = 1.0,
) -> Tuple[List[str], Dict[str, int]]:
    """
    Maps a single classified clause to its target risk dimension(s) and assigns
    dimension scores.

    Multi-Dimension Policy:
    -----------------------
    When a clause maps to multiple dimensions (e.g. indemnity -> financial, legal),
    we duplicate the full risk score across each mapped dimension. An indemnity clause
    exposing high exposure constitutes both a financial risk and a legal risk.

    Args:
        clause_type: Classified clause name (e.g. 'indemnity', 'payment_terms').
        risk_score: Calculated risk score (0-100) for this clause.
        confidence: Classification model confidence (0.0 - 1.0).

    Returns:
        Tuple of (dimensions_list, dimension_scores_dict)
        Example: (["financial", "legal"], {"financial": 60, "legal": 60})
    """
    target_dims = get_clause_dimensions(clause_type)
    clamped_score = max(0, min(100, int(risk_score)))

    # Dual/multi attribution: assign full clause risk score to each associated dimension
    dim_scores: Dict[str, int] = {dim: clamped_score for dim in target_dims}

    return target_dims, dim_scores


def aggregate_dimension_scores(
    clauses: List[Dict[str, Any]],
    weights: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """
    Aggregates per-clause dimension contributions into per-contract dimension scores
    (0-100 for each of the five dimensions) and computes the weighted overall score.

    Aggregation Formula:
    --------------------
    For each dimension d:
      - If no clauses map to d: score is 0.
      - If clauses map to d:
          score_d = round(0.6 * mean(S_d) + 0.4 * max(S_d))
          clamped to [0, 100].

    Weighted Overall Score:
    -----------------------
    Weighted sum using team-agreed weights (Legal 30%, Financial 25%, Litigation 20%,
    Privacy 15%, Employment 10%).

    Explainability:
    ---------------
    Provides `dimension_explanations`, mapping each dimension to its top contributing
    clauses (chunk index, clause type, risk score, text preview).

    Args:
        clauses: List of clause dicts. Each clause dict should contain:
                 - chunk_index: int
                 - clause_type: str
                 - risk_score: int
                 - text: str (optional)
                 - dimension_scores: Dict[str, int] (optional; computed if missing)
        weights: Custom weights dict (optional; defaults to DEFAULT_DIMENSION_WEIGHTS).

    Returns:
        Dict containing:
          - risk_dimensions: Dict[str, int] (0-100 for each of 5 dimensions)
          - weighted_risk_score: int (0-100)
          - dimension_weights: Dict[str, float]
          - dimension_explanations: Dict[str, List[Dict[str, Any]]]
    """
    effective_weights = weights or DEFAULT_DIMENSION_WEIGHTS

    # Group scores and explanations by dimension
    dim_scores_map: Dict[str, List[int]] = {dim: [] for dim in RISK_DIMENSIONS}
    dim_clauses_map: Dict[str, List[Dict[str, Any]]] = {dim: [] for dim in RISK_DIMENSIONS}

    for clause in clauses:
        clause_type = clause.get("clause_type", "other")
        risk_score = clause.get("risk_score", 0)
        chunk_index = clause.get("chunk_index", 0)
        text = clause.get("text", "")

        # Determine dimensions for this clause
        if "dimension_scores" in clause and isinstance(clause["dimension_scores"], dict):
            clause_dim_scores = clause["dimension_scores"]
            target_dims = list(clause_dim_scores.keys())
        else:
            target_dims, clause_dim_scores = map_clause_dimensions(clause_type, risk_score)

        for dim in target_dims:
            if dim in dim_scores_map:
                score_val = clause_dim_scores.get(dim, risk_score)
                dim_scores_map[dim].append(score_val)
                dim_clauses_map[dim].append({
                    "chunk_index": chunk_index,
                    "clause_type": clause_type,
                    "risk_score": score_val,
                    "text_snippet": (text[:120] + "...") if len(text) > 120 else text,
                })

    # Calculate aggregate score per dimension
    risk_dimensions: Dict[str, int] = {}
    dimension_explanations: Dict[str, List[Dict[str, Any]]] = {}

    for dim in RISK_DIMENSIONS:
        scores = dim_scores_map[dim]
        if not scores:
            risk_dimensions[dim] = 0
            dimension_explanations[dim] = []
        else:
            avg_score = sum(scores) / len(scores)
            max_score = max(scores)
            # Calibrated combination: 60% average, 40% maximum risk
            dim_score = int(round(0.6 * avg_score + 0.4 * max_score))
            risk_dimensions[dim] = max(0, min(100, dim_score))

            # Rank contributing clauses by risk_score descending for explainability
            sorted_clauses = sorted(
                dim_clauses_map[dim],
                key=lambda x: x["risk_score"],
                reverse=True,
            )
            dimension_explanations[dim] = sorted_clauses

    # Calculate weighted overall score
    raw_weighted = sum(
        effective_weights.get(dim, 0.20) * risk_dimensions.get(dim, 0)
        for dim in RISK_DIMENSIONS
    )
    weighted_risk_score = max(0, min(100, int(round(raw_weighted))))

    return {
        "risk_dimensions": risk_dimensions,
        "weighted_risk_score": weighted_risk_score,
        "dimension_weights": effective_weights,
        "dimension_explanations": dimension_explanations,
    }
