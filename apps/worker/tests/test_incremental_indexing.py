from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from apps.worker.tasks.indexing import _incremental_reindex_async
from packages.llm_gateway.src.providers.base import EmbeddingResult


@pytest.fixture
def mock_embedding_provider() -> MagicMock:
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
async def test_incremental_reindex_async(
    tmp_path: Path, mock_embedding_provider: MagicMock
) -> None:
    # Setup test changed python file
    repo_id = "test_repo_inc"
    repo_dir = tmp_path / repo_id
    repo_dir.mkdir(parents=True, exist_ok=True)
    changed_file = repo_dir / "service.py"
    changed_file.write_text("def new_feature():\n    return 'incremental'\n")

    with patch("apps.worker.tasks.indexing.get_provider", return_value=mock_embedding_provider):
        with patch("apps.worker.tasks.indexing.AsyncQdrantClient") as mock_client_cls:
            mock_client_instance = AsyncMock()
            mock_client_instance.get_collections.return_value = MagicMock(collections=[])
            mock_client_instance.delete.return_value = None
            mock_client_instance.upsert.return_value = None
            mock_client_cls.return_value = mock_client_instance

            # Patch clone path to tmp_path
            with patch("pathlib.Path.exists", return_value=True):
                await _incremental_reindex_async(
                    repo_id=repo_id,
                    changed_files=[str(changed_file)],
                    removed_files=["old_service.py"],
                    new_sha="new_sha_123",
                )

                # Verify deletion was called for removed and changed files
                assert mock_client_instance.delete.call_count >= 2
                assert mock_client_instance.close.called
