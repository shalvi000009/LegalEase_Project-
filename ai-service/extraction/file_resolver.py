import logging
from pathlib import Path
from typing import Optional
from fastapi import HTTPException

logger = logging.getLogger(__name__)

_AI_SERVICE_DIR = Path(__file__).parent.parent
_SAMPLE_DOCS_DIR = _AI_SERVICE_DIR / "sample_docs"
_BACKEND_DIR = _AI_SERVICE_DIR.parent / "backend"

def resolve_document_file(s3_key: Optional[str] = None, default_filename: str = "sample_contract.pdf") -> Path:
    """
    Resolves the physical file path for a given s3_key or default filename.
    Checks:
      1. backend/ directory + s3_key
      2. backend/uploads/ + Path(s3_key).name
      3. ai-service/sample_docs/ + s3_key
      4. ai-service/sample_docs/ + Path(s3_key).name
      5. ai-service/sample_docs/ + default_filename
    """
    if s3_key:
        filename = Path(s3_key).name

        # Candidates to check
        candidates = [
            _BACKEND_DIR / s3_key,
            _BACKEND_DIR / "uploads" / filename,
            _SAMPLE_DOCS_DIR / s3_key,
            _SAMPLE_DOCS_DIR / filename,
        ]

        for path in candidates:
            if path.exists() and path.is_file():
                logger.info("Resolved document file '%s' for s3_key='%s'", path, s3_key)
                return path

        logger.warning("Could not find file for s3_key='%s' in any known path. Candidates checked: %s", s3_key, [str(c) for c in candidates])

    # Fallback to sample docs
    fallback = _SAMPLE_DOCS_DIR / default_filename
    if fallback.exists():
        logger.info("Using fallback sample file '%s'", fallback)
        return fallback

    raise HTTPException(
        status_code=404,
        detail=f"Document file not found for s3_key='{s3_key}' and default fallback '{default_filename}' missing."
    )
