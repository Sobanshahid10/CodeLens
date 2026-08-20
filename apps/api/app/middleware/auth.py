from __future__ import annotations

import uuid
from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.middleware.base import BaseHTTPMiddleware

try:
    import jwt
    from jwt.exceptions import PyJWTError as JWTError
except ImportError:
    from jose import JWTError, jwt  # type: ignore[assignment,no-redef]

from apps.api.app.config import settings
from apps.api.app.db.models import User
from apps.api.app.db.session import get_db

PUBLIC_PATHS = {
    "/",
    "/health",
    "/metrics",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/api/docs",
}

PUBLIC_PREFIXES = (
    "/auth",
    "/api/v1/webhooks",
    "/docs",
    "/redoc",
    "/openapi.json",
)


def decode_jwt_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT access token."""
    return jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=[settings.JWT_ALGORITHM],
    )


class JWTMiddleware(BaseHTTPMiddleware):
    """Extract and validate Bearer JWT from Authorization header."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request.state.user_id = None

        # Extract Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.removeprefix("Bearer ").strip()
            try:
                payload = decode_jwt_token(token)
                request.state.user_id = payload.get("sub")
            except (JWTError, Exception):
                request.state.user_id = None

        response = await call_next(request)
        return response


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    """FastAPI dependency for authenticating user and injecting PostgreSQL RLS session variable."""
    user_id_str = getattr(request.state, "user_id", None)

    # Fallback to direct header extraction if middleware was bypassed
    if not user_id_str:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.removeprefix("Bearer ").strip()
            try:
                payload = decode_jwt_token(token)
                user_id_str = payload.get("sub")
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication token",
                    headers={"WWW-Authenticate": "Bearer"},
                ) from exc

    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_uuid = uuid.UUID(str(user_id_str))
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user identifier in token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    # Set PostgreSQL session variable for Row-Level Security (RLS)
    try:
        await db.execute(text(f"SET LOCAL app.current_user_id = '{user_uuid}'"))
    except Exception as exc:
        import structlog

        structlog.get_logger("codelens.auth").debug("rls_session_variable_skipped", error=str(exc))

    # Retrieve user from database
    stmt = select(User).where(User.id == user_uuid)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user
