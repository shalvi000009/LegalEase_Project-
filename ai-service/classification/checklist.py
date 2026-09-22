"""
classification/checklist.py
===========================
Checklist mappings and generators for missing clauses and suggested questions.
Integrates OpenAI GPT-4o and falls back to deterministic rule-based generators when offline.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List

from openai import OpenAI

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Checklist Item Friendly Descriptions
# ---------------------------------------------------------------------------
CHECKLIST_ITEMS: Dict[str, str] = {
    "termination": "Termination clause (notice period and terms)",
    "indemnity": "Indemnification and hold-harmless protection",
    "non_compete": "Non-compete covenant (scope and duration)",
    "confidentiality": "Confidentiality and non-disclosure obligations",
    "limitation_of_liability": "Limitation of liability and financial cap",
    "payment_terms": "Payment terms (invoicing, late fees, non-refundability)",
    "governing_law": "Governing law and jurisdiction",
    "intellectual_property": "Intellectual property ownership and assignment",
    "force_majeure": "Force majeure (excused performance)",
    "severability": "Severability of provisions",
    "non_solicitation": "Non-solicitation restrictions (employees/customers)",
    "assignment": "Assignment rights and restrictions",
}

# ---------------------------------------------------------------------------
# Checklists per Contract Type
# ---------------------------------------------------------------------------
CONTRACT_CHECKLISTS: Dict[str, List[str]] = {
    "employment_agreement": [
        "termination",
        "non_compete",
        "confidentiality",
        "intellectual_property",
        "non_solicitation",
        "governing_law",
        "payment_terms",
    ],
    "non_disclosure_agreement": [
        "confidentiality",
        "termination",
        "governing_law",
        "severability",
        "intellectual_property",
    ],
    "service_agreement": [
        "payment_terms",
        "limitation_of_liability",
        "indemnity",
        "intellectual_property",
        "termination",
        "governing_law",
        "force_majeure",
    ],
    "other": [
        "termination",
        "confidentiality",
        "governing_law",
        "severability",
    ],
}


# ---------------------------------------------------------------------------
# Contract Type Detection
# ---------------------------------------------------------------------------
def detect_contract_type(text: str) -> str:
    """
    Simple keyword-based contract type detector.
    """
    text_lower = text.lower()
    if (
        "employment" in text_lower
        or "salary" in text_lower
        or "job title" in text_lower
        or "employee" in text_lower
    ):
        return "employment_agreement"
    elif (
        "non-disclosure" in text_lower
        or "nda" in text_lower
        or "confidentiality agreement" in text_lower
        or "disclosing party" in text_lower
        or "receiving party" in text_lower
    ):
        return "non_disclosure_agreement"
    elif (
        "service" in text_lower
        or "services" in text_lower
        or "fees" in text_lower
        or "vendor" in text_lower
        or "client" in text_lower
        or "statement of work" in text_lower
        or "sow" in text_lower
    ):
        return "service_agreement"
    return "other"


# ---------------------------------------------------------------------------
# GPT-4o Generator (with Redis/Memory Cache)
# ---------------------------------------------------------------------------
def call_gpt_4o_analysis(
    text: str,
    classified_clauses: List[Dict[str, Any]],
    detected_type: str,
) -> Dict[str, Any]:
    """
    Calls OpenAI GPT-4o to analyze missing clauses and generate suggested questions.
    Checks dual-mode cache first to save API tokens and reduce costs on repeat calls.
    """
    from classification.cache import cache

    # Build deterministic cache key from input fingerprint
    clause_types_sig = ",".join(sorted(str(c.get("clause_type", "")) for c in classified_clauses))
    text_snippet = text[:300].strip()
    cache_key = cache.generate_cache_key("llm:gpt4o:checklist", detected_type, text_snippet, clause_types_sig)

    cached_result = cache.get(cache_key)
    if cached_result is not None and isinstance(cached_result, dict):
        logger.info("[CACHE HIT] Returning cached GPT-4o checklist analysis for key=%s", cache_key)
        return cached_result

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or "your_openai_api_key_here" in api_key or not api_key.startswith("sk-"):
        logger.debug("Valid OpenAI API Key not found; skipping GPT-4o analysis.")
        return {}

    logger.info("Calling OpenAI GPT-4o for missing clauses and suggested questions...")
    try:
        client = OpenAI(api_key=api_key)
        clauses_summary = []
        for c in classified_clauses:
            clauses_summary.append(
                {
                    "clause_type": c.get("clause_type"),
                    "risk_level": c.get("risk_level"),
                    "text": c.get("text", "")[:150] + "...",
                }
            )

        prompt = f"""
