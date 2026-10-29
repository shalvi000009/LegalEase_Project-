"""
Date extraction engine for LegalEase contracts.
Extracts effective_date, expiry_date, renewal_date, notice_period_days, and auto_renews.
Uses Regex + dateparser, duration calculation, and LLM fallback (timeout 15s).
"""

import re
import json
import logging
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

import dateparser
from dateutil.relativedelta import relativedelta

logger = logging.getLogger(__name__)

WORD_TO_NUM: Dict[str, int] = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
    "fifteen": 15,
    "twenty": 20,
    "thirty": 30,
    "forty-five": 45,
    "forty five": 45,
    "sixty": 60,
    "ninety": 90,
    "twelve": 12,
    "twenty-four": 24,
    "twenty four": 24,
    "thirty-six": 36,
    "thirty six": 36,
}


class ContractDates(BaseModel):
    effective_date: Optional[str] = Field(None, description="ISO effective date YYYY-MM-DD")
    expiry_date: Optional[str] = Field(None, description="ISO expiration/end date YYYY-MM-DD")
    renewal_date: Optional[str] = Field(None, description="ISO renewal date YYYY-MM-DD")
    notice_period_days: Optional[int] = Field(None, description="Notice period in days")
    auto_renews: bool = Field(False, description="Whether contract automatically renews")


def parse_date_string(date_str: str) -> Optional[str]:
    """Parse date text into standard YYYY-MM-DD string."""
    if not date_str:
        return None
    cleaned = date_str.strip().strip(",.()[]\"' ")

    # Normalize patterns like "1st day of March 2026" or "1st of March, 2026" -> "March 1, 2026"
    day_of_month_match = re.search(
        r"(\d{1,2})(?:st|nd|rd|th)?\s+(?:day\s+of\s+|of\s+)([A-Za-z]+),?\s+(\d{4})",
        cleaned,
        flags=re.IGNORECASE,
    )
    if day_of_month_match:
        day, month, year = day_of_month_match.groups()
        cleaned = f"{month} {day}, {year}"
    else:
        # Strip ordinal suffixes in standard patterns (e.g. "March 1st, 2026" -> "March 1, 2026")
        cleaned = re.sub(r"(\d+)(st|nd|rd|th)\b", r"\1", cleaned, flags=re.IGNORECASE)

    try:
        dt = dateparser.parse(
            cleaned,
            settings={
                "PREFER_DAY_OF_MONTH": "first",
                "DATE_ORDER": "MDY",
                "STRICT_PARSING": False,
            },
        )
        if dt and 1990 <= dt.year <= 2100:
            return dt.strftime("%Y-%m-%d")
    except Exception as e:
        logger.debug(f"Failed parsing date string '{date_str}': {e}")
    return None


def _parse_term_duration(term_val: str, unit: str) -> Optional[relativedelta]:
    term_val = term_val.strip().lower()
    # Check parenthetical number like "twelve (12)"
    paren_match = re.search(r"\((\d+)\)", term_val)
    if paren_match:
        count = int(paren_match.group(1))
    elif term_val.isdigit():
        count = int(term_val)
    elif term_val in WORD_TO_NUM:
        count = WORD_TO_NUM[term_val]
    else:
        first_token = term_val.split()[0]
        if first_token.isdigit():
            count = int(first_token)
        elif first_token in WORD_TO_NUM:
            count = WORD_TO_NUM[first_token]
        else:
            return None

    unit = unit.lower()
    if "year" in unit:
        return relativedelta(years=count)
    elif "month" in unit:
        return relativedelta(months=count)
    elif "day" in unit:
        return relativedelta(days=count)
    return None


