"""
classification/risk_scoring.py
===============================
Risk scoring engine for contract clauses.
Combines clause types, keyword-based rules, and weights to determine risk levels.
"""

from __future__ import annotations

import logging
import re
from typing import Dict, List, Tuple

logger = logging.getLogger(__name__)


class RiskRule:
    """
    A single rule that modifies the risk score if its pattern is found in the clause text.
    """

    def __init__(
        self,
        pattern: str,
        weight: int,
        description: str,
        is_regex: bool = False,
    ):
        self.pattern = pattern
        self.weight = weight  # positive = higher risk, negative = lower risk
        self.description = description
        self.is_regex = is_regex

    def matches(self, text: str) -> bool:
        """
        Returns True if the pattern is found in the text.
        """
        if not text:
            return False
        if self.is_regex:
            return bool(re.search(self.pattern, text, re.IGNORECASE))
        return self.pattern.lower() in text.lower()


# Base risk scores for each of the 12 clause types
BASE_RISK_SCORES: Dict[str, int] = {
    "termination": 40,
    "indemnity": 60,
    "non_compete": 70,
    "confidentiality": 30,
    "limitation_of_liability": 55,
    "payment_terms": 35,
    "governing_law": 20,
    "intellectual_property": 50,
    "force_majeure": 15,
    "severability": 10,
    "non_solicitation": 65,
    "assignment": 25,
    "other": 15,  # Fallback class
}

# Specific rules for each clause type to modify the risk score
RISK_RULES: Dict[str, List[RiskRule]] = {
    "termination": [
        RiskRule("without cause", 20, "Unilateral termination without cause / for convenience"),
        RiskRule("convenience", 20, "Termination for convenience"),
        RiskRule("at any time", 15, "Termination at any time"),
        RiskRule("immediate", 15, "Immediate termination rights"),
        RiskRule("30 days notice", -10, "Standard 30-day notice period (reduces risk)"),
        RiskRule("60 days notice", -15, "Longer notice period (reduces risk)"),
        RiskRule("90 days notice", -20, "90-day notice period (reduces risk)"),
        RiskRule("material breach", 0, "Standard termination for material breach"),
    ],
    "indemnity": [
        RiskRule("indemnify", 5, "Indemnification obligation"),
        RiskRule("hold harmless", 5, "Hold harmless obligation"),
        RiskRule("sole control", 15, "Indemnifying party retains sole control of defense"),
        RiskRule("sole discretion", 15, "Sole discretion on indemnification claims"),
        RiskRule("mutual", -15, "Mutual indemnification clause (reduces risk)"),
        RiskRule("indemnify and hold harmless", 5, "Full indemnification"),
    ],
    "non_compete": [
        RiskRule("shall not compete", 10, "Explicit restriction on competing"),
        RiskRule("non-compete", 5, "Non-compete covenant"),
        RiskRule("worldwide", 20, "Worldwide restriction (high risk)"),
        RiskRule("perpetual", 20, "Perpetual or indefinite non-compete term (extreme risk)"),
        RiskRule("for a period of", -5, "Duration-limited restriction (reduces risk)"),
        RiskRule("geographic", 5, "Geographic scope restriction"),
    ],
    "confidentiality": [
        RiskRule("perpetual", 20, "Perpetual confidentiality obligation"),
        RiskRule("survive indefinitely", 15, "Indefinite survival of confidentiality obligations"),
        RiskRule("publicly available", -10, "Standard exclusion for public domain information (reduces risk)"),
        RiskRule("compelled by law", -10, "Standard exclusion for legally compelled disclosure (reduces risk)"),
        RiskRule("already in the possession", -5, "Standard exclusion for pre-existing knowledge (reduces risk)"),
    ],
    "limitation_of_liability": [
        RiskRule("unlimited", 30, "Unlimited liability under certain conditions"),
        RiskRule("consequential damages", 10, "Disclaimer or exclusion of consequential damages"),
        RiskRule("limited to the fees", -15, "Liability capped at fees paid (reduces risk)"),
        RiskRule("no liability", 25, "Complete disclaimer of all liability"),
        RiskRule("cap of", -10, "Explicit monetary liability cap (reduces risk)"),
    ],
    "payment_terms": [
        RiskRule("interest", 10, "Interest on late payments"),
        RiskRule("late fee", 10, "Late payment penalty fee"),
        RiskRule("within 30 days", -5, "Standard 30-day payment term (reduces risk)"),
        RiskRule("within 10 days", 15, "Short payment window"),
        RiskRule("non-refundable", 15, "Non-refundable payment terms"),
    ],
    "governing_law": [
        RiskRule("exclusive jurisdiction", 5, "Exclusive jurisdiction forum selection"),
        RiskRule("arbitration", 10, "Mandatory arbitration provision"),
        RiskRule("class action waive", 20, "Class action waiver (high risk)"),
        RiskRule("jury trial waive", 15, "Jury trial waiver"),
    ],
    "intellectual_property": [
        RiskRule("sole property of", 10, "Unilateral IP ownership"),
        RiskRule("retain all", 5, "Retention of pre-existing IP rights"),
        RiskRule("hereby assigns", 15, "Explicit assignment of developed IP / work product"),
        RiskRule("non-exclusive", -10, "Non-exclusive license grant (reduces risk)"),
        RiskRule("perpetual license", -5, "Perpetual license grant (reduces risk)"),
    ],
    "force_majeure": [
        RiskRule("act of God", 0, "Standard force majeure event definition"),
        RiskRule("labor dispute", 5, "Labor disputes included in force majeure"),
        RiskRule("terminate if", 10, "Right to terminate if force majeure exceeds limit"),
    ],
    "severability": [
        RiskRule("invalid or unenforceable", 0, "Standard severability terms"),
        RiskRule("remaining provisions", -5, "Enforceability of remaining terms (reduces risk)"),
    ],
    "non_solicitation": [
        RiskRule("shall not solicit", 10, "Active non-solicitation restriction"),
        RiskRule("not hire", 10, "Prohibition on hiring employees"),
        RiskRule("customers", 15, "Non-solicitation of clients/customers"),
        RiskRule("12 months", 5, "One-year non-solicitation duration"),
    ],
    "assignment": [
        RiskRule("without prior written consent", 10, "Assignment requires consent"),
        RiskRule("shall not assign", 5, "General restriction on assignment"),
        RiskRule("permitted assigns", -5, "Binding on successors and assigns (reduces risk)"),
    ],
}


