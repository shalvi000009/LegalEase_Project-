"""
extraction/pdf_extractor.py
===========================
Week 2 — Deliverable 1: PyMuPDF-based text extraction for digital (non-scanned) PDFs.

Fully functional. No API-key blockers.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import List, Dict, Any

# PyMuPDF exposes itself as `fitz`
import fitz  # type: ignore[import-untyped]  # pymupdf

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_text_from_pdf(pdf_path: str | Path) -> Dict[str, Any]:
    """
    Extract text from a digital (non-scanned) PDF using PyMuPDF.

    Args:
        pdf_path: Filesystem path to the PDF file.

    Returns:
        {
            "full_text": str,          # Concatenated text from all pages
            "pages": [                 # Per-page breakdown
                {
                    "page_number": int,     # 1-indexed
                    "text": str,
                    "char_count": int,
                }
            ],
            "page_count": int,
            "metadata": dict,          # PyMuPDF document metadata dict
            "source": str,             # Resolved absolute path
        }

    Raises:
        FileNotFoundError: if pdf_path does not exist.
        ValueError: if the file is not a readable PDF.
    """
    pdf_path = Path(pdf_path).resolve()
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    logger.info("Extracting text from PDF: %s", pdf_path)

    try:
        doc: fitz.Document = fitz.open(str(pdf_path))
    except Exception as exc:
        raise ValueError(f"Cannot open PDF '{pdf_path}': {exc}") from exc

    pages: List[Dict[str, Any]] = []
    text_blocks: List[str] = []

    for page_idx in range(doc.page_count):
        page: fitz.Page = doc.load_page(page_idx)
        page_text: str = page.get_text("text")  # plain text extraction
        pages.append(
            {
                "page_number": page_idx + 1,
                "text": page_text,
                "char_count": len(page_text),
            }
        )
        text_blocks.append(page_text)

    full_text = "\n".join(text_blocks).strip()
    metadata = doc.metadata or {}
    doc.close()

    logger.info(
        "PDF extraction complete: %d pages, %d chars total",
        len(pages),
        len(full_text),
    )

    return {
        "full_text": full_text,
        "pages": pages,
        "page_count": len(pages),
        "metadata": metadata,
        "source": str(pdf_path),
    }


def is_scanned_pdf(pdf_path: str | Path, text_char_threshold: int = 100) -> bool:
    """
    Heuristic: if total extracted text is below `text_char_threshold`
    the PDF is likely a scanned image that needs OCR, not PyMuPDF extraction.

    Args:
        pdf_path: Path to the PDF.
        text_char_threshold: Minimum character count to consider the PDF digital.

    Returns:
        True  → treat as scanned (use OpenCV + Tesseract pipeline)
        False → treat as digital (use PyMuPDF extraction)
    """
    result = extract_text_from_pdf(pdf_path)
    is_scanned = len(result["full_text"]) < text_char_threshold
    logger.debug(
        "is_scanned_pdf(%s) → %s (chars=%d, threshold=%d)",
        pdf_path,
        is_scanned,
        len(result["full_text"]),
        text_char_threshold,
    )
    return is_scanned


def extract_text_from_scanned_pdf(
    pdf_path: str | Path,
    *,
    lang: str = "eng",
    tesseract_config: str = "--psm 3",
    attempt_warp: bool = True,
    deskew: bool = True,
    enhance: bool = True,
) -> Dict[str, Any]:
    """
    Extract text from a scanned PDF by rasterising each page and running OCR.

    Args:
        pdf_path: Path to the PDF.
        lang: Tesseract language code.
        tesseract_config: Tesseract configuration options.
        attempt_warp: Whether to apply perspective warp.
        deskew: Whether to deskew the images.
        enhance: Whether to apply CLAHE contrast enhancement.

    Returns:
        {
            "full_text": str,
            "pages": [
                {
                    "page_number": int,
                    "text": str,
                    "char_count": int,
                }
            ],
            "page_count": int,
            "metadata": dict,
            "source": str,
            "ocr_used": True,
        }
    """
    import numpy as np
    import cv2
    from extraction.ocr_preprocessor import preprocess_and_ocr

    pdf_path = Path(pdf_path).resolve()
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    logger.info("Extracting text from scanned PDF via OCR: %s", pdf_path)

    try:
        doc: fitz.Document = fitz.open(str(pdf_path))
    except Exception as exc:
        raise ValueError(f"Cannot open PDF '{pdf_path}': {exc}") from exc

    pages: List[Dict[str, Any]] = []
    text_blocks: List[str] = []

    for page_idx in range(doc.page_count):
        page: fitz.Page = doc.load_page(page_idx)
        # Rasterise page to an image. Use 2.0x zoom (144 DPI) for better OCR accuracy.
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat)
        
        img_bytes = pix.tobytes("png")
        arr = np.frombuffer(img_bytes, np.uint8)
        img_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)

        ocr_result = preprocess_and_ocr(
            img_bgr,
            lang=lang,
            tesseract_config=tesseract_config,
            attempt_warp=attempt_warp,
            deskew=deskew,
            enhance=enhance,
        )
        page_text = ocr_result["text"]

        pages.append(
            {
                "page_number": page_idx + 1,
                "text": page_text,
                "char_count": len(page_text),
            }
        )
        text_blocks.append(page_text)

    full_text = "\n".join(text_blocks).strip()
    metadata = doc.metadata or {}
    doc.close()

    logger.info(
        "Scanned PDF OCR complete: %d pages, %d chars total",
        len(pages),
        len(full_text),
    )

    return {
        "full_text": full_text,
        "pages": pages,
        "page_count": len(pages),
        "metadata": metadata,
        "source": str(pdf_path),
        "ocr_used": True,
    }