def extract_dates_regex(text: str) -> ContractDates:
    """Extract dates, duration terms, renewal flags, and notice periods using regex + dateparser."""
    effective_date: Optional[str] = None
    expiry_date: Optional[str] = None
    renewal_date: Optional[str] = None
    notice_period_days: Optional[int] = None
    auto_renews: bool = False

    date_regex = (
        r"(\d{1,2}(?:st|nd|rd|th)?\s+(?:day\s+of\s+|of\s+)?[A-Za-z]+,?\s+\d{4}"
        r"|[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}"
        r"|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}"
        r"|\d{4}[/-]\d{1,2}[/-]\d{1,2})"
    )

    # 1. Effective date patterns
    effective_patterns = [
        r"(?:effective\s+date|effective\s+as\s+of|commencing\s+on|entered\s+into|dated\s+as\s+of|start\s+date|commencement\s+date)[^.\n\r]{0,60}?\b" + date_regex,
        r"['\"]Effective\s+Date['\"]\s*:\s*['\"]?([^'\"\n\r]+)['\"]?",
    ]
    for pattern in effective_patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            candidate = parse_date_string(match.group(1))
            if candidate:
                effective_date = candidate
                break

    # 2. Expiry date patterns
    expiry_patterns = [
        r"(?:expire[s]?\s+on|expiration\s+date|expiry\s+date|end\s+date|terminate[s]?\s+on|shall\s+continue\s+until|valid\s+through|valid\s+until|term\s+shall\s+end\s+on)[^.\n\r]{0,60}?\b" + date_regex,
        r"['\"](?:Expiration|Expiry)\s+Date['\"]\s*:\s*['\"]?([^'\"\n\r]+)['\"]?",
    ]
    for pattern in expiry_patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            candidate = parse_date_string(match.group(1))
            if candidate:
                expiry_date = candidate
                break

    # 3. Term calculation if no explicit expiry date
    if effective_date and not expiry_date:
        term_patterns = [
            r"(?:term\s+of|period\s+of|remain\s+in\s+effect\s+for|duration\s+of|initial\s+term\s+shall\s+be(?:\s+for)?)\s+([a-zA-Z0-9\-\(\)\s]{1,25}?)\s*(years?|months?|days?)\b",
            r"(?:(?:shall\s+)?continue[s]?\s+for|remain\s+in\s+effect\s+for|term\s+shall\s+be)\s+([a-zA-Z0-9\-\(\)\s]{1,25}?)\s*(years?|months?|days?)\b",
        ]
        for pattern in term_patterns:
            term_match = re.search(pattern, text, flags=re.IGNORECASE)
            if term_match:
                term_val = term_match.group(1).strip()
                unit = term_match.group(2).strip()
                delta = _parse_term_duration(term_val, unit)
                if delta:
                    try:
                        eff_dt = datetime.strptime(effective_date, "%Y-%m-%d")
                        exp_dt = eff_dt + delta
                        expiry_date = exp_dt.strftime("%Y-%m-%d")
                        break
                    except Exception as e:
                        logger.debug(f"Error calculating term expiry: {e}")

    # 4. Auto-renews detection
    auto_renew_pattern = r"(?:auto(?:matic|matically)?\s+renew(?:s|al|ed)?|renew(?:s|al|ed)?\s+automatically|successive\s+(?:[a-zA-Z0-9\-]+\s+)?terms|evergreen)"
    negation_pattern = r"(?:shall\s+not\s+(?:automatically\s+)?renew|will\s+not\s+renew|no\s+automatic\s+renewal|without\s+automatic\s+renewal)"
    has_renew = bool(re.search(auto_renew_pattern, text, flags=re.IGNORECASE))
    has_negation = bool(re.search(negation_pattern, text, flags=re.IGNORECASE))
    auto_renews = has_renew and not has_negation

    # 5. Notice period days
    notice_patterns = [
        r"([a-zA-Z0-9\-]+)\s*(?:\((\d+)\)\s*)?(?:business\s+|calendar\s+)?days['’]?\s*(?:prior\s+)?(?:written\s+)?notice",
        r"notice\s+of\s+(?:at\s+least\s+)?([a-zA-Z0-9\-]+)\s*(?:\((\d+)\)\s*)?(?:business\s+|calendar\s+)?days",
        r"([a-zA-Z0-9\-]+)\s*(?:\((\d+)\)\s*)?(?:month|months)\s*(?:prior\s+)?(?:written\s+)?notice",
    ]
    for pattern in notice_patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if match:
            # Prefer parenthetical digits if present: e.g. "thirty (30)" -> group 2 is 30
            if match.group(2):
                val = int(match.group(2))
            else:
                raw_token = match.group(1).lower()
                if raw_token.isdigit():
                    val = int(raw_token)
                elif raw_token in WORD_TO_NUM:
                    val = WORD_TO_NUM[raw_token]
                else:
                    continue

            if "month" in pattern:
                notice_period_days = val * 30
            else:
                notice_period_days = val
            break

    # 6. Renewal date
    if auto_renews and expiry_date:
        renewal_date = expiry_date

    return ContractDates(
        effective_date=effective_date,
        expiry_date=expiry_date,
        renewal_date=renewal_date,
        notice_period_days=notice_period_days,
        auto_renews=auto_renews,
    )


