"""
translation/translator.py
==========================
Week 11 — Deliverables 2 & 4: Translation Functions.

Deliverable 2: Translate-to-English
    - Input: extracted text + detected language code.
    - Skips entirely if already English.
    - Chunks long documents by paragraph/sentence before translating.
    - LRU cache of last 3 loaded models to avoid reloading per request.

Deliverable 4: Reverse-Translation (English → original language)
    - Translates generated explanations/chat answers back to original language.
    - Exposed as `respond_in_original_language` parameter on endpoints.

Model selection:
    - Prefers Helsinki-NLP/opus-mt-{src}-en (small, fast).
    - Falls back to facebook/nllb-200-distilled-600M for unsupported pairs.
"""

from __future__ import annotations

import logging
import re
from collections import OrderedDict
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# LRU Model Cache — keeps the last N loaded translation models in memory.
# Each entry is (model, tokenizer) keyed by the HuggingFace model ID.
# ---------------------------------------------------------------------------
_MAX_CACHED_MODELS = 3


class _ModelCache:
    """Simple LRU cache for loaded translation models."""

    def __init__(self, max_size: int = _MAX_CACHED_MODELS):
        self._cache: OrderedDict[str, Tuple[Any, Any]] = OrderedDict()
        self._max_size = max_size

    def get(self, model_id: str) -> Optional[Tuple[Any, Any]]:
        if model_id in self._cache:
            # Move to end (most recently used)
            self._cache.move_to_end(model_id)
            return self._cache[model_id]
        return None

    def put(self, model_id: str, model: Any, tokenizer: Any) -> None:
        if model_id in self._cache:
            self._cache.move_to_end(model_id)
        else:
            if len(self._cache) >= self._max_size:
                evicted_key, _ = self._cache.popitem(last=False)
                logger.info("Model cache evicted: '%s'", evicted_key)
            self._cache[model_id] = (model, tokenizer)
            logger.info(
                "Model cached: '%s' (cache size: %d/%d)",
                model_id,
                len(self._cache),
                self._max_size,
            )

    def clear(self) -> None:
        self._cache.clear()


_model_cache = _ModelCache()


# ---------------------------------------------------------------------------
# Model Loading
# ---------------------------------------------------------------------------

def _load_opus_mt_model(model_id: str) -> Tuple[Any, Any]:
    """
    Load a Helsinki-NLP/opus-mt model + tokenizer.
    Uses the LRU cache to avoid redundant loading.
    """
    cached = _model_cache.get(model_id)
    if cached is not None:
        logger.info("Using cached opus-mt model: '%s'", model_id)
        return cached

    logger.info("Loading opus-mt model: '%s' (this may take a moment)...", model_id)

    from transformers import MarianMTModel, MarianTokenizer

    tokenizer = MarianTokenizer.from_pretrained(model_id)
    model = MarianMTModel.from_pretrained(model_id)

    _model_cache.put(model_id, model, tokenizer)
    return model, tokenizer


def _load_nllb_model() -> Tuple[Any, Any]:
    """
    Load the universal NLLB-200 model + tokenizer.
    Uses the LRU cache to avoid redundant loading.
    """
    from translation.language_config import NLLB_MODEL_ID

    cached = _model_cache.get(NLLB_MODEL_ID)
    if cached is not None:
        logger.info("Using cached NLLB model: '%s'", NLLB_MODEL_ID)
        return cached

    logger.info("Loading NLLB model: '%s' (this may take a moment)...", NLLB_MODEL_ID)

    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

    tokenizer = AutoTokenizer.from_pretrained(NLLB_MODEL_ID)
    model = AutoModelForSeq2SeqLM.from_pretrained(NLLB_MODEL_ID)

    _model_cache.put(NLLB_MODEL_ID, model, tokenizer)
    return model, tokenizer


# ---------------------------------------------------------------------------
# Text Chunking for Translation
# ---------------------------------------------------------------------------

# opus-mt models typically have a max input length of ~512 tokens.
# We'll use a conservative character limit to stay within bounds.
_MAX_CHUNK_CHARS = 1000  # ~250 tokens for English, varies for other scripts


