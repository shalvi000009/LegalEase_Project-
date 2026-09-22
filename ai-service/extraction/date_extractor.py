"""
extraction/date_extractor.py
============================
Week 6: Date extraction (spaCy NER + Regex) and relative date resolution.
Resolves relative expressions into absolute dates and classifies them.
Integrates OpenAI GPT-4o and falls back to a deterministic rule-based date resolver when offline.
"""

from __future__ import annotations

import datetime
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

# pyrefly: ignore [missing-import]
import spacy
# pyrefly: ignore [missing-import]
from openai import OpenAI

logger = logging.getLogger(__name__)

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
except Exception as e:
    logger.error("Failed to load spaCy model 'en_core_web_sm'. Make sure it is installed.")
    nlp = None

# Supported categories for classification
SUPPORTED_DATE_TYPES = {
    "expiry_date",
    "renewal_date",
    "notice_deadline",
    "payment_due",
    "probation_end",
    "lock_in_end",
    "other",
}

# Regex for absolute date formats (e.g. 31.03.2026, 31-03-2026, 31/03/2026)
ABS_DATE_REGEX = re.compile(
    r"\b(?:\d{1,2}[./-]\d{1,2}[./-]\d{4}|\d{4}[./-]\d{1,2}[./-]\d{1,2})\b"
)

RELATIVE_DATE_REGEX = re.compile(
    r"\b(?:within\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+"
    r"(days?|weeks?|months?|years?)\s+"
    r"(after|from|before|prior\s+to|following)\s+"
    r"(signing|commencement|effective\s+date|termination|execution|date\s+hereof|expiration|expiry)\b",
    re.IGNORECASE,
)

# Number word dictionary for parsing
WORD_TO_NUM = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10
}


# ---------------------------------------------------------------------------
# Date Extraction (spaCy NER + Regex)
# ---------------------------------------------------------------------------

def extract_dates(text: str) -> List[Dict[str, Any]]:
    """
    Extracts candidate absolute and relative date entities from text using spaCy and Regex.
    
    Returns:
        List of dicts: [ { "raw_text": str, "context": str } ]
    """
    candidates: Dict[str, Dict[str, Any]] = {}
    
    # 1. spaCy NER Date extraction
    if nlp:
        doc = nlp(text)
        for ent in doc.ents:
            if ent.label_ == "DATE":
                raw = ent.text.strip()
                # Simple cleaning
                if len(raw) > 3 and not raw.isdigit():
                    # Get surrounding context
                    start_char = max(0, ent.start_char - 60)
                    end_char = min(len(text), ent.end_char + 60)
                    context = text[start_char:end_char].strip().replace("\n", " ")
                    candidates[raw.lower()] = {"raw_text": raw, "context": context}

    # 2. Regex matching for absolute dates (e.g. 31.03.2026)
    for match in ABS_DATE_REGEX.finditer(text):
        raw = match.group(0)
        if raw.lower() not in candidates:
            start_char = max(0, match.start() - 60)
            end_char = min(len(text), match.end() + 60)
            context = text[start_char:end_char].strip().replace("\n", " ")
            candidates[raw.lower()] = {"raw_text": raw, "context": context}

    # 3. Regex matching for relative date expressions
    for match in RELATIVE_DATE_REGEX.finditer(text):
        raw = match.group(0)
        if raw.lower() not in candidates:
            start_char = max(0, match.start() - 60)
            end_char = min(len(text), match.end() + 60)
            context = text[start_char:end_char].strip().replace("\n", " ")
            candidates[raw.lower()] = {"raw_text": raw, "context": context}

    return list(candidates.values())


# ---------------------------------------------------------------------------
# Signing Date Auto-Detection (Fallback)
# ---------------------------------------------------------------------------