class RiskEngine:
    """
    Calculates risk scores and maps them to risk levels.
    """

    def score_clause(self, text: str, clause_type: str, confidence: float) -> dict:
        """
        Scores a single clause chunk.
        
        Args:
            text: The text content of the clause chunk.
            clause_type: The classified clause category.
            confidence: The classifier's confidence score.

        Returns:
            Dictionary containing:
                "risk_score": int (0 to 100)
                "risk_level": str ("low" | "medium" | "high")
                "matching_rules": list[str]
        """
        base_score = BASE_RISK_SCORES.get(clause_type, BASE_RISK_SCORES["other"])
        rules = RISK_RULES.get(clause_type, [])

        matching_rules = []
        rule_score_modifier = 0

        for rule in rules:
            if rule.matches(text):
                rule_score_modifier += rule.weight
                matching_rules.append(rule.description)

        # Calculate raw score
        raw_score = base_score + rule_score_modifier

        # Confidence modifier: adjust risk score slightly to account for low confidence.
        # If the classifier is highly confident, we trust the base risk classification completely.
        # If the classifier is unconfident (< 0.4), we blend it toward a moderate default risk.
        if confidence < 0.4:
            # Blend raw score toward a baseline risk of 35
            weight = confidence / 0.4
            final_score = int(raw_score * weight + 35 * (1 - weight))
        else:
            final_score = raw_score

        # Clamp between 0 and 100
        final_score = max(0, min(100, final_score))

        # Map to level
        if final_score < 35:
            risk_level = "low"
        elif final_score < 70:
            risk_level = "medium"
        else:
            risk_level = "high"

        return {
            "risk_score": final_score,
            "risk_level": risk_level,
            "matching_rules": matching_rules,
        }

    def calculate_overall_risk(self, clauses: List[dict]) -> Tuple[int, str]:
        """
        Calculates overall document risk from its clauses.
        Uses a weighted approach where high risk clauses carry more weight.
        
        Args:
            clauses: List of clause dictionaries containing "risk_score".

        Returns:
            Tuple of (overall_risk_score, overall_risk_level)
        """
        if not clauses:
            return 0, "low"

        scores = [c["risk_score"] for c in clauses]
        
        # Weighted risk calculation:
        # Simple average can dilute the risk of a document that has a single extremely risky clause.
        # E.g. a document with 10 safe clauses and 1 extreme non-compete/unlimited liability is dangerous.
        # We calculate the average, but also factor in the maximum clause risk.
        avg_score = sum(scores) / len(scores)
        max_score = max(scores)
        
        # 60% average, 40% maximum risk
        overall_score = int(round(0.6 * avg_score + 0.4 * max_score))
        overall_score = max(0, min(100, overall_score))

        if overall_score < 35:
            level = "low"
        elif overall_score < 70:
            level = "medium"
        else:
            level = "high"

        return overall_score, level