def _chunk_text_for_translation(text: str) -> List[str]:
    """
    Split text into translation-safe chunks by paragraph, then by sentence
    if a paragraph exceeds the max chunk size.

    Preserves paragraph boundaries for coherent reassembly.
    Never silently truncates — all content is included.
    """
    if not text or not text.strip():
        return []

    # Split by double newlines (paragraphs) first
    paragraphs = re.split(r"\n\s*\n", text.strip())

    chunks: List[str] = []

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        if len(para) <= _MAX_CHUNK_CHARS:
            chunks.append(para)
        else:
            # Paragraph too long — split by sentences
            sentences = re.split(r"(?<=[.!?।。？！])\s+", para)
            current_chunk = ""

            for sentence in sentences:
                sentence = sentence.strip()
                if not sentence:
                    continue

                if len(current_chunk) + len(sentence) + 1 <= _MAX_CHUNK_CHARS:
                    current_chunk = (
                        f"{current_chunk} {sentence}" if current_chunk else sentence
                    )
                else:
                    if current_chunk:
                        chunks.append(current_chunk)

                    # If a single sentence exceeds limit, split by words
                    if len(sentence) > _MAX_CHUNK_CHARS:
                        words = sentence.split()
                        word_chunk = ""
                        for word in words:
                            if len(word_chunk) + len(word) + 1 <= _MAX_CHUNK_CHARS:
                                word_chunk = (
                                    f"{word_chunk} {word}" if word_chunk else word
                                )
                            else:
                                if word_chunk:
                                    chunks.append(word_chunk)
                                word_chunk = word
                        if word_chunk:
                            current_chunk = word_chunk
                        else:
                            current_chunk = ""
                    else:
                        current_chunk = sentence

            if current_chunk:
                chunks.append(current_chunk)

    return chunks


# ---------------------------------------------------------------------------
# Core Translation Functions
# ---------------------------------------------------------------------------

def _translate_chunks_opus_mt(
    chunks: List[str],
    model_id: str,
) -> List[str]:
    """Translate a list of text chunks using an opus-mt model."""
    import torch

    model, tokenizer = _load_opus_mt_model(model_id)
    translated_chunks: List[str] = []

    for i, chunk in enumerate(chunks):
        try:
            inputs = tokenizer(
                chunk,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=512,
            )
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    max_length=512,
                    num_beams=4,
                    early_stopping=True,
                )
            result = tokenizer.decode(outputs[0], skip_special_tokens=True)
            translated_chunks.append(result)
        except Exception as exc:
            logger.warning(
                "Failed to translate chunk %d/%d with %s: %s. "
                "Keeping original text for this chunk.",
                i + 1,
                len(chunks),
                model_id,
                exc,
            )
            translated_chunks.append(chunk)

    return translated_chunks


def _translate_chunks_nllb(
    chunks: List[str],
    source_nllb_code: str,
    target_nllb_code: str,
) -> List[str]:
    """Translate a list of text chunks using the NLLB-200 model."""
    import torch

    model, tokenizer = _load_nllb_model()
    translated_chunks: List[str] = []

    for i, chunk in enumerate(chunks):
        try:
            tokenizer.src_lang = source_nllb_code
            inputs = tokenizer(
                chunk,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=512,
            )
            target_lang_id = tokenizer.convert_tokens_to_ids(target_nllb_code)
            with torch.no_grad():
                outputs = model.generate(
                    **inputs,
                    forced_bos_token_id=target_lang_id,
                    max_length=512,
                    num_beams=4,
                    early_stopping=True,
                )
            result = tokenizer.decode(outputs[0], skip_special_tokens=True)
            translated_chunks.append(result)
        except Exception as exc:
            logger.warning(
                "Failed to translate chunk %d/%d with NLLB (%s→%s): %s. "
                "Keeping original text for this chunk.",
                i + 1,
                len(chunks),
                source_nllb_code,
                target_nllb_code,
                exc,
            )
            translated_chunks.append(chunk)

    return translated_chunks


# ---------------------------------------------------------------------------
# Public API — Deliverable 2: Translate to English
# ---------------------------------------------------------------------------

