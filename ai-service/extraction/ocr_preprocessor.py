"""
extraction/ocr_preprocessor.py
================================
Week 2 — Deliverable 2: OpenCV preprocessing for photographed/scanned documents.

Pipeline (fully functional, no API-key blockers):
  1. Load image (BGR via OpenCV or from bytes)
  2. Auto-detect document's four corners in the frame (contour-based)
  3. Perspective-warp to flat rectangular crop
  4. Deskew the warped image
  5. Enhance contrast (CLAHE on L-channel in LAB colourspace)
  6. Run Tesseract OCR → extracted text string

Usage:
    from extraction.ocr_preprocessor import preprocess_and_ocr, preprocess_image
"""

from __future__ import annotations

import logging
import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2  # type: ignore[import-untyped]
import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tesseract wrapper (optional dependency guard)
# ---------------------------------------------------------------------------
try:
    import pytesseract  # type: ignore[import-untyped]
    _TESSERACT_AVAILABLE = True
except ImportError:
    _TESSERACT_AVAILABLE = False
    logger.warning(
        "pytesseract not importable — OCR step will be skipped. "
        "Install it with: pip install pytesseract  (also needs system Tesseract)."
    )


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _order_points(pts: np.ndarray) -> np.ndarray:
    """
    Order four corner points as: [top-left, top-right, bottom-right, bottom-left].
    """
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]   # top-left has smallest sum
    rect[2] = pts[np.argmax(s)]   # bottom-right has largest sum
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # top-right has smallest diff
    rect[3] = pts[np.argmax(diff)]  # bottom-left has largest diff
    return rect


def _four_point_transform(image: np.ndarray, pts: np.ndarray) -> np.ndarray:
    """
    Apply a perspective transform to warp `pts` into a flat rectangle.
    """
    rect = _order_points(pts)
    tl, tr, br, bl = rect

    width_a = np.linalg.norm(br - bl)
    width_b = np.linalg.norm(tr - tl)
    max_width = max(int(width_a), int(width_b))

    height_a = np.linalg.norm(tr - br)
    height_b = np.linalg.norm(tl - bl)
    max_height = max(int(height_a), int(height_b))

    dst = np.array(
        [
            [0, 0],
            [max_width - 1, 0],
            [max_width - 1, max_height - 1],
            [0, max_height - 1],
        ],
        dtype="float32",
    )

    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (max_width, max_height))
    return warped