You are an expert AI legal assistant. Analyze the following legal contract context.
Contract Type (auto-detected): {detected_type}
Classified Clauses and Risk Levels:
{json.dumps(clauses_summary, indent=2)}

Please perform the following tasks:
1. Identify any missing standard clauses or protections for this type of contract.
2. Generate 3 to 5 highly relevant, actionable follow-up questions the user should ask their legal counsel or counterparty, specifically based on the risky clauses identified above.

Provide the response in raw JSON format with the following keys:
{{
    "missing_clauses": ["description of missing clause 1", "description of missing clause 2"],
    "suggested_questions": ["question 1", "question 2", ...]
}}
"""
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You are a legal contract analyzer. You must output raw JSON only."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=600,
            temperature=0.2,
        )
        content = response.choices[0].message.content
        if content:
            parsed = json.loads(content)
            # Store in cache with 24-hour TTL
            cache.set(cache_key, parsed, ttl=86400)
            return parsed
    except Exception as e:
        logger.warning(
            "Failed to call OpenAI GPT-4o API for analysis: %s. Falling back to rule-based engine.",
            e,
        )
    return {}


# ---------------------------------------------------------------------------
# Rule-Based Engines (Fallbacks)
# ---------------------------------------------------------------------------
def get_rule_based_missing_clauses(
    classified_clauses: List[Dict[str, Any]],
    contract_type: str,
) -> List[str]:
    """
    Determines missing clauses by checking required checklist items not present in classified clauses.
    """
    present_types = {c.get("clause_type") for c in classified_clauses if c.get("clause_type")}
    checklist = CONTRACT_CHECKLISTS.get(contract_type, CONTRACT_CHECKLISTS["other"])

    missing = []
    for item in checklist:
        if item not in present_types:
            missing_clauses_desc = CHECKLIST_ITEMS.get(item, item.replace("_", " ").capitalize())
            missing.append(missing_clauses_desc)

    return missing


def get_rule_based_suggested_questions(
    classified_clauses: List[Dict[str, Any]],
) -> List[str]:
    """
    Generates suggested questions based on the risks detected in specific clauses.
    """
    questions = []

    # Sort clauses by risk score descending to target riskiest clauses first
    sorted_clauses = sorted(
        classified_clauses,
        key=lambda c: c.get("risk_score", 0),
        reverse=True,
    )

    for c in sorted_clauses:
        # Only suggest questions for clauses that have a high or medium risk score
        if c.get("risk_score", 0) < 35:
            continue

        clause_type = c.get("clause_type")
        if clause_type == "non_compete":
            questions.append("Can the non-compete clause be limited to 12 months within my geographic area?")
        elif clause_type == "limitation_of_liability":
            questions.append("Is there a liability cap for employee indemnification obligations?")
        elif clause_type == "termination":
            questions.append("Can I negotiate a 30-day mutual notice period for termination?")
        elif clause_type == "intellectual_property":
            questions.append("What side-projects are exempt from the intellectual property assignment clause?")
        elif clause_type == "confidentiality":
            questions.append("Is the confidentiality obligation mutual, and does it survive indefinitely?")
        elif clause_type == "indemnity":
            questions.append("Can we make the indemnification clause mutual instead of unilateral?")
        elif clause_type == "payment_terms":
            questions.append("Can we extend the payment window to a standard net-30 days?")

        if len(questions) >= 4:
            break

    # Add general fallback questions if we don't have enough specific ones
    fallback_questions = [
        "What are the key obligations for each party under this agreement?",
        "Are there any hidden fees or automatic renewal terms in this contract?",
        "Which jurisdiction governs any disputes arising from this contract?",
    ]

    for q in fallback_questions:
        if len(questions) >= 4:
            break
        if q not in questions:
            questions.append(q)

    return questions


# ---------------------------------------------------------------------------
# Public Entrypoint
# ---------------------------------------------------------------------------
def analyze_reporting_features(
    text: str,
    classified_clauses: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Analyzes the full text and classified clauses to detect the contract type,
    find missing clauses, and generate suggested follow-up questions.
    """
    contract_type = detect_contract_type(text)

    # Try calling GPT-4o first
    gpt_results = call_gpt_4o_analysis(text, classified_clauses, contract_type)

    missing_clauses = gpt_results.get("missing_clauses")
    suggested_questions = gpt_results.get("suggested_questions")

    # If GPT-4o didn't return results, fall back to rule-based
    if not missing_clauses:
        missing_clauses = get_rule_based_missing_clauses(classified_clauses, contract_type)

    if not suggested_questions:
        suggested_questions = get_rule_based_suggested_questions(classified_clauses)

    return {
        "contract_type": contract_type,
        "missing_clauses": missing_clauses,
        "suggested_questions": suggested_questions,
    }
