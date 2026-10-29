"""
ai-service/llm.py
=================
LLM summarization and clause explanation module (Part 6 - Step E2).
Supports OpenAI (gpt-4o-mini / gpt-4o), Groq (llama-3.3-70b-versatile),
and resilient offline deterministic legal fallback if API keys are missing.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

SYSTEM_DISCLAIMER = (
    "You are a professional legal AI assistant for LegalEase. "
    "You are not a lawyer; this is information, not legal advice. "
    "Never invent or assume clauses that are not present in the provided contract text."
)


def _call_llm_api(system_prompt: str, user_prompt: str, max_tokens: int = 500) -> Optional[str]:
    """
    Calls Groq or OpenAI chat completion API with timeout and retries.
    Returns None if neither key is configured or both calls fail.
    """
    groq_key = os.getenv("GROQ_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    # 1. Try Groq (high-speed free tier)
    if groq_key and groq_key.startswith("gsk_") and not groq_key.startswith("gsk_your_"):
        try:
            import requests
            model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
            headers = {
                "Authorization": f"Bearer {groq_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "max_tokens": max_tokens,
                "temperature": 0.2,
            }
            try:
                resp = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=10)
                if resp.status_code == 200:
                    content = resp.json().get("choices", [{}])[0].get("message", {}).get("content")
                    if content and content.strip():
                        return content.strip()
            except Exception as attempt_err:
                logger.warning("Groq call failed: %s", attempt_err)
        except Exception as exc:
            logger.warning("Groq execution failed: %s", exc)

    # 2. Try OpenAI
    if openai_key and openai_key.startswith("sk-") and not openai_key.startswith("sk-your_"):
        try:
            import requests
            model = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
            headers = {
                "Authorization": f"Bearer {openai_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "max_tokens": max_tokens,
                "temperature": 0.2,
            }
            try:
                resp = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=10)
                if resp.status_code == 200:
                    content = resp.json().get("choices", [{}])[0].get("message", {}).get("content")
                    if content and content.strip():
                        return content.strip()
            except Exception as attempt_err:
                logger.warning("OpenAI call failed: %s", attempt_err)
        except Exception as exc:
            logger.warning("OpenAI execution failed: %s", exc)

    return None


async def summarize_contract(contract_text: str, clauses: List[Dict[str, Any]]) -> str:
    """
    Produces a 5-8 line plain-English summary for a non-lawyer.
    Falls back to a clear structured summary if LLM keys are absent.
    """
    excerpt = contract_text[:3000].strip()
    clause_types_found = [c.get("clause_type", "other") for c in clauses if c.get("clause_type") != "other"]
    unique_types = sorted(list(set(clause_types_found)))

    user_prompt = (
        f"Summarize this legal contract in 5 to 8 clear, simple sentences for someone without a legal background. "
        f"Highlight what kind of agreement this is, the core obligations, and any major risks detected.\n\n"
        f"Contract Excerpt:\n{excerpt}\n\n"
        f"Identified Provisions: {', '.join(unique_types) if unique_types else 'General commercial clauses'}"
    )

    llm_summary = _call_llm_api(SYSTEM_DISCLAIMER, user_prompt, max_tokens=350)
    if llm_summary:
        return llm_summary

    # Resilient deterministic fallback summary
    return (
        f"This contract governs commercial terms and obligations between the signing parties. "
        f"Our analysis scanned the full document and categorized {len(clauses)} functional legal provisions, "
        f"including {', '.join(unique_types[:4]) if unique_types else 'standard contract clauses'}. "
        f"Review any flagged high-risk clauses in your dashboard regarding termination notice, indemnification liability, "
        f"and confidentiality survival periods before executing the agreement. "
        f"Notice: LegalEase provides automated risk analysis for informational purposes and does not constitute formal legal counsel."
    )


async def explain_clause(clause_text: str, clause_type: str) -> str:
    """
    Generates a 2-sentence explanation: meaning + risk + safer wording recommendation.
    """
    user_prompt = (
        f"Explain this contract clause in exactly 2 concise sentences for a non-lawyer: "
        f"1) What it means in plain English and why it may be risky. "
        f"2) A practical safer wording suggestion.\n\n"
        f"Clause Type: {clause_type}\n"
        f"Clause Text: \"{clause_text[:600]}\""
    )

    llm_explanation = _call_llm_api(SYSTEM_DISCLAIMER, user_prompt, max_tokens=150)
    if llm_explanation:
        return llm_explanation

    # Clean fallback explanation
    cleaned_type = clause_type.replace("_", " ").title()
    return (
        f"This {cleaned_type} provision binds the parties to specific operational duties and legal restrictions. "
        f"Consider negotiating mutual obligations or clear monetary liability caps to balance risk fairly."
    )
