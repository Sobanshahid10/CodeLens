from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from apps.worker.tasks.indexing import (
    _embed_and_index_async,
    build_dependency_graph,
)
from packages.llm_gateway.src.providers.base import EmbeddingResult


@pytest.fixture
def mock_provider() -> MagicMock:
    provider = MagicMock()
    provider.embedding_dimensions = 768
    provider.embedding_model_name = "test-embed"
    provider.embed = AsyncMock(
        return_value=EmbeddingResult(
            vectors=[[0.1] * 768],
            model="test-embed",
            total_tokens=10,
        )
    )
    return provider


@pytest.mark.asyncio
async def test_embed_and_index_async_mock(mock_provider: MagicMock) -> None:
    chunk_dicts = [
        {
            "chunk_id": "test_chunk_123",
            "file_path": "test.py",
            "language": "python",
            "node_type": "function_definition",
            "function_name": "test_fn",
            "docstring": "A test docstring",
            "source_code": "def test_fn(): pass",
            "start_line": 1,
            "end_line": 1,
            "imports": ["import os"],
            "embedding_context": "File: test.py\nLanguage: python\ndef test_fn(): pass",
        }
    ]

    with patch("apps.worker.tasks.indexing.get_provider", return_value=mock_provider):
        with patch("apps.worker.tasks.indexing.AsyncQdrantClient") as mock_client_cls:
            mock_client_instance = AsyncMock()
            mock_client_instance.get_collections.return_value = MagicMock(collections=[])
            mock_client_instance.upsert.return_value = None
            mock_client_cls.return_value = mock_client_instance

            count = await _embed_and_index_async("repo_123", chunk_dicts)
            assert count == 1
            mock_client_instance.upsert.assert_called_once()


def test_build_dependency_graph(tmp_path: Path) -> None:
    py_file = tmp_path / "app.py"
    py_file.write_text("import os\nfrom pathlib import Path\nimport requests\n")
    edge_count = build_dependency_graph(None, "repo_test", str(tmp_path))
    assert edge_count == 3
