"""
classification/dedup.py
========================
Week 7 — Deliverable 3: SHA-256 Deduplication Check.

Computes cryptographic SHA-256 hashes of incoming document bytes and
checks for collisions against existing documents in a user's vault.
"""

from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from typing import Dict, Iterable, Optional, Set

logger = logging.getLogger(__name__)


@dataclass
class DeduplicationResult:
    """Represents the outcome of a document deduplication check."""
    sha256: str
    is_duplicate: bool
    duplicate_of: Optional[str] = None
    message: str = ""

    def to_dict(self) -> dict:
        return {
            "sha256": self.sha256,
            "is_duplicate": self.is_duplicate,
            "duplicate_of": self.duplicate_of,
            "message": self.message,
        }


def compute_sha256(content: bytes | str) -> str:
    """
    Computes standard hex-encoded SHA-256 digest of input bytes.
    If string is passed, it is encoded as UTF-8.
    """
    if isinstance(content, str):
        content = content.encode("utf-8")
    return hashlib.sha256(content).hexdigest().lower()


class VaultRegistry:
    """
    In-memory registry to track document SHA-256 hashes per user.
    Useful for local dev, caching, and testing without requiring direct DB access.
    """
    _instance = None

    def __new__(cls) -> VaultRegistry:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._user_vaults: Dict[str, Set[str]] = {}
        return cls._instance

    def register_hash(self, user_id: str, sha256_hash: str) -> None:
        """Register a document hash into a user's vault."""
        normalized = sha256_hash.strip().lower()
        if user_id not in self._user_vaults:
            self._user_vaults[user_id] = set()
        self._user_vaults[user_id].add(normalized)
        logger.debug("Registered hash %s for user %s", normalized, user_id)

    def get_hashes(self, user_id: str) -> Set[str]:
        """Returns the set of hashes registered for a user."""
        return self._user_vaults.get(user_id, set()).copy()

    def clear(self, user_id: Optional[str] = None) -> None:
        """Clears vault registry for a specific user or all users."""
        if user_id:
            self._user_vaults.pop(user_id, None)
        else:
            self._user_vaults.clear()


def check_deduplication(
    file_bytes_or_hash: bytes | str,
    existing_hashes: Optional[Iterable[str]] = None,
    user_id: Optional[str] = None,
    vault_registry: Optional[VaultRegistry] = None,
) -> DeduplicationResult:
    """
    Evaluates whether an incoming file (or precomputed SHA-256 hash) is a duplicate
    of an existing document in the user's vault.

    Args:
        file_bytes_or_hash: Raw bytes of the document, or a 64-char hex SHA-256 string.
        existing_hashes: Optional collection of SHA-256 hashes provided by the caller.
        user_id: Optional user identifier to check against the in-memory VaultRegistry.
        vault_registry: Optional VaultRegistry instance (defaults to singleton).

    Returns:
        DeduplicationResult with sha256, is_duplicate, duplicate_of, and descriptive message.
    """
    # 1. Determine or compute SHA-256 hash
    if isinstance(file_bytes_or_hash, str) and len(file_bytes_or_hash) == 64 and all(c in "0123456789abcdefABCDEF" for c in file_bytes_or_hash):
        file_hash = file_bytes_or_hash.strip().lower()
    else:
        file_hash = compute_sha256(file_bytes_or_hash)

    # 2. Gather candidate existing hashes
    candidate_hashes: Set[str] = set()

    if existing_hashes is not None:
        for h in existing_hashes:
            if h and isinstance(h, str):
                candidate_hashes.add(h.strip().lower())

    if user_id:
        registry = vault_registry or VaultRegistry()
        candidate_hashes.update(registry.get_hashes(user_id))

    # 3. Check for collision
    if file_hash in candidate_hashes:
        logger.info("Deduplication match found for hash: %s", file_hash)
        return DeduplicationResult(
            sha256=file_hash,
            is_duplicate=True,
            duplicate_of=file_hash,
            message="Document is an exact duplicate of an existing file in the user's vault.",
        )

    logger.debug("Deduplication check passed (unique document): %s", file_hash)
    return DeduplicationResult(
        sha256=file_hash,
        is_duplicate=False,
        duplicate_of=None,
        message="Document is unique (no SHA-256 match found in vault).",
    )
