from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from apps.api.app.db.session import get_db
from apps.api.app.main import app
from apps.api.app.middleware.auth import get_current_user
from apps.api.app.services.retrieval import SearchHit


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_search_endpoint_success(client: TestClient) -> None:
    fake_repo_id = uuid.uuid4()
    fake_user = AsyncMock()
    fake_user.id = uuid.uuid4()

    fake_repo = MagicMock()
    fake_repo.id = fake_repo_id

    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = fake_repo
    mock_db.execute.return_value = mock_res

    app.dependency_overrides[get_current_user] = lambda: fake_user
    app.dependency_overrides[get_db] = lambda: mock_db

    try:
        with patch("apps.api.app.routes.search.HybridSearchEngine") as mock_engine_cls:
            mock_engine = MagicMock()
            mock_engine.search = AsyncMock(
                return_value=[
                    SearchHit(
                        chunk_id="chunk-1",
                        file_path="app/retry.py",
                        function_name="retry_with_backoff",
                        source_code="def retry_with_backoff(): pass",
                        start_line=10,
                        end_line=25,
                        language="python",
                        docstring="Exponential backoff helper",
                        rrf_score=0.032,
                        dense_rank=1,
                        sparse_rank=2,
                    )
                ]
            )
            mock_engine_cls.return_value = mock_engine

            response = client.post(
                f"/api/v1/repos/{fake_repo_id}/search",
                json={"query": "where is retry logic", "top_k": 5, "language": "python"},
            )
            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 1
            assert data[0]["chunk_id"] == "chunk-1"
            assert data[0]["function_name"] == "retry_with_backoff"
            assert data[0]["file_path"] == "app/retry.py"
            assert data[0]["start_line"] == 10
            assert data[0]["end_line"] == 25
            assert data[0]["rrf_score"] == 0.032
    finally:
        app.dependency_overrides.clear()


def test_search_endpoint_repo_not_found(client: TestClient) -> None:
    fake_repo_id = uuid.uuid4()
    fake_user = AsyncMock()
    fake_user.id = uuid.uuid4()

    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = mock_res

    app.dependency_overrides[get_current_user] = lambda: fake_user
    app.dependency_overrides[get_db] = lambda: mock_db

    try:
        response = client.post(
            f"/api/v1/repos/{fake_repo_id}/search",
            json={"query": "something", "top_k": 5},
        )
        assert response.status_code == 404
        assert "Repository not found" in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()
