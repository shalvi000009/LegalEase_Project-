"""
classification/rate_limiter.py
==============================
Week 8 — Deliverable 2: Token Bucket Rate Limiter.

Provides a thread-safe and async-compatible Token Bucket rate limiter
to throttle LLM API calls and batch re-analysis workloads, controlling
cloud inference costs and respecting upstream API provider quotas.
"""

from __future__ import annotations

import asyncio
import logging
import threading
import time
from typing import Optional

logger = logging.getLogger(__name__)


class TokenBucketRateLimiter:
    """
    Standard Token Bucket Rate Limiter.
    Tokens are added continuously at a specified refill_rate (tokens/sec) up to capacity.
    """

    def __init__(
        self,
        capacity: float = 60.0,
        refill_rate: float = 1.0,  # 1 token per second = 60 per minute
        initial_tokens: Optional[float] = None,
    ) -> None:
        """
        Args:
            capacity: Maximum burst token capacity.
            refill_rate: Number of tokens added per second.
            initial_tokens: Initial token balance (defaults to capacity).
        """
        self.capacity = float(capacity)
        self.refill_rate = float(refill_rate)
        self.tokens = float(capacity if initial_tokens is None else initial_tokens)
        self.last_refill = time.monotonic()
        self._lock = threading.Lock()

    def _refill(self) -> None:
        now = time.monotonic()
        elapsed = now - self.last_refill
        if elapsed > 0:
            added = elapsed * self.refill_rate
            self.tokens = min(self.capacity, self.tokens + added)
            self.last_refill = now

    def acquire(
        self,
        tokens: float = 1.0,
        block: bool = True,
        timeout: Optional[float] = None,
    ) -> bool:
        """
        Synchronous token acquisition.
        """
        deadline = time.monotonic() + timeout if timeout is not None else None

        while True:
            with self._lock:
                self._refill()
                if self.tokens >= tokens:
                    self.tokens -= tokens
                    return True

                if not block:
                    return False

                # Calculate required sleep duration
                missing = tokens - self.tokens
                wait_time = missing / self.refill_rate

            if deadline is not None and (time.monotonic() + wait_time) > deadline:
                return False

            sleep_duration = min(wait_time, 0.5)
            time.sleep(sleep_duration)

    async def acquire_async(
        self,
        tokens: float = 1.0,
        timeout: Optional[float] = None,
    ) -> bool:
        """
        Asynchronous token acquisition that yields control to the event loop.
        """
        deadline = time.monotonic() + timeout if timeout is not None else None

        while True:
            with self._lock:
                self._refill()
                if self.tokens >= tokens:
                    self.tokens -= tokens
                    return True

                missing = tokens - self.tokens
                wait_time = missing / self.refill_rate

            if deadline is not None and (time.monotonic() + wait_time) > deadline:
                return False

            sleep_duration = min(wait_time, 0.25)
            await asyncio.sleep(sleep_duration)

    @property
    def current_tokens(self) -> float:
        """Returns the current available token balance."""
        with self._lock:
            self._refill()
            return self.tokens
