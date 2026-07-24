"""
extraction/chunker.py
======================
Week 2 — Deliverable 3: Text chunking pipeline using LangChain RecursiveCharacterTextSplitter.

Fully functional. No API-key blockers.

Strategy:
  - chunk_size  ≈ 500 tokens   (using a 4-char/token approximation → 2000 chars)
  - chunk_overlap ≈ 50 tokens  (→ 200 chars) to preserve cross-boundary context
  - Separators: paragraph breaks → sentence breaks → word breaks (legal text friendly)
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List

try:
    # LangChain >= 1.0 separates text splitters into its own package
    from langchain_text_splitters import RecursiveCharacterTextSplitter  # type: ignore[import-untyped]
except ImportError:
    # Fallback for older LangChain installs
    from langchain.text_splitter import RecursiveCharacterTextSplitter  # type: ignore[import-untyped]

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Approximate chars-per-token for legal English text (conservative estimate).
# text-embedding-3-small context window is 8191 tokens; we stay well under.
_CHARS_PER_TOKEN: int = 4
_TARGET_TOKENS: int = 500
_OVERLAP_TOKENS: int = 50

CHUNK_SIZE: int = _TARGET_TOKENS * _CHARS_PER_TOKEN      # 2000 chars
CHUNK_OVERLAP: int = _OVERLAP_TOKENS * _CHARS_PER_TOKEN  # 200 chars

# Separators ordered from most to least preferred for legal contract text.
_SEPARATORS: List[str] = [
    "\n\n\n",   # section breaks (triple newline)
    "\n\n",     # paragraph breaks
    "\n",       # line breaks
    ". ",       # sentence breaks
    "! ",
    "? ",
    "; ",       # legal clause separators
    ", ",
    " ",        # word breaks (last resort)
    "",         # character-level (absolute fallback)
]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def chunk_text(
    text: str,
    *,
    chunk_size: int = CHUNK_SIZE,
    chunk_overlap: int = CHUNK_OVERLAP,
    doc_id: str = "",
) -> List[Dict[str, Any]]:
    """
    Split `text` into overlapping chunks using LangChain RecursiveCharacterTextSplitter.

    Args:
        text:          The full document text to split.
        chunk_size:    Maximum characters per chunk (default: 2000 ≈ 500 tokens).
        chunk_overlap: Overlap between consecutive chunks (default: 200 ≈ 50 tokens).
        doc_id:        Optional document identifier — embedded in each chunk's metadata.

    Returns:
        List of chunk dicts:
        [
            {
                "chunk_index": int,         # 0-indexed position in the document
                "text": str,                # Chunk content
                "char_count": int,          # Length in characters
                "approx_tokens": int,       # Estimated token count
                "doc_id": str,              # Passed-through doc_id
                "metadata": {               # LangChain Document metadata
                    "start_index": int,     # Character offset in original text
                }
            },
            ...
        ]
    """
    if not text or not text.strip():
        logger.warning("chunk_text received empty text; returning empty list.")
        return []

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=_SEPARATORS,
        add_start_index=True,   # adds 'start_index' to LangChain Document metadata
    )

    documents = splitter.create_documents([text])

    chunks: List[Dict[str, Any]] = []
    for idx, doc in enumerate(documents):
        char_count = len(doc.page_content)
        chunk = {
            "chunk_index": idx,
            "text": doc.page_content,
            "char_count": char_count,
            "approx_tokens": max(1, char_count // _CHARS_PER_TOKEN),
            "doc_id": doc_id,
            "metadata": doc.metadata or {},
        }
        chunks.append(chunk)

    logger.info(
        "Chunked %d chars into %d chunks (size=%d, overlap=%d) for doc_id='%s'",
        len(text),
        len(chunks),
        chunk_size,
        chunk_overlap,
        doc_id,
    )
    return chunks


def chunk_stats(chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Compute descriptive statistics for a list of chunks (useful for logging/debugging).

    Returns:
        {
            "total_chunks": int,
            "total_chars": int,
            "avg_chars": float,
            "min_chars": int,
            "max_chars": int,
            "avg_approx_tokens": float,
        }
    """
    if not chunks:
        return {
            "total_chunks": 0,
            "total_chars": 0,
            "avg_chars": 0.0,
            "min_chars": 0,
            "max_chars": 0,
            "avg_approx_tokens": 0.0,
        }

    char_counts = [c["char_count"] for c in chunks]
    token_counts = [c["approx_tokens"] for c in chunks]
    return {
        "total_chunks": len(chunks),
        "total_chars": sum(char_counts),
        "avg_chars": round(sum(char_counts) / len(char_counts), 1),
        "min_chars": min(char_counts),
        "max_chars": max(char_counts),
        "avg_approx_tokens": round(sum(token_counts) / len(token_counts), 1),
    }