def _detect_document_corners(
    image: np.ndarray,
) -> Optional[np.ndarray]:
    """
    Detect the largest quadrilateral contour in the image — assumed to be the
    document boundary photographed against a contrasting background.

    Returns:
        np.ndarray of shape (4, 2) with corner coordinates, or None if not found.
    """
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Gaussian blur to reduce noise
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Adaptive edge detection (Canny)
    edges = cv2.Canny(blurred, threshold1=50, threshold2=150)

    # Dilate edges to close small gaps
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    dilated = cv2.dilate(edges, kernel, iterations=2)

    # Find contours
    contours, _ = cv2.findContours(
        dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    if not contours:
        logger.debug("No contours found; skipping perspective warp.")
        return None

    # Sort by area descending; take the largest
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    for contour in contours[:5]:  # only inspect top-5 largest
        peri = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
        if len(approx) == 4:
            # Require the contour to cover at least 10 % of the image area
            img_area = image.shape[0] * image.shape[1]
            contour_area = cv2.contourArea(approx)
            if contour_area / img_area > 0.10:
                return approx.reshape(4, 2).astype("float32")

    logger.debug("No 4-corner document boundary found; skipping perspective warp.")
    return None


def _deskew(image: np.ndarray) -> np.ndarray:
    """
    Correct slight skew in an image by rotating it to align horizontal text lines.
    Uses the minimum-area bounding rect of all foreground pixels.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image

    # Threshold to get binary image
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    # Get coordinates of all white (foreground) pixels
    coords = np.column_stack(np.where(binary > 0))
    if len(coords) == 0:
        return image

    # Minimum area bounding box
    angle = cv2.minAreaRect(coords)[-1]

    # cv2.minAreaRect returns angles in [-90, 0); correct the convention
    if angle < -45:
        angle = 90 + angle
    else:
        angle = -angle  # negate: positive = counter-clockwise

    # Skip rotation if within ±0.5° (avoid unnecessary interpolation)
    if abs(angle) < 0.5:
        return image

    logger.debug("Deskewing by %.2f°", angle)
    (h, w) = image.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(
        image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
    )
    return rotated


def _enhance_contrast(image: np.ndarray) -> np.ndarray:
    """
    Enhance contrast using CLAHE (Contrast Limited Adaptive Histogram Equalisation)
    on the L-channel of the LAB colour space, then convert back to BGR.
    """
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_enhanced = clahe.apply(l_channel)

    enhanced_lab = cv2.merge([l_enhanced, a_channel, b_channel])
    enhanced_bgr = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
    return enhanced_bgr


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def preprocess_image(
    image_input: str | Path | bytes | np.ndarray,
    *,
    attempt_warp: bool = True,
    deskew: bool = True,
    enhance: bool = True,
) -> Dict[str, Any]:
    """
    Preprocess a photographed/scanned document image for OCR.

    Steps performed (each is toggleable for testing):
      1. Load image (from path, bytes, or numpy array)
      2. Auto-detect document four corners + perspective-warp
      3. Deskew
      4. CLAHE contrast enhancement

    Args:
        image_input: File path (str/Path), raw bytes, or an OpenCV BGR ndarray.
        attempt_warp:  Whether to attempt perspective warp correction.
        deskew:        Whether to deskew the result.
        enhance:       Whether to apply CLAHE contrast enhancement.

    Returns:
        {
            "processed_image": np.ndarray,   # Final BGR image ready for OCR
            "warp_applied": bool,            # Whether warp was successfully applied
            "deskew_applied": bool,
            "enhance_applied": bool,
            "original_shape": tuple,         # (H, W, C) of the original image
            "processed_shape": tuple,
        }
    """
    # Step 1 — Load image
    if isinstance(image_input, np.ndarray):
        img = image_input.copy()
    elif isinstance(image_input, bytes):
        arr = np.frombuffer(image_input, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image from bytes.")
    else:
        path = Path(image_input).resolve()
        if not path.exists():
            raise FileNotFoundError(f"Image not found: {path}")
        img = cv2.imread(str(path))
        if img is None:
            raise ValueError(f"OpenCV could not read image: {path}")

    original_shape = img.shape
    logger.info("Preprocessing image of shape %s", original_shape)

    warp_applied = False
    deskew_applied = False
    enhance_applied = False
    processed = img

    # Step 2 — Perspective warp
    if attempt_warp:
        corners = _detect_document_corners(processed)
        if corners is not None:
            processed = _four_point_transform(processed, corners)
            warp_applied = True
            logger.info("Perspective warp applied; new shape: %s", processed.shape)
        else:
            logger.info("No document boundary detected; skipping perspective warp.")

    # Step 3 — Deskew
    if deskew:
        processed = _deskew(processed)
        deskew_applied = True

    # Step 4 — CLAHE contrast enhancement
    if enhance:
        processed = _enhance_contrast(processed)
        enhance_applied = True

    logger.info("Image preprocessing done; output shape: %s", processed.shape)
    return {
        "processed_image": processed,
        "warp_applied": warp_applied,
        "deskew_applied": deskew_applied,
        "enhance_applied": enhance_applied,
        "original_shape": original_shape,
        "processed_shape": processed.shape,
    }


def preprocess_and_ocr(
    image_input: str | Path | bytes | np.ndarray,
    *,
    lang: str = "eng",
    tesseract_config: str = "--psm 3",
    attempt_warp: bool = True,
    deskew: bool = True,
    enhance: bool = True,
) -> Dict[str, Any]:
    """
    Full pipeline: preprocess image → run Tesseract OCR → return text.

    Args:
        image_input:      Path, bytes, or ndarray.
        lang:             Tesseract language code (default: "eng").
        tesseract_config: Additional Tesseract config string.
        attempt_warp:     Pass-through to preprocess_image.
        deskew:           Pass-through to preprocess_image.
        enhance:          Pass-through to preprocess_image.

    Returns:
        {
            "text": str,
            "preprocessing": dict,   # preprocess_image() result (image excluded for serialisation)
            "ocr_available": bool,   # False if pytesseract/tesseract not installed
        }
    """
    preprocess_result = preprocess_image(
        image_input,
        attempt_warp=attempt_warp,
        deskew=deskew,
        enhance=enhance,
    )

    processed_image: np.ndarray = preprocess_result["processed_image"]

    # Serialisable subset of preprocess metadata (no ndarray)
    preprocess_meta = {k: v for k, v in preprocess_result.items() if k != "processed_image"}
    # Convert tuples to lists for JSON compatibility
    for key in ("original_shape", "processed_shape"):
        if key in preprocess_meta and isinstance(preprocess_meta[key], tuple):
            preprocess_meta[key] = list(preprocess_meta[key])

    if not _TESSERACT_AVAILABLE:
        logger.warning("Tesseract not available; returning empty text.")
        return {
            "text": "",
            "preprocessing": preprocess_meta,
            "ocr_available": False,
        }

    # Convert BGR → RGB (Tesseract works from PIL/RGB, pytesseract handles conversion)
    rgb_image = cv2.cvtColor(processed_image, cv2.COLOR_BGR2RGB)
    from PIL import Image as PilImage  # local import to avoid top-level dep issue
    pil_img = PilImage.fromarray(rgb_image)

    raw_text: str = pytesseract.image_to_string(
        pil_img, lang=lang, config=tesseract_config
    )
    cleaned_text = raw_text.strip()

    logger.info("OCR produced %d characters.", len(cleaned_text))
    return {
        "text": cleaned_text,
        "preprocessing": preprocess_meta,
        "ocr_available": True,
    }