async def extract_dates_llm_fallback(text: str) -> Optional[ContractDates]:
    """Fallback to LLM for date extraction if regex could not determine effective/expiry date."""
    try:
        from llm import _call_llm_api
        system_prompt = (
            "You are a specialized legal document parser. Extract key contract dates and renewal terms. "
            "Return ONLY a valid JSON object. Never invent, guess, or hallucinate dates. If not found, use null."
        )
        user_prompt = f"""Analyze the contract text and output EXACTLY this JSON format:
{{
  "effective_date": "YYYY-MM-DD or null",
  "expiry_date": "YYYY-MM-DD or null",
  "renewal_date": "YYYY-MM-DD or null",
  "notice_period_days": integer or null,
  "auto_renews": boolean
}}

Contract excerpt:
{text[:4000]}
"""
        loop = asyncio.get_running_loop()
        raw_output = await asyncio.wait_for(
            loop.run_in_executor(None, _call_llm_api, system_prompt, user_prompt, 300),
            timeout=15.0,
        )
        if not raw_output:
            return None

        clean_json = re.sub(r"^```json\s*", "", raw_output.strip(), flags=re.IGNORECASE)
        clean_json = re.sub(r"```$", "", clean_json.strip())
        data = json.loads(clean_json)

        return ContractDates(
            effective_date=data.get("effective_date"),
            expiry_date=data.get("expiry_date"),
            renewal_date=data.get("renewal_date"),
            notice_period_days=data.get("notice_period_days"),
            auto_renews=bool(data.get("auto_renews", False)),
        )
    except Exception as e:
        logger.debug(f"LLM date fallback skipped/errored: {e}")
        return None


async def extract_contract_dates(text: str) -> ContractDates:
    """
    Main entry point for extracting contract dates.
    Tries regex + dateparser first. If dates are missing, attempts LLM fallback with 15s timeout.
    """
    parsed = extract_dates_regex(text)

    # If regex missed effective_date or expiry_date, attempt LLM fallback
    if parsed.effective_date is None or parsed.expiry_date is None:
        try:
            llm_result = await extract_dates_llm_fallback(text)
            if llm_result:
                if parsed.effective_date is None:
                    parsed.effective_date = llm_result.effective_date
                if parsed.expiry_date is None:
                    parsed.expiry_date = llm_result.expiry_date
                if parsed.renewal_date is None:
                    parsed.renewal_date = llm_result.renewal_date
                if parsed.notice_period_days is None:
                    parsed.notice_period_days = llm_result.notice_period_days
                if not parsed.auto_renews:
                    parsed.auto_renews = llm_result.auto_renews
        except Exception as e:
            logger.debug(f"LLM date fallback skipped/errored: {e}")

    return parsed
