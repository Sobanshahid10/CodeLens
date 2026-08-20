from __future__ import annotations

import asyncio
import os
import re
from dataclasses import dataclass
from typing import Any

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    FieldCondition,
    Filter,
    MatchValue,
    ScoredPoint,
    SearchParams,
    SparseVector,
)

from packages.llm_gateway.src.providers.base import BaseLLMProvider
from packages.llm_gateway.src.router import get_provider


@dataclass
class NamedVector:
    name: str
    vector: list[float]


@dataclass
class NamedSparseVector:
    name: str
    vector: SparseVector


@dataclass
class SearchHit:
    chunk_id: str
    file_path: str
    function_name: str | None
    source_code: str
    start_line: int
    end_line: int
    language: str
    docstring: str | None
    rrf_score: float
    dense_rank: int | None = None
    sparse_rank: int | None = None


class HybridSearchEngine:
    """Hybrid code search combining dense neural retrieval and sparse retrieval with RRF."""

    def __init__(
        self,
        client: AsyncQdrantClient | None = None,
        provider: BaseLLMProvider | None = None,
    ) -> None:
        if client is not None:
            self._client = client
        else:
            qdrant_url = os.environ.get("QDRANT_URL", "http://localhost:6333")
            qdrant_api_key = os.environ.get("QDRANT_API_KEY")
            self._client = AsyncQdrantClient(url=qdrant_url, api_key=qdrant_api_key)

        self._provider = provider or get_provider()

    async def search(
        self,
        query: str,
        repo_id: str,
        top_k: int = 5,
        language_filter: str | None = None,
    ) -> list[SearchHit]:
        """Perform hybrid search over indexed repository chunks."""
        # 1. Embed query for dense search
        embed_result = await self._provider.embed([query])
        dense_vector = embed_result.vectors[0]

        # 2. Build sparse query vector
        sparse_vector = self._build_sparse_vector(query)

        # 3. Build filter for repository and optional language
        conditions = [FieldCondition(key="repo_id", match=MatchValue(value=repo_id))]
        if language_filter:
            conditions.append(
                FieldCondition(key="language", match=MatchValue(value=language_filter))
            )
        filter_ = Filter(must=conditions)

        # 4. Search dense and sparse in parallel
        dense_results, sparse_results = await asyncio.gather(
            self._dense_search(dense_vector, filter_),
            self._sparse_search(sparse_vector, filter_),
        )

        # 5. Fuse results using Reciprocal Rank Fusion
        return self._reciprocal_rank_fusion(dense_results, sparse_results, top_k=top_k)

    def _build_sparse_vector(self, query: str) -> dict[str, Any]:
        """Tokenize query string and compute term frequencies mapped into sparse vector indices."""
        tokens = re.findall(r"\w+", query.lower())
        if not tokens:
            return {"indices": [0], "values": [1.0]}

        term_freqs: dict[int, float] = {}
        for token in tokens:
            idx = abs(hash(token)) % 65536
            term_freqs[idx] = term_freqs.get(idx, 0.0) + 1.0

        return {
            "indices": list(term_freqs.keys()),
            "values": list(term_freqs.values()),
        }

    async def _dense_search(
        self,
        vector: list[float],
        filter_: Filter,
    ) -> list[ScoredPoint]:
        """Query Qdrant dense vector index."""
        named_vector = NamedVector(name="dense", vector=vector)
        if hasattr(self._client, "search"):
            res = await self._client.search(
                collection_name="code_chunks",
                query_vector=named_vector,
                query_filter=filter_,
                limit=20,
                search_params={"hnsw_ef": 64},
                with_payload=True,
            )
            return list(res)
        elif hasattr(self._client, "query_points"):
            res = await self._client.query_points(
                collection_name="code_chunks",
                using="dense",
                query=vector,
                query_filter=filter_,
                limit=20,
                search_params=SearchParams(hnsw_ef=64),
                with_payload=True,
            )
            return list(res.points)
        return []

    async def _sparse_search(
        self,
        sparse: dict[str, Any],
        filter_: Filter,
    ) -> list[ScoredPoint]:
        """Query Qdrant sparse vector index."""
        sparse_vec = SparseVector(
            indices=sparse.get("indices", []),
            values=sparse.get("values", []),
        )
        named_sparse = NamedSparseVector(name="sparse", vector=sparse_vec)
        if hasattr(self._client, "search"):
            res = await self._client.search(
                collection_name="code_chunks",
                query_vector=named_sparse,
                query_filter=filter_,
                limit=20,
                with_payload=True,
            )
            return list(res)
        elif hasattr(self._client, "query_points"):
            res = await self._client.query_points(
                collection_name="code_chunks",
                using="sparse",
                query=sparse_vec,
                query_filter=filter_,
                limit=20,
                with_payload=True,
            )
            return list(res.points)
        return []

    def _reciprocal_rank_fusion(
        self,
        dense: list[ScoredPoint],
        sparse: list[ScoredPoint],
        top_k: int = 5,
    ) -> list[SearchHit]:
        """Fuse dense and sparse ranked lists using Reciprocal Rank Fusion (RRF).

        Formula: score(d) = sum(1.0 / (k + rank(d))) where k = 60.
        """
        k = 60
        scores: dict[str, float] = {}
        dense_ranks: dict[str, int] = {}
        sparse_ranks: dict[str, int] = {}
        point_payloads: dict[str, dict[str, Any]] = {}

        # 1. Process dense rankings
        for rank, point in enumerate(dense, start=1):
            point_id = str(point.id)
            scores[point_id] = scores.get(point_id, 0.0) + (1.0 / (k + rank))
            dense_ranks[point_id] = rank
            if point.payload:
                point_payloads[point_id] = dict(point.payload)

        # 2. Process sparse rankings
        for rank, point in enumerate(sparse, start=1):
            point_id = str(point.id)
            scores[point_id] = scores.get(point_id, 0.0) + (1.0 / (k + rank))
            sparse_ranks[point_id] = rank
            if point.payload and point_id not in point_payloads:
                point_payloads[point_id] = dict(point.payload)

        # 3. Sort by fused score descending
        sorted_point_ids = sorted(scores.keys(), key=lambda pid: scores[pid], reverse=True)

        hits: list[SearchHit] = []
        for pid in sorted_point_ids[:top_k]:
            payload = point_payloads.get(pid, {})
            hit = SearchHit(
                chunk_id=str(payload.get("chunk_id", str(pid))),
                file_path=str(payload.get("file_path", "")),
                function_name=payload.get("function_name"),
                source_code=str(payload.get("source_code", "")),
                start_line=int(payload.get("start_line", 1)),
                end_line=int(payload.get("end_line", 1)),
                language=str(payload.get("language", "plaintext")),
                docstring=payload.get("docstring"),
                rrf_score=scores[pid],
                dense_rank=dense_ranks.get(pid),
                sparse_rank=sparse_ranks.get(pid),
            )
            hits.append(hit)

        return hits
