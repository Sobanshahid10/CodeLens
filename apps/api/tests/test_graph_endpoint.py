from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from apps.api.app.db.models import DependencyEdge
from apps.api.app.db.session import get_db
from apps.api.app.main import app
from apps.api.app.middleware.auth import get_current_user


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_graph_endpoint(client: TestClient) -> None:
    fake_repo_id = uuid.uuid4()
    fake_user = AsyncMock()
    fake_user.id = uuid.uuid4()

    fake_repo = MagicMock()
    fake_repo.id = fake_repo_id

    mock_edge = DependencyEdge(
        id=uuid.uuid4(),
        repository_id=fake_repo_id,
        source_file="app/main.py",
        target_file="app/config.py",
        edge_type="import",
        weight=1,
    )

    mock_db = AsyncMock()

    # 1. repo check response
    mock_res_repo = MagicMock()
    mock_res_repo.scalar_one_or_none.return_value = fake_repo

    # 2. edge query response
    mock_res_edges = MagicMock()
    mock_res_edges.scalars.return_value.all.return_value = [mock_edge]

    # 3. chunks query response
    mock_res_chunks = MagicMock()
    mock_res_chunks.all.return_value = [("app/main.py", "python"), ("app/config.py", "python")]

    mock_db.execute.side_effect = [mock_res_repo, mock_res_edges, mock_res_chunks]

    app.dependency_overrides[get_current_user] = lambda: fake_user
    app.dependency_overrides[get_db] = lambda: mock_db

    try:
        response = client.get(f"/api/v1/repos/{fake_repo_id}/graph")
        assert response.status_code == 200
        data = response.json()
        assert "nodes" in data
        assert "links" in data
        assert len(data["nodes"]) >= 2
        assert len(data["links"]) == 1
        assert data["links"][0]["source"] == "app/main.py"
        assert data["links"][0]["target"] == "app/config.py"
    finally:
        app.dependency_overrides.clear()
