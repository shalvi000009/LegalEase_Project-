"""
translation/language_config.py
==============================
Week 11 — Language Model Mapping Configuration.

Centralised mapping that tracks which target languages use a dedicated
Helsinki-NLP/opus-mt model vs. the universal NLLB fallback.

Design decision — langdetect chosen over fasttext:
    langdetect is pure Python, requires zero model downloads, and is
    sufficient for the "detect dominant language" use-case we need
    (typical legal contracts are single-language documents).
    fasttext's lid.176.bin is ~126 MB and provides marginal accuracy
    gains for well-structured text — not worth the cold-start cost
    in a Docker container that already loads transformers models.

Design decision — opus-mt preferred, NLLB as fallback:
    Helsinki-NLP/opus-mt-{src}-en models are small (~300 MB each),
    fast, and produce high-quality translations for the languages
    they cover. For languages without an opus-mt pair (e.g. Gujarati),
    we fall back to facebook/nllb-200-distilled-600M which covers
    200+ languages in a single ~1.2 GB model.
"""

from __future__ import annotations

from typing import Any, Dict, Optional


# ---------------------------------------------------------------------------
# Supported language configurations
# ---------------------------------------------------------------------------
# Each entry maps an ISO 639-1 code to its translation config.
#
# Fields:
#   name           — Human-readable language name
#   opus_mt_to_en  — HuggingFace model ID for {lang}→English (None = use NLLB)
#   opus_mt_from_en — HuggingFace model ID for English→{lang} (None = use NLLB)
#   nllb_code      — NLLB flores-200 language code (used only when opus-mt is None)
#
# To add a new language:
#   1. Check if Helsinki-NLP/opus-mt-{code}-en exists on HuggingFace.
#   2. If yes, add the model ID. If not, set to None and provide nllb_code.
#   3. nllb_code reference: https://github.com/facebookresearch/flores/blob/main/flores200/README.md
# ---------------------------------------------------------------------------

LANGUAGE_CONFIGS: Dict[str, Dict[str, Any]] = {
    "hi": {
        "name": "Hindi",
        "opus_mt_to_en": "Helsinki-NLP/opus-mt-hi-en",
        "opus_mt_from_en": "Helsinki-NLP/opus-mt-en-hi",
        "nllb_code": "hin_Deva",
    },
    "gu": {
        "name": "Gujarati",
        # No opus-mt model for Gujarati → use NLLB fallback
        "opus_mt_to_en": None,
        "opus_mt_from_en": None,
        "nllb_code": "guj_Gujr",
    },
    "fr": {
        "name": "French",
        "opus_mt_to_en": "Helsinki-NLP/opus-mt-fr-en",
        "opus_mt_from_en": "Helsinki-NLP/opus-mt-en-fr",
        "nllb_code": "fra_Latn",
    },
    "es": {
        "name": "Spanish",
        "opus_mt_to_en": "Helsinki-NLP/opus-mt-es-en",
        "opus_mt_from_en": "Helsinki-NLP/opus-mt-en-es",
        "nllb_code": "spa_Latn",
    },
    "de": {
        "name": "German",
        "opus_mt_to_en": "Helsinki-NLP/opus-mt-de-en",
        "opus_mt_from_en": "Helsinki-NLP/opus-mt-en-de",
        "nllb_code": "deu_Latn",
    },
    "pt": {
        "name": "Portuguese",
        "opus_mt_to_en": None,
        "opus_mt_from_en": None,
        "nllb_code": "por_Latn",
    },
    "zh": {
        "name": "Chinese",
        "opus_mt_to_en": "Helsinki-NLP/opus-mt-zh-en",
        "opus_mt_from_en": "Helsinki-NLP/opus-mt-en-zh",
        "nllb_code": "zho_Hans",
    },
    "ja": {
        "name": "Japanese",
        "opus_mt_to_en": "Helsinki-NLP/opus-mt-ja-en",
        "opus_mt_from_en": "Helsinki-NLP/opus-mt-en-ja",
        "nllb_code": "jpn_Jpan",
    },
    "ar": {
        "name": "Arabic",
        "opus_mt_to_en": "Helsinki-NLP/opus-mt-ar-en",
        "opus_mt_from_en": "Helsinki-NLP/opus-mt-en-ar",
        "nllb_code": "arb_Arab",
    },
    "mr": {
        "name": "Marathi",
        # No opus-mt model for Marathi → use NLLB fallback
        "opus_mt_to_en": None,
        "opus_mt_from_en": None,
        "nllb_code": "mar_Deva",
    },
    "ta": {
        "name": "Tamil",
        # No opus-mt model for Tamil → use NLLB fallback
        "opus_mt_to_en": None,
        "opus_mt_from_en": None,
        "nllb_code": "tam_Taml",
    },
    "te": {
        "name": "Telugu",
        # No opus-mt model for Telugu → use NLLB fallback
        "opus_mt_to_en": None,
        "opus_mt_from_en": None,
        "nllb_code": "tel_Telu",
    },
    "bn": {
        "name": "Bengali",
        # No opus-mt model for Bengali → use NLLB fallback
        "opus_mt_to_en": None,
        "opus_mt_from_en": None,
        "nllb_code": "ben_Beng",
    },
}

# The universal NLLB fallback model — covers 200+ languages
NLLB_MODEL_ID = "facebook/nllb-200-distilled-600M"

# NLLB code for English (used as target when translating to English)
NLLB_ENGLISH_CODE = "eng_Latn"


def get_language_config(lang_code: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve the translation config for a given ISO 639-1 language code.

    Returns None if the language is not in our supported list, meaning
    we don't have a known translation path for it. The caller should
    handle this gracefully (e.g. log a warning and skip translation).
    """
    return LANGUAGE_CONFIGS.get(lang_code.lower())


def get_language_name(lang_code: str) -> str:
    """Return the human-readable name for a language code, or 'Unknown'."""
    config = LANGUAGE_CONFIGS.get(lang_code.lower())
    return config["name"] if config else "Unknown"


def is_supported_language(lang_code: str) -> bool:
    """Check if a language code has a configured translation path."""
    return lang_code.lower() in LANGUAGE_CONFIGS


def list_supported_languages() -> Dict[str, str]:
    """Return a dict of {iso_code: language_name} for all supported languages."""
    return {code: cfg["name"] for code, cfg in LANGUAGE_CONFIGS.items()}
