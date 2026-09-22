"""
classification/cache.py
=======================
Week 9 Deliverable 2: High-performance Dual-Mode Cache for LLM and RAG queries.

Supports:
  1. Redis backend (when REDIS_URL or redis://localhost:6379 is reachable and redis-py is available).
  2. In-memory thread-safe LRU + TTL fallback (active if Redis is unavailable or offline).
  3. SHA-256 deterministic key generation.
  4. Cost and latency telemetry (hits, misses, hit ratio, tokens saved, USD saved).

Standardized Cache-Key Conventions:
  - RAG query: "rag:doc:{doc_id}:q:{sha256(normalized_query)}"
  - GPT-4o checklist: "llm:gpt4o:checklist:{sha256(fingerprint)}"
  - Embedding vector: "emb:model:{model}:q:{sha256(text)}"
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
import threading
import time
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Default Time-To-Live: 24 hours
DEFAULT_CACHE_TTL = 86400

# Pricing reference: GPT-4o input $2.50 / 1M tokens, output $10.00 / 1M tokens
ESTIMATED_TOKENS_PER_RAG_QUERY = 1200
ESTIMATED_COST_PER_QUERY_USD = 0.005


class InMemoryCache:
    """
    Thread-safe in-memory cache with TTL expiration.
    """

    def __init__(self, max_items: int = 10000) -> None:
        self._max_items = max_items
        self._store: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            record = self._store.get(key)
            if not record:
                return None
            if time.time() > record["expires_at"]:
                del self._store[key]
                return None
            return record["value"]

    def set(self, key: str, value: Any, ttl: int = DEFAULT_CACHE_TTL) -> None:
        with self._lock:
            if len(self._store) >= self._max_items:
                # Evict oldest 10%
                keys_to_evict = list(self._store.keys())[: max(1, self._max_items // 10)]
                for k in keys_to_evict:
                    self._store.pop(k, None)

            self._store[key] = {
                "value": value,
                "expires_at": time.time() + ttl,
                "created_at": time.time(),
            }

    def delete(self, key: str) -> bool:
        with self._lock:
            return self._store.pop(key, None) is not None

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    def size(self) -> int:
        with self._lock:
            return len(self._store)


class DualModeCache:
    """
    Dual-mode cache: attempts Redis connection first; falls back seamlessly
    to thread-safe in-memory cache.
    """

    def __init__(self) -> None:
        self._redis_client = None
        self._is_redis_active = False
        self._memory_cache = InMemoryCache()
        
        # Telemetry counters
        self._hits = 0
        self._misses = 0
        self._lock = threading.Lock()

        self._init_redis()

    def _init_redis(self) -> None:
        """Attempts to initialize Redis client if library and connection are available."""
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        try:
            import redis  # pyrefly: ignore [missing-import]
            client = redis.from_url(redis_url, socket_timeout=1.0, decode_responses=True)
            # Test ping
            client.ping()
            self._redis_client = client
            self._is_redis_active = True
            logger.info("Connected to Redis cache at %s", redis_url)
        except Exception as e:
            self._is_redis_active = False
            self._redis_client = None
            logger.info(
                "Redis cache offline or unavailable (%s). Using thread-safe in-memory cache.",
                e,
            )

    @property
    def backend(self) -> str:
        return "redis" if self._is_redis_active else "in-memory"

    def normalize_query(self, query: str) -> str:
        """Normalizes query string (lowercased, whitespace-collapsed, punctuation trimmed)."""
        clean = query.strip().lower()
        clean = re.sub(r"[^\w\s]", " ", clean)
        clean = re.sub(r"\s+", " ", clean).strip()
        return clean

    def generate_cache_key(self, prefix: str, *parts: Any) -> str:
        """
        Generates a standardized cache key using SHA-256 for components.
        e.g. generate_cache_key("rag:doc:123", "what is liability?")
        """
        combined = ":".join(str(p).strip() for p in parts)
        hashed = hashlib.sha256(combined.encode("utf-8")).hexdigest()
        return f"{prefix}:{hashed}"

    def get_rag_cache_key(self, doc_id: str, query: str) -> str:
        """
        Standardized RAG query cache key:
        rag:doc:{doc_id}:q:{sha256(normalized_query)}
        """
        norm_q = self.normalize_query(query)
        q_hash = hashlib.sha256(norm_q.encode("utf-8")).hexdigest()
        return f"rag:doc:{doc_id}:q:{q_hash}"

    def get(self, key: str) -> Optional[Any]:
        """Retrieves a cached value by key."""
        val = None
        if self._is_redis_active and self._redis_client:
            try:
                raw = self._redis_client.get(key)
                if raw:
                    val = json.loads(raw)
            except Exception as e:
                logger.warning("Redis get failed for key '%s': %s. Falling back to memory.", key, e)
                val = self._memory_cache.get(key)
        else:
            val = self._memory_cache.get(key)

        with self._lock:
            if val is not None:
                self._hits += 1
            else:
                self._misses += 1

        return val

    def set(self, key: str, value: Any, ttl: int = DEFAULT_CACHE_TTL) -> None:
        """Stores a value in cache with TTL."""
        if self._is_redis_active and self._redis_client:
            try:
                payload = json.dumps(value)
                self._redis_client.setex(key, ttl, payload)
                return
            except Exception as e:
                logger.warning("Redis set failed for key '%s': %s. Writing to memory.", key, e)

        # Fallback / Mirror to memory cache
        self._memory_cache.set(key, value, ttl)

    def delete(self, key: str) -> bool:
        """Deletes a key from cache."""
        deleted = False
        if self._is_redis_active and self._redis_client:
            try:
                deleted = bool(self._redis_client.delete(key))
            except Exception:
                pass
        mem_deleted = self._memory_cache.delete(key)
        return deleted or mem_deleted

    def clear(self) -> None:
        """Clears all cached entries."""
        if self._is_redis_active and self._redis_client:
            try:
                self._redis_client.flushdb()
            except Exception:
                pass
        self._memory_cache.clear()

    def get_stats(self) -> Dict[str, Any]:
        """Returns cache telemetry and savings metrics."""
        with self._lock:
            total = self._hits + self._misses
            ratio = (self._hits / total) if total > 0 else 0.0
            tokens_saved = self._hits * ESTIMATED_TOKENS_PER_RAG_QUERY
            cost_saved_usd = self._hits * ESTIMATED_COST_PER_QUERY_USD

            return {
                "backend": self.backend,
                "hits": self._hits,
                "misses": self._misses,
                "total_requests": total,
                "hit_ratio": round(ratio, 4),
                "estimated_tokens_saved": tokens_saved,
                "estimated_cost_saved_usd": round(cost_saved_usd, 4),
                "in_memory_items": self._memory_cache.size(),
            }


# Global singleton cache instance
cache = DualModeCache()
