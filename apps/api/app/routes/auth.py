from __future__ import annotations

import urllib.parse
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

try:
    import jwt
except ImportError:
    from jose import jwt  # type: ignore[no-redef]

from apps.api.app.config import settings
from apps.api.app.db.models import User
from apps.api.app.db.session import get_db

router = APIRouter(prefix="/auth", tags=["Authentication"])


def create_access_token(user_id: str) -> str:
    """Create a signed JWT access token."""
    expire = datetime.now(UTC) + timedelta(days=settings.JWT_EXPIRE_DAYS)
    payload = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.now(UTC),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


@router.get("/github", summary="Redirect to GitHub OAuth login")
async def github_login() -> RedirectResponse:
    """Redirect client to GitHub OAuth authorize screen."""
    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": settings.GITHUB_REDIRECT_URI,
        "scope": "repo,user:email",
    }
    url = f"https://github.com/login/oauth/authorize?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=url)


@router.get("/github/callback", summary="GitHub OAuth callback")
async def github_callback(
    code: str = Query(..., description="GitHub OAuth authorization code"),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Exchange OAuth code for GitHub token, upsert user, and return JWT."""
    token_url = "https://github.com/login/oauth/access_token"
    token_data = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "client_secret": settings.GITHUB_CLIENT_SECRET,
        "code": code,
        "redirect_uri": settings.GITHUB_REDIRECT_URI,
    }
    headers = {"Accept": "application/json"}

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Exchange code for access token
        token_resp = await client.post(token_url, json=token_data, headers=headers)
        if token_resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to retrieve access token from GitHub",
            )
        token_json = token_resp.json()
        gh_access_token = token_json.get("access_token")
        if not gh_access_token:
            err = token_json.get("error_description", "No access token")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"GitHub OAuth error: {err}",
            )

        # 2. Fetch user profile from GitHub API
        user_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {gh_access_token}"},
        )
        if user_resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch user profile from GitHub",
            )
        gh_user = user_resp.json()

    github_id = gh_user["id"]
    github_login_name = gh_user["login"]
    email = gh_user.get("email")
    avatar_url = gh_user.get("avatar_url")

    # 3. Upsert User in database
    stmt = select(User).where(User.github_id == github_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            github_id=github_id,
            github_login=github_login_name,
            email=email,
            avatar_url=avatar_url,
        )
        db.add(user)
    else:
        user.github_login = github_login_name
        if email:
            user.email = email
        if avatar_url:
            user.avatar_url = avatar_url

    await db.commit()
    await db.refresh(user)

    # 4. Issue JWT access token
    token = create_access_token(str(user.id))

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "github_id": user.github_id,
            "github_login": user.github_login,
            "email": user.email,
            "avatar_url": user.avatar_url,
            "plan": user.plan,
        },
    }


@router.post("/demo", summary="Demo user login for local evaluation")
@router.get("/demo", summary="Demo user login for local evaluation")
async def demo_login(
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Create or get a demo user, and issue a valid JWT token for testing."""
    stmt = select(User).where(User.github_login.in_(["demo-developer", "Muhammad Soban"]))
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        user = User(
            github_id=99999999,
            github_login="Muhammad Soban",
            email="sobanshahid25@gmail.com",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
            plan="pro",
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        user.github_login = "Muhammad Soban"
        user.email = "sobanshahid25@gmail.com"
        await db.commit()
        await db.refresh(user)

    token = create_access_token(str(user.id))

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "github_id": user.github_id,
            "github_login": user.github_login,
            "email": user.email,
            "avatar_url": user.avatar_url,
            "plan": user.plan,
        },
    }

