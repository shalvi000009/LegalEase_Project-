import logging
from pathlib import Path
from typing import Optional
from fastapi import HTTPException

logger = logging.getLogger(__name__)

_AI_SERVICE_DIR = Path(__file__).parent.parent
_SAMPLE_DOCS_DIR = _AI_SERVICE_DIR / "sample_docs"
_BACKEND_DIR = _AI_SERVICE_DIR.parent / "backend"

def resolve_document_file(
    s3_key: Optional[str] = None,
    default_filename: str = "sample_contract.pdf",
    doc_id: Optional[str] = None,
) -> Path:
    """
    Resolves the physical file path for a given doc_id, s3_key, or default filename.
    Checks:
      1. backend/uploads/ recursively for any file containing doc_id
      2. backend/ directory + s3_key
      3. backend/uploads/ + s3_key
      4. backend/uploads/ + Path(s3_key).name
      5. backend/uploads/ recursively for Path(s3_key).name
      6. ai-service/sample_docs/ + s3_key
      7. ai-service/sample_docs/ + Path(s3_key).name
      8. ai-service/sample_docs/ + default_filename
    """
    uploads_dir = _BACKEND_DIR / "uploads"

    # 1. Search by doc_id in backend uploads
    if doc_id and uploads_dir.exists():
        for match in uploads_dir.glob(f"**/*{doc_id}*"):
            if match.is_file():
                logger.info("Resolved document file '%s' using doc_id='%s'", match, doc_id)
                return match

    # 2. Check s3_key candidates
    if s3_key:
        filename = Path(s3_key).name

        candidates = [
            _BACKEND_DIR / s3_key,
            _BACKEND_DIR / "uploads" / s3_key,
            _BACKEND_DIR / "uploads" / filename,
            _SAMPLE_DOCS_DIR / s3_key,
            _SAMPLE_DOCS_DIR / filename,
        ]

        for path in candidates:
            if path.exists() and path.is_file():
                logger.info("Resolved document file '%s' for s3_key='%s'", path, s3_key)
                return path

        # Recursive search in uploads for filename
        if uploads_dir.exists():
            for match in uploads_dir.glob(f"**/*{filename}*"):
                if match.is_file():
                    logger.info("Resolved document file '%s' by recursive search for filename='%s'", match, filename)
                    return match

        logger.warning(
            "Could not find file for s3_key='%s', doc_id='%s' in any known path. Candidates checked: %s",
            s3_key,
            doc_id,
            [str(c) for c in candidates],
        )

    # 3. Fallback to sample docs
    fallback = _SAMPLE_DOCS_DIR / default_filename
    if fallback.exists():
        logger.info("Using fallback sample file '%s'", fallback)
        return fallback

    raise HTTPException(
        status_code=404,
        detail=f"Document file not found for s3_key='{s3_key}', doc_id='{doc_id}' and default fallback '{default_filename}' missing."
    )

