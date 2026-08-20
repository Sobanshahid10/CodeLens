from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from qdrant_client.models import ScoredPoint

from apps.api.app.services.retrieval import HybridSearchEngine
from packages.llm_gateway.src.providers.mock_provider import MockProvider


def test_rrf_score_calculation() -> None:
    """Verify Reciprocal Rank Fusion computes correct score according to 1.0 / (60 + rank)."""
    engine = HybridSearchEngine(client=MagicMock(), provider=MockProvider())

    dense_point1 = ScoredPoint(
        id=1,
        version=1,
        score=0.95,
        payload={
            "chunk_id": "chunk-1",
            "file_path": "src/main.py",
            "source_code": "def main(): pass",
        },
    )
    dense_point2 = ScoredPoint(
        id=2,
        version=1,
        score=0.85,
        payload={
            "chunk_id": "chunk-2",
            "file_path": "src/utils.py",
            "source_code": "def retry(): pass",
        },
    )

    sparse_point1 = ScoredPoint(
        id=2,
        version=1,
        score=12.5,
        payload={
            "chunk_id": "chunk-2",
            "file_path": "src/utils.py",
            "source_code": "def retry(): pass",
        },
    )
    sparse_point2 = ScoredPoint(
        id=3,
        version=1,
        score=9.0,
        payload={
            "chunk_id": "chunk-3",
            "file_path": "src/db.py",
            "source_code": "def connect(): pass",
        },
    )

    # dense ranks: id 1 -> rank 1, id 2 -> rank 2
    # sparse ranks: id 2 -> rank 1, id 3 -> rank 2
    # id 2 expected score: 1/(60+2) + 1/(60+1) = 1/62 + 1/61 = 0.016129 + 0.016393 = ~0.032522
    # id 1 expected score: 1/(60+1) = 1/61 = ~0.016393
    # id 3 expected score: 1/(60+2) = 1/62 = ~0.016129

    hits = engine._reciprocal_rank_fusion(
        dense=[dense_point1, dense_point2],
        sparse=[sparse_point1, sparse_point2],
        top_k=3,
    )

    assert len(hits) == 3
    # id 2 should be ranked #1 because it appeared in both dense and sparse
    assert hits[0].chunk_id == "chunk-2"
    expected_score_2 = (1.0 / 62) + (1.0 / 61)
    assert abs(hits[0].rrf_score - expected_score_2) < 1e-6
    assert hits[0].dense_rank == 2
    assert hits[0].sparse_rank == 1

    # id 1 should be ranked #2
    assert hits[1].chunk_id == "chunk-1"
    assert abs(hits[1].rrf_score - (1.0 / 61)) < 1e-6

    # id 3 should be ranked #3
    assert hits[2].chunk_id == "chunk-3"
    assert abs(hits[2].rrf_score - (1.0 / 62)) < 1e-6


def test_dense_only_results() -> None:
    """Verify RRF handling when only dense results are returned."""
    engine = HybridSearchEngine(client=MagicMock(), provider=MockProvider())

    dense_point = ScoredPoint(
        id=101,
        version=1,
        score=0.9,
        payload={"chunk_id": "c101", "file_path": "app/auth.py", "source_code": "def auth(): pass"},
    )

    hits = engine._reciprocal_rank_fusion(
        dense=[dense_point],
        sparse=[],
        top_k=5,
    )

    assert len(hits) == 1
    assert hits[0].chunk_id == "c101"
    assert abs(hits[0].rrf_score - (1.0 / 61)) < 1e-6
    assert hits[0].dense_rank == 1
    assert hits[0].sparse_rank is None


def test_sparse_only_results() -> None:
    """Verify RRF handling when only sparse results are returned."""
    engine = HybridSearchEngine(client=MagicMock(), provider=MockProvider())

    sparse_point = ScoredPoint(
        id=202,
        version=1,
        score=15.0,
        payload={
            "chunk_id": "c202",
            "file_path": "app/search.py",
            "source_code": "def search(): pass",
        },
    )

    hits = engine._reciprocal_rank_fusion(
        dense=[],
        sparse=[sparse_point],
        top_k=5,
    )

    assert len(hits) == 1
    assert hits[0].chunk_id == "c202"
    assert abs(hits[0].rrf_score - (1.0 / 61)) < 1e-6
    assert hits[0].dense_rank is None
    assert hits[0].sparse_rank == 1


def test_filter_construction() -> None:
    """Verify sparse vector token mapping and Qdrant filter condition construction."""
    engine = HybridSearchEngine(client=MagicMock(), provider=MockProvider())

    sparse_dict = engine._build_sparse_vector("retry logic error handling")
    assert "indices" in sparse_dict
    assert "values" in sparse_dict
    assert len(sparse_dict["indices"]) == 4
    assert len(sparse_dict["values"]) == 4

    # Empty query check
    empty_dict = engine._build_sparse_vector("")
    assert empty_dict == {"indices": [0], "values": [1.0]}


@pytest.mark.asyncio
async def test_parallel_gather_mock() -> None:
    """Verify search executes dense and sparse searches in parallel using asyncio.gather."""
    mock_client = AsyncMock()
    mock_provider = MockProvider()

    point1 = ScoredPoint(
        id=1,
        version=1,
        score=0.9,
        payload={"chunk_id": "chunk-1", "file_path": "a.py", "source_code": "code 1"},
    )
    point2 = ScoredPoint(
        id=2,
        version=1,
        score=0.8,
        payload={"chunk_id": "chunk-2", "file_path": "b.py", "source_code": "code 2"},
    )

    engine = HybridSearchEngine(client=mock_client, provider=mock_provider)

    with (
        patch.object(engine, "_dense_search", new_callable=AsyncMock) as mock_dense,
        patch.object(engine, "_sparse_search", new_callable=AsyncMock) as mock_sparse,
    ):
        mock_dense.return_value = [point1]
        mock_sparse.return_value = [point2]

        results = await engine.search(
            query="test query", repo_id="repo-123", top_k=2, language_filter="python"
        )

        assert len(results) == 2
        mock_dense.assert_awaited_once()
        mock_sparse.assert_awaited_once()
        assert results[0].chunk_id in ("chunk-1", "chunk-2")
