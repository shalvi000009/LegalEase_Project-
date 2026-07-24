"""
extraction/embeddings.py
=========================
Week 2 — Deliverable 4: Embed chunks with text-embedding-3-small and upsert to Pinecone.

STATUS: STUBBED — real OpenAI + Pinecone calls are wrapped in stubs because
        OPENAI_API_KEY and PINECONE_API_KEY are not yet available.

When keys are available:
  1. Set OPENAI_API_KEY and PINECONE_API_KEY in ai-service/.env
  2. Replace the two sections marked "TODO: BLOCKED" below with the real calls.
  3. Remove the stub functions _stub_embed_chunks() and _stub_upsert_to_pinecone().

API Contract (unchanged whether real or stubbed):
  embed_and_upsert(doc_id, chunks) → EmbedUpsertResult
"""

from __future__ import annotations

import logging
import os
import random
from typing import Any, Dict, List, TypedDict

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIM = 1536          # text-embedding-3-small output dimension
PINECONE_INDEX_NAME = "legalease-clauses"


# ---------------------------------------------------------------------------
# Type definitions
# ---------------------------------------------------------------------------
class ChunkEmbedding(TypedDict):
    chunk_index: int
    text: str
    embedding: List[float]    # length == EMBEDDING_DIM
    doc_id: str


class EmbedUpsertResult(TypedDict):
    doc_id: str
    namespace: str
    total_chunks: int
    upserted_count: int
    stub: bool                # True when using mock data


# ---------------------------------------------------------------------------
# STUB helpers (remove once keys are available)
# ---------------------------------------------------------------------------

def _stub_embed_chunks(chunks: List[Dict[str, Any]]) -> List[ChunkEmbedding]:
    """
    # TODO: BLOCKED on Week 1 keys (OPENAI_API_KEY) — replace stub with real call once keys are added.
    #
    # Real implementation:
    #   from openai import OpenAI
    #   client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    #   texts = [c["text"] for c in chunks]
    #   response = client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    #   embeddings = [item.embedding for item in response.data]

    Returns deterministic fake embeddings (all zeros with a small random noise)
    so that downstream code can be tested without real API calls.
    """
    logger.warning(
        "[STUB] _stub_embed_chunks called — returning fake %d-dim embeddings for %d chunks. "
        "Replace with real OpenAI call once OPENAI_API_KEY is available.",
        EMBEDDING_DIM,
        len(chunks),
    )
    results: List[ChunkEmbedding] = []
    for chunk in chunks:
        # Seeded fake embedding — reproducible per chunk_index + doc_id
        rng = random.Random(f"{chunk.get('doc_id', '')}-{chunk.get('chunk_index', 0)}")
        fake_vector = [rng.uniform(-0.01, 0.01) for _ in range(EMBEDDING_DIM)]
        results.append(
            ChunkEmbedding(
                chunk_index=chunk["chunk_index"],
                text=chunk["text"],
                embedding=fake_vector,
                doc_id=chunk.get("doc_id", ""),
            )
        )
    return results


def _stub_upsert_to_pinecone(
    doc_id: str,
    chunk_embeddings: List[ChunkEmbedding],
    namespace: str,
) -> int:
    """
    # TODO: BLOCKED on Week 1 keys (PINECONE_API_KEY) — replace stub with real call once keys are added.
    #
    # Real implementation:
    #   from pinecone import Pinecone
    #   pc = Pinecone(api_key=os.environ["PINECONE_API_KEY"])
    #   index = pc.Index(PINECONE_INDEX_NAME)
    #   vectors = [
    #       {
    #           "id": f"{doc_id}#chunk-{ce['chunk_index']}",
    #           "values": ce["embedding"],
    #           "metadata": {
    #               "doc_id": doc_id,
    #               "chunk_index": ce["chunk_index"],
    #               "text_preview": ce["text"][:200],
    #           },
    #       }
    #       for ce in chunk_embeddings
    #   ]
    #   upsert_response = index.upsert(vectors=vectors, namespace=namespace)
    #   return upsert_response.upserted_count

    Logs what would be upserted and returns the count without touching Pinecone.
    """
    logger.warning(
        "[STUB] _stub_upsert_to_pinecone called — would upsert %d vectors to "
        "Pinecone index '%s' namespace '%s' for doc_id='%s'. "
        "Replace with real Pinecone call once PINECONE_API_KEY is available.",
        len(chunk_embeddings),
        PINECONE_INDEX_NAME,
        namespace,
        doc_id,
    )
    for ce in chunk_embeddings:
        logger.debug(
            "[STUB] Would upsert vector id='%s#chunk-%d' (dim=%d) to namespace='%s'",
            doc_id,
            ce["chunk_index"],
            len(ce["embedding"]),
            namespace,
        )
    return len(chunk_embeddings)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def embed_and_upsert(
    doc_id: str,
    chunks: List[Dict[str, Any]],
    *,
    namespace: str | None = None,
) -> EmbedUpsertResult:
    """
    Generate embeddings for each chunk and upsert them into the Pinecone index,
    namespaced by doc_id.

    CURRENT BEHAVIOUR: Both the embed and upsert steps are STUBBED.
    See _stub_embed_chunks() and _stub_upsert_to_pinecone() above for the
    TODO comments and the ready-to-uncomment real implementations.

    Args:
        doc_id:    Unique document identifier (used as Pinecone namespace + vector ID prefix).
        chunks:    Output of extraction.chunker.chunk_text().
        namespace: Override Pinecone namespace. Defaults to doc_id.

    Returns:
        EmbedUpsertResult TypedDict.
    """
    if namespace is None:
        namespace = doc_id

    if not chunks:
        logger.warning("embed_and_upsert received empty chunks for doc_id='%s'.", doc_id)
        return EmbedUpsertResult(
            doc_id=doc_id,
            namespace=namespace,
            total_chunks=0,
            upserted_count=0,
            stub=True,
        )

    logger.info(
        "Starting embed+upsert for doc_id='%s', %d chunks, namespace='%s'",
        doc_id,
        len(chunks),
        namespace,
    )

    # Step 1 — Embed
    # TODO: BLOCKED on Week 1 keys (OPENAI_API_KEY) — replace _stub_embed_chunks with real OpenAI call once keys are added.
    chunk_embeddings = _stub_embed_chunks(chunks)

    # Step 2 — Upsert
    # TODO: BLOCKED on Week 1 keys (PINECONE_API_KEY) — replace _stub_upsert_to_pinecone with real Pinecone call once keys are added.
    upserted_count = _stub_upsert_to_pinecone(doc_id, chunk_embeddings, namespace)

    logger.info(
        "embed_and_upsert complete for doc_id='%s': %d/%d vectors upserted (stub=True)",
        doc_id,
        upserted_count,
        len(chunks),
    )

    return EmbedUpsertResult(
        doc_id=doc_id,
        namespace=namespace,
        total_chunks=len(chunks),
        upserted_count=upserted_count,
        stub=True,
    )