def translate_to_english(
    text: str,
    source_lang: str,
) -> Dict[str, Any]:
    """
    Translate extracted document text to English.

    Skips entirely if source_lang is 'en'. Chunks long documents to avoid
    truncation. Uses opus-mt where available, NLLB fallback otherwise.

    Args:
        text: Extracted document text in the source language.
        source_lang: ISO 639-1 language code (e.g. 'hi', 'fr', 'gu').

    Returns:
        Dict with keys:
            - translated_text (str): English translation (or original if en)
            - translation_used (bool): Whether translation was performed
            - source_language (str): ISO code of the source language
            - model_used (str | None): Model ID used for translation
            - chunks_translated (int): Number of chunks translated
            - total_chars_original (int): Character count of original text
            - total_chars_translated (int): Character count of translated text
    """
    if source_lang.lower() == "en":
        return {
            "translated_text": text,
            "translation_used": False,
            "source_language": "en",
            "model_used": None,
            "chunks_translated": 0,
            "total_chars_original": len(text),
            "total_chars_translated": len(text),
        }

    from translation.language_config import (
        NLLB_ENGLISH_CODE,
        get_language_config,
        get_language_name,
    )

    config = get_language_config(source_lang)
    if config is None:
        logger.warning(
            "Language '%s' not in supported configs. Attempting NLLB with "
            "generic code. Results may be unreliable.",
            source_lang,
        )
        # Attempt NLLB with a generic code based on ISO 639-1
        # This is a best-effort fallback
        config = {
            "name": "Unknown",
            "opus_mt_to_en": None,
            "opus_mt_from_en": None,
            "nllb_code": None,
        }

    # Chunk the text
    chunks = _chunk_text_for_translation(text)
    if not chunks:
        return {
            "translated_text": "",
            "translation_used": False,
            "source_language": source_lang,
            "model_used": None,
            "chunks_translated": 0,
            "total_chars_original": len(text),
            "total_chars_translated": 0,
        }

    logger.info(
        "Translating %d chunks from '%s' (%s) to English...",
        len(chunks),
        source_lang,
        config.get("name", "Unknown"),
    )

    # Decide which model to use
    opus_model = config.get("opus_mt_to_en")
    model_used: str

    if opus_model:
        # Use dedicated opus-mt model
        model_used = opus_model
        translated_chunks = _translate_chunks_opus_mt(chunks, opus_model)
    else:
        # Fall back to NLLB
        nllb_code = config.get("nllb_code")
        if not nllb_code:
            logger.error(
                "No NLLB code configured for language '%s'. Cannot translate.",
                source_lang,
            )
            return {
                "translated_text": text,
                "translation_used": False,
                "source_language": source_lang,
                "model_used": None,
                "chunks_translated": 0,
                "total_chars_original": len(text),
                "total_chars_translated": len(text),
            }

        from translation.language_config import NLLB_MODEL_ID
        model_used = NLLB_MODEL_ID
        translated_chunks = _translate_chunks_nllb(
            chunks,
            source_nllb_code=nllb_code,
            target_nllb_code=NLLB_ENGLISH_CODE,
        )

    # Reassemble — join with double newlines to preserve paragraph structure
    translated_text = "\n\n".join(translated_chunks)

    logger.info(
        "Translation complete: %d chunks, %d→%d chars, model='%s'",
        len(chunks),
        len(text),
        len(translated_text),
        model_used,
    )

    return {
        "translated_text": translated_text,
        "translation_used": True,
        "source_language": source_lang,
        "model_used": model_used,
        "chunks_translated": len(chunks),
        "total_chars_original": len(text),
        "total_chars_translated": len(translated_text),
    }


# ---------------------------------------------------------------------------
# Public API — Deliverable 4: Reverse-translate from English
# ---------------------------------------------------------------------------

def translate_from_english(
    text: str,
    target_lang: str,
) -> Dict[str, Any]:
    """
    Translate an English explanation/chat answer back to the target language.

    Args:
        text: English text to translate (e.g. clause explanation, chat answer).
        target_lang: ISO 639-1 code of the original document language.

    Returns:
        Dict with keys:
            - translated_text (str): Text in the target language
            - translation_used (bool): Whether translation was performed
            - target_language (str): ISO code of the target language
            - model_used (str | None): Model ID used for translation
    """
    if target_lang.lower() == "en":
        return {
            "translated_text": text,
            "translation_used": False,
            "target_language": "en",
            "model_used": None,
        }

    from translation.language_config import (
        NLLB_ENGLISH_CODE,
        get_language_config,
    )

    config = get_language_config(target_lang)
    if config is None:
        logger.warning(
            "Reverse translation: language '%s' not in supported configs. "
            "Returning English text.",
            target_lang,
        )
        return {
            "translated_text": text,
            "translation_used": False,
            "target_language": target_lang,
            "model_used": None,
        }

    # Chunk the text (explanations are usually short, but be safe)
    chunks = _chunk_text_for_translation(text)
    if not chunks:
        return {
            "translated_text": "",
            "translation_used": False,
            "target_language": target_lang,
            "model_used": None,
        }

    logger.info(
        "Reverse-translating %d chunks from English to '%s' (%s)...",
        len(chunks),
        target_lang,
        config.get("name", "Unknown"),
    )

    # Decide model
    opus_model = config.get("opus_mt_from_en")
    model_used: str

    if opus_model:
        model_used = opus_model
        translated_chunks = _translate_chunks_opus_mt(chunks, opus_model)
    else:
        nllb_code = config.get("nllb_code")
        if not nllb_code:
            logger.error(
                "No NLLB code for reverse translation to '%s'. Returning English.",
                target_lang,
            )
            return {
                "translated_text": text,
                "translation_used": False,
                "target_language": target_lang,
                "model_used": None,
            }

        from translation.language_config import NLLB_MODEL_ID
        model_used = NLLB_MODEL_ID
        translated_chunks = _translate_chunks_nllb(
            chunks,
            source_nllb_code=NLLB_ENGLISH_CODE,
            target_nllb_code=nllb_code,
        )

    translated_text = "\n\n".join(translated_chunks)

    logger.info(
        "Reverse translation complete: %d chunks, model='%s'",
        len(chunks),
        model_used,
    )

    return {
        "translated_text": translated_text,
        "translation_used": True,
        "target_language": target_lang,
        "model_used": model_used,
    }