def detect_signing_date(text: str) -> str:
    """
    Attempts to auto-detect a contract signing/effective date from text.
    Defaults to today's date if not found.
    """
    text_lower = text.lower()
    today_str = datetime.date.today().isoformat()
    
    # Common introductory pattern search
    # e.g., "Effective Date is March 31, 2026" or "made this 15th day of August, 2026"
    patterns = [
        r"effective\s+date\s+(?:is|shall\s+be|of)?\s*([a-zA-Z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+[a-zA-Z]+\s+\d{4}|\d{1,2}[./-]\d{1,2}[./-]\d{4})",
        r"entered\s+into\s+this\s*(\d{1,2}(?:st|nd|rd|th)?\s+day\s+of\s+[a-zA-Z]+,?\s+\d{4})",
        r"made\s+this\s*(\d{1,2}(?:st|nd|rd|th)?\s+day\s+of\s+[a-zA-Z]+,?\s+\d{4})",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            date_str = match.group(1).strip()
            # Try to resolve to ISO date
            resolved = parse_absolute_date(date_str)
            if resolved:
                return resolved

    # Fallback search for any absolute date near the beginning
    first_pages = text[:2000]
    for match in ABS_DATE_REGEX.finditer(first_pages):
        resolved = parse_absolute_date(match.group(0))
        if resolved:
            return resolved

    return today_str


def parse_absolute_date(date_str: str) -> Optional[str]:
    """
    Attempts to parse various standard date strings into ISO format YYYY-MM-DD.
    """
    # Clean ordinal suffixes like 15th, 1st, 2nd, 3rd
    clean_str = re.sub(r"(\d+)(?:st|nd|rd|th)", r"\1", date_str)
    # Clean "day of" phrasing (e.g. "15 day of August, 2026" -> "15 August, 2026")
    clean_str = re.sub(r"\bday\s+of\b", "", clean_str, flags=re.IGNORECASE)
    clean_str = re.sub(r"\s+", " ", clean_str).strip()
    clean_str = clean_str.replace(" ,", ",")
    
    # Try various formats
    formats = [
        "%d.%m.%Y", "%d/%m/%Y", "%d-%m-%Y",
        "%Y.%m.%d", "%Y/%m/%d", "%Y-%m-%d",
        "%B %d, %Y", "%b %d, %Y", "%d %B %Y", "%d %b %Y",
        "%B %d %Y", "%b %d %Y", "%d %B, %Y", "%d %b, %Y"
    ]
    
    for fmt in formats:
        try:
            dt = datetime.datetime.strptime(clean_str.strip(), fmt)
            return dt.date().isoformat()
        except ValueError:
            continue
            
    return None


# ---------------------------------------------------------------------------
# GPT-4o Resolver
# ---------------------------------------------------------------------------

def call_gpt_4o_resolver(
    entities: List[Dict[str, Any]],
    signing_date: str,
) -> List[Dict[str, Any]]:
    """
    Calls OpenAI GPT-4o to resolve and classify date entities.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or "your_openai_api_key_here" in api_key or not api_key.startswith("sk-"):
        logger.debug("Valid OpenAI API Key not found; skipping GPT-4o date resolution.")
        return []

    logger.info("Calling OpenAI GPT-4o for date resolution and classification...")
    try:
        client = OpenAI(api_key=api_key)
        prompt = f"""
You are an expert legal contract analyzer.
You are given a list of date-related entities extracted from a contract, along with their surrounding contexts.
The contract signing/effective date is: {signing_date}

Perform the following tasks for each entity:
1. Resolve the raw date expression into an absolute calendar date in YYYY-MM-DD format. If the expression is relative (e.g. "90 days after signing"), calculate it relative to the signing date. If it is already absolute, parse it. If it cannot be resolved, return null.
2. Classify the date type into exactly one of: "expiry_date", "renewal_date", "notice_deadline", "payment_due", "probation_end", "lock_in_end", "other".
3. Return a confidence score between 0.0 and 1.0.

Input Entities:
{json.dumps(entities, indent=2)}

Provide the response in raw JSON format matching this schema:
{{
    "dates": [
        {{
            "raw_text": "90 days after signing",
            "type": "expiry_date",
            "resolved_date": "YYYY-MM-DD",
            "confidence": 0.95
        }},
        ...
    ]
}}
"""
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You are a legal date resolver. You must output raw JSON only."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=800,
            temperature=0.1,
        )
        content = response.choices[0].message.content
        if content:
            data = json.loads(content)
            return data.get("dates", [])
    except Exception as e:
        logger.warning(
            "Failed to resolve dates with OpenAI GPT-4o: %s. Falling back to rule-based engine.",
            e,
        )
    return []


# ---------------------------------------------------------------------------
# Rule-Based Date Resolver & Classifier (Fallback)
# ---------------------------------------------------------------------------

def resolve_relative_expression(
    raw_text: str,
    signing_date_str: str,
) -> Optional[str]:
    """
    Parses simple relative date expressions like '90 days after signing'
    and adds/subtracts from the signing date.
    """
    match = RELATIVE_DATE_REGEX.search(raw_text)
    if not match:
        return None

    num_str, unit, direction, anchor = match.groups()
    
    # Parse number
    if num_str.isdigit():
        num = int(num_str)
    else:
        num = WORD_TO_NUM.get(num_str.lower(), 0)

    if num == 0:
        return None

    # Parse anchor date (defaulting to signing date)
    try:
        anchor_date = datetime.date.fromisoformat(signing_date_str)
    except ValueError:
        return None

    # Parse duration
    unit_lower = unit.lower()
    delta: datetime.timedelta
    if "day" in unit_lower:
        delta = datetime.timedelta(days=num)
    elif "week" in unit_lower:
        delta = datetime.timedelta(weeks=num)
    elif "month" in unit_lower:
        # Approximate month addition (30 days per month)
        delta = datetime.timedelta(days=num * 30)
    elif "year" in unit_lower:
        # Approximate year addition (365 days per year)
        delta = datetime.timedelta(days=num * 365)
    else:
        return None

    # Parse direction
    dir_lower = direction.lower()
    if "after" in dir_lower or "from" in dir_lower or "following" in dir_lower:
        resolved = anchor_date + delta
    elif "before" in dir_lower or "prior" in dir_lower:
        resolved = anchor_date - delta
    else:
        return None

    return resolved.isoformat()


def classify_date_type_by_context(raw_text: str, context: str) -> str:
    """
    Classifies a date expression based on surrounding context keywords.
    """
    combined = (raw_text + " " + context).lower()
    
    if (
        "probation" in combined
        or "probationary" in combined
    ):
        return "probation_end"
    elif (
        "lock-in" in combined
        or "lock in" in combined
        or "minimum term" in combined
    ):
        return "lock_in_end"
    elif (
        "renew" in combined
        or "renewal" in combined
        or "extension" in combined
        or "extends" in combined
    ):
        return "renewal_date"
    elif (
        "notice" in combined
        or "notify" in combined
        or "written notice" in combined
    ):
        return "notice_deadline"
    elif (
        "payment" in combined
        or "pay" in combined
        or "invoice" in combined
        or "fee" in combined
        or "due" in combined
    ):
        return "payment_due"
    elif (
        "expire" in combined
        or "expiration" in combined
        or "terminate" in combined
        or "termination" in combined
        or "duration" in combined
        or "end of term" in combined
        or "conclude" in combined
    ):
        return "expiry_date"
        
    return "other"


def resolve_and_classify_dates_fallback(
    entities: List[Dict[str, Any]],
    signing_date: str,
) -> List[Dict[str, Any]]:
    """
    Deterministic rule-based backup resolver.
    """
    results = []
    for ent in entities:
        raw = ent["raw_text"]
        context = ent["context"]
        
        # 1. Check if absolute date
        resolved = parse_absolute_date(raw)
        
        # 2. If not, try to resolve relative expression
        if not resolved:
            resolved = resolve_relative_expression(raw, signing_date)
            
        # 3. Classify type
        date_type = classify_date_type_by_context(raw, context)
        
        results.append(
            {
                "raw_text": raw,
                "type": date_type,
                "resolved_date": resolved,
                "confidence": 0.80 if resolved else 0.50,
            }
        )
    return results


# ---------------------------------------------------------------------------
# Public Entrypoint
# ---------------------------------------------------------------------------

def process_date_extraction(
    text: str,
    signing_date: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Extracts all date entities from the text, auto-detects/resolves the signing date,
    and runs the resolution + classification pipeline (GPT-4o with fallback).
    """
    # 1. Resolve signing date
    if not signing_date:
        signing_date = detect_signing_date(text)
        logger.info("Auto-detected contract signing date: %s", signing_date)
    else:
        # Normalize passed signing date if possible
        normalized = parse_absolute_date(signing_date)
        if normalized:
            signing_date = normalized
            
    # 2. Extract entities
    entities = extract_dates(text)
    if not entities:
        return []

    # 3. Resolve and classify
    # Try GPT-4o resolver first
    results = call_gpt_4o_resolver(entities, signing_date)
    
    # If GPT-4o failed or returned nothing, use fallback resolver
    if not results:
        results = resolve_and_classify_dates_fallback(entities, signing_date)
        
    return results
