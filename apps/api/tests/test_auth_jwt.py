from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

try:
    import jwt
except ImportError:
    from jose import jwt  # type: ignore[no-redef]

from apps.api.app.config import settings
from apps.api.app.db.models import User
from apps.api.app.db.session import get_db
from apps.api.app.main import app
from apps.api.app.middleware.auth import decode_jwt_token
from apps.api.app.routes.auth import create_access_token


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_jwt_create_and_decode() -> None:
    user_id = str(uuid.uuid4())
    token = create_access_token(user_id)
    payload = decode_jwt_token(token)
    assert payload["sub"] == user_id
    assert "exp" in payload
    assert "iat" in payload


def test_jwt_expired_token(client: TestClient) -> None:
    user_id = str(uuid.uuid4())
    expired_time = datetime.now(UTC) - timedelta(days=1)
    payload = {"sub": user_id, "exp": expired_time}
    expired_token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

    response = client.get(
        f"/api/v1/repos/{uuid.uuid4()}",
        headers={"Authorization": f"Bearer {expired_token}"},
    )
    assert response.status_code == 401


def test_authenticated_request_with_valid_jwt(client: TestClient) -> None:
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        github_id=123456,
        github_login="octocat",
        email="octocat@github.com",
    )
    token = create_access_token(str(user_id))

    mock_db = AsyncMock()
    mock_res = MagicMock()
    mock_res.scalars.return_value.all.return_value = []
    mock_res.scalar_one_or_none.return_value = user
    mock_db.execute.return_value = mock_res

    app.dependency_overrides[get_db] = lambda: mock_db

    try:
        response = client.get(
            "/api/v1/repos",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        assert response.json() == []
    finally:
        app.dependency_overrides.clear()
