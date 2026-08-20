from __future__ import annotations

import hashlib
import hmac
import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from apps.api.app.config import settings
from apps.api.app.db.session import get_db
from apps.api.app.main import app
from apps.api.app.middleware.auth import get_current_user
from apps.api.app.services.retrieval import SearchHit


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_root_endpoint(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "CodeLens API"


def test_health_endpoint(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "codelens-api"}


def test_metrics_endpoint(client: TestClient) -> None:
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "codelens_http_requests_total" in response.text


def test_webhook_hmac_verification_invalid_signature(client: TestClient) -> None:
    """Ensure webhook endpoint rejects requests with invalid HMAC signature with 403."""
    payload = {"repository": {"full_name": "test/repo"}}
    response = client.post(
        "/api/v1/webhooks/github",
        json=payload,
        headers={
            "X-Hub-Signature-256": "sha256=invalid_hash_signature",
            "X-GitHub-Event": "push",
        },
    )
    assert response.status_code == 403
    assert "Invalid HMAC signature" in response.json()["detail"]


def test_webhook_hmac_verification_valid_signature(client: TestClient) -> None:
    """Ensure webhook endpoint accepts valid HMAC signature."""
    payload = {
        "repository": {"full_name": "test/repo", "clone_url": "https://github.com/test/repo.git"},
        "commits": [{"added": ["main.py"], "modified": ["utils.py"], "removed": []}],
        "after": "abcdef123456",
    }
    raw_body = json.dumps(payload).encode("utf-8")
    secret = settings.GITHUB_WEBHOOK_SECRET.encode("utf-8")
    valid_sig = "sha256=" + hmac.new(secret, raw_body, hashlib.sha256).hexdigest()

    with patch("apps.api.app.routes.webhooks.get_db") as mock_db:
        mock_session = AsyncMock()
        mock_db.return_value = mock_session
        response = client.post(
            "/api/v1/webhooks/github",
            content=raw_body,
            headers={
                "X-Hub-Signature-256": valid_sig,
                "X-GitHub-Event": "push",
                "Content-Type": "application/json",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "queued"
        assert data["changed_files"] == 2


def test_auth_github_redirect(client: TestClient) -> None:
    """Ensure /auth/github redirects to GitHub OAuth authorize endpoint."""
    response = client.get("/auth/github", follow_redirects=False)
    assert response.status_code in (302, 307)
    assert "https://github.com/login/oauth/authorize" in response.headers["location"]


def test_protected_route_without_token(client: TestClient) -> None:
    """Protected routes without token must return 401."""
    fake_repo_id = str(uuid.uuid4())
    response = client.get(f"/api/v1/repos/{fake_repo_id}")
    assert response.status_code == 401


def test_chat_sse_stream(client: TestClient) -> None:
    """Test SSE chat streaming formatting and event generation."""
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
        with (
            patch("apps.api.app.routes.chat.HybridSearchEngine") as mock_engine_cls,
            patch("apps.api.app.routes.chat.get_provider") as mock_get_provider,
            patch("apps.api.app.routes.chat.AsyncSessionLocal"),
        ):
            mock_engine = MagicMock()
            mock_engine.search = AsyncMock(
                return_value=[
                    SearchHit(
                        chunk_id="c1",
                        file_path="src/main.py",
                        function_name="main",
                        source_code="def main(): pass",
                        start_line=1,
                        end_line=5,
                        language="python",
                        docstring="Main entrypoint",
                        rrf_score=0.03,
                    )
                ]
            )
            mock_engine_cls.return_value = mock_engine

            from packages.llm_gateway.src.providers.mock_provider import MockProvider

            mock_get_provider.return_value = MockProvider()

            response = client.post(
                f"/api/v1/repos/{fake_repo_id}/chat",
                json={"message": "explain main"},
            )
            assert response.status_code == 200
            assert "text/event-stream" in response.headers["content-type"]
            text_body = response.text
            assert "event: status" in text_body
            assert "event: citations" in text_body
            assert "event: token" in text_body
            assert "event: done" in text_body
    finally:
        app.dependency_overrides.clear()
