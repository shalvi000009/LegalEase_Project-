"""
translation/detector.py
=======================
Week 11 — Deliverable 1: Language Detection Function.

Input:  Raw extracted text from a document.
Output: ISO 639-1 language code + confidence score.

Edge cases handled:
    - Very short text (< 20 chars): returns 'en' with low confidence + warning
    - Mixed-language documents: picks the dominant language from langdetect
    - Garbled OCR output: catches detection failures, logs warning, defaults to 'en'
    - Empty/whitespace text: returns 'en' with zero confidence

Uses `langdetect` (pure Python, no model download required).
"""

from __future__ import annotations

import logging
import re
from typing import Dict

logger = logging.getLogger(__name__)

# Minimum character count for reliable detection
_MIN_CHARS_FOR_DETECTION = 20

# Minimum confidence to trust the detection result
_MIN_CONFIDENCE_THRESHOLD = 0.5


def detect_language(text: str) -> Dict[str, object]:
    """
    Detect the dominant language of the input text.

    Args:
        text: Raw extracted text from a document.

    Returns:
        Dict with keys:
            - language_code (str): ISO 639-1 code (e.g. 'en', 'hi', 'fr')
            - confidence (float): Detection confidence [0.0, 1.0]
            - reliable (bool): Whether the detection is considered reliable
            - warning (str | None): Warning message if any edge case was hit
    """
    # Handle empty/whitespace-only input
    if not text or not text.strip():
        logger.warning("Language detection received empty text. Defaulting to 'en'.")
        return {
            "language_code": "en",
            "confidence": 0.0,
            "reliable": False,
            "warning": "Empty or whitespace-only text; defaulting to English.",
        }

    cleaned = text.strip()

    # Handle very short text
    if len(cleaned) < _MIN_CHARS_FOR_DETECTION:
        logger.warning(
            "Text too short for reliable language detection (%d chars). "
            "Defaulting to 'en'.",
            len(cleaned),
        )
        return {
            "language_code": "en",
            "confidence": 0.3,
            "reliable": False,
            "warning": (
                f"Text too short ({len(cleaned)} chars) for reliable detection; "
                f"defaulting to English."
            ),
        }

    # Check for predominantly non-alphabetic content (garbled OCR)
    alpha_ratio = len(re.findall(r"[a-zA-Z\u0900-\u097F\u0A80-\u0AFF\u0B80-\u0BFF"
                                  r"\u0C00-\u0C7F\u0980-\u09FF\u00C0-\u024F"
                                  r"\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF"
                                  r"\u0600-\u06FF]", cleaned)) / max(len(cleaned), 1)
    if alpha_ratio < 0.3:
        logger.warning(
            "Text appears garbled (alpha ratio=%.2f). Defaulting to 'en'.",
            alpha_ratio,
        )
        return {
            "language_code": "en",
            "confidence": 0.2,
            "reliable": False,
            "warning": (
                f"Text appears garbled or mostly non-alphabetic "
                f"(alpha ratio={alpha_ratio:.2f}); defaulting to English."
            ),
        }

    try:
        from langdetect import detect_langs, DetectorFactory

        # Make langdetect deterministic for reproducible results
        DetectorFactory.seed = 0

        # detect_langs returns a list of Language objects with lang and prob
        results = detect_langs(cleaned)

        if not results:
            logger.warning("langdetect returned no results. Defaulting to 'en'.")
            return {
                "language_code": "en",
                "confidence": 0.0,
                "reliable": False,
                "warning": "langdetect returned no results; defaulting to English.",
            }

        # Pick the dominant (highest probability) language
        dominant = results[0]
        lang_code = str(dominant.lang)
        confidence = round(float(dominant.prob), 4)

        # Normalize some langdetect codes to ISO 639-1
        # langdetect uses 'zh-cn'/'zh-tw' → normalize to 'zh'
        if lang_code.startswith("zh"):
            lang_code = "zh"

        reliable = confidence >= _MIN_CONFIDENCE_THRESHOLD
        warning = None

        if not reliable:
            warning = (
                f"Low detection confidence ({confidence:.2f}) for language '{lang_code}'. "
                f"Result may be unreliable."
            )
            logger.warning(
                "Low confidence language detection: code='%s' confidence=%.4f",
                lang_code,
                confidence,
            )

        # Log mixed-language info if multiple languages detected
        if len(results) > 1 and results[1].prob > 0.2:
            secondary = results[1]
            logger.info(
                "Mixed-language document detected: primary='%s' (%.2f), "
                "secondary='%s' (%.2f). Using dominant language.",
                lang_code,
                confidence,
                secondary.lang,
                secondary.prob,
            )
            if warning is None:
                warning = (
                    f"Mixed-language document: primary='{lang_code}' ({confidence:.2f}), "
                    f"secondary='{secondary.lang}' ({secondary.prob:.2f})."
                )

        logger.info(
            "Language detected: code='%s' confidence=%.4f reliable=%s",
            lang_code,
            confidence,
            reliable,
        )

        return {
            "language_code": lang_code,
            "confidence": confidence,
            "reliable": reliable,
            "warning": warning,
        }

    except ImportError:
        logger.error(
            "langdetect package not installed. Run: pip install langdetect"
        )
        return {
            "language_code": "en",
            "confidence": 0.0,
            "reliable": False,
            "warning": "langdetect not installed; defaulting to English.",
        }
    except Exception as exc:
        # Catch all langdetect exceptions (LangDetectException, etc.)
        logger.warning(
            "Language detection failed with error: %s. Defaulting to 'en'.",
            exc,
        )
        return {
            "language_code": "en",
            "confidence": 0.0,
            "reliable": False,
            "warning": f"Detection error: {exc}; defaulting to English.",
        }
