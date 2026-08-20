from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from apps.api.app.db.models import Repository, User
from apps.api.app.db.session import get_db
from apps.api.app.main import app
from apps.api.app.middleware.auth import get_current_user


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_github_oauth_callback(client: TestClient) -> None:
    """Test OAuth code exchange and user upsert."""
    fake_user_id = uuid.uuid4()
    mock_user = User(
        id=fake_user_id,
        github_id=99999,
        github_login="testcoder",
        email="testcoder@example.com",
    )

    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = mock_user
    mock_db.execute.return_value = mock_res
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    app.dependency_overrides[get_db] = lambda: mock_db

    try:
        with patch("httpx.AsyncClient.post") as mock_post, \
             patch("httpx.AsyncClient.get") as mock_get:

            mock_token_resp = MagicMock()
            mock_token_resp.status_code = 200
            mock_token_resp.json.return_value = {"access_token": "gho_mocktoken123"}
            mock_post.return_value = mock_token_resp

            mock_user_resp = MagicMock()
            mock_user_resp.status_code = 200
            mock_user_resp.json.return_value = {
                "id": 99999,
                "login": "testcoder",
                "email": "testcoder@example.com",
                "avatar_url": "https://avatars.githubusercontent.com/u/99999",
            }
            mock_get.return_value = mock_user_resp

            response = client.get("/auth/github/callback?code=mock_oauth_code")
            assert response.status_code == 200
            data = response.json()
            assert "access_token" in data
            assert data["token_type"] == "bearer"
            assert data["user"]["github_login"] == "testcoder"
    finally:
        app.dependency_overrides.clear()


def test_repository_crud_lifecycle(client: TestClient) -> None:
    """Test repo creation, listing, retrieval, and deletion."""
    fake_user_id = uuid.uuid4()
    fake_user = User(
        id=fake_user_id,
        github_id=123,
        github_login="testowner",
    )
    fake_repo_id = uuid.uuid4()
    fake_repo = Repository(
        id=fake_repo_id,
        owner_id=fake_user_id,
        github_url="https://github.com/testowner/myrepo.git",
        github_full_name="testowner/myrepo",
        default_branch="main",
        indexing_status="pending",
        indexing_progress=0,
        total_chunks=0,
    )

    mock_db = AsyncMock()
    mock_res_empty = MagicMock()
    mock_res_empty.scalar_one_or_none.return_value = None

    mock_res_repo = MagicMock()
    mock_res_repo.scalar_one_or_none.return_value = fake_repo
    mock_res_repo.scalars.return_value.all.return_value = [fake_repo]

    mock_db.execute.side_effect = [
        mock_res_empty,  # create check
        mock_res_repo,   # list
        mock_res_repo,   # get
        mock_res_repo,   # delete check
    ]
    mock_db.commit = AsyncMock()
    mock_db.flush = AsyncMock()
    mock_db.refresh = AsyncMock()
    mock_db.delete = AsyncMock()

    app.dependency_overrides[get_current_user] = lambda: fake_user
    app.dependency_overrides[get_db] = lambda: mock_db

    try:
        with patch("apps.worker.tasks.indexing.start_indexing_pipeline.delay"):
            # 1. Create repo
            create_resp = client.post(
                "/api/v1/repos",
                json={"github_url": "https://github.com/testowner/myrepo.git"},
            )
            assert create_resp.status_code == 201

            # 2. List repos
            list_resp = client.get("/api/v1/repos")
            assert list_resp.status_code == 200
            assert len(list_resp.json()) == 1

            # 3. Get repo
            get_resp = client.get(f"/api/v1/repos/{fake_repo_id}")
            assert get_resp.status_code == 200
            assert get_resp.json()["id"] == str(fake_repo_id)

            # 4. Delete repo
            del_resp = client.delete(f"/api/v1/repos/{fake_repo_id}")
            assert del_resp.status_code == 204
    finally:
        app.dependency_overrides.clear()
