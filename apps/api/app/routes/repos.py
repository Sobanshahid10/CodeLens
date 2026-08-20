from __future__ import annotations

import asyncio
import re
import uuid
from typing import Any

import redis.asyncio as aioredis
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.config import settings
from apps.api.app.db.models import Repository, RepositoryMember, User
from apps.api.app.db.session import get_db
from apps.api.app.middleware.auth import get_current_user
from apps.worker.tasks.indexing import start_indexing_pipeline

router = APIRouter(prefix="/repos", tags=["Repositories"])


class CreateRepoRequest(BaseModel):
    github_url: str
    default_branch: str = "main"


class RepoResponse(BaseModel):
    id: str
    owner_id: str
    github_url: str
    github_full_name: str
    default_branch: str
    indexing_status: str
    indexing_progress: int
    total_chunks: int
    error_message: str | None = None
    created_at: str


def _parse_github_full_name(url: str) -> str:
    """Extract owner/repo name from GitHub URL."""
    clean = url.strip().rstrip("/")
    if clean.endswith(".git"):
        clean = clean[:-4]
    match = re.search(r"github\.com[/:]([^/]+/[^/]+)", clean)
    if match:
        return match.group(1)
    parts = clean.split("/")
    if len(parts) >= 2:
        return f"{parts[-2]}/{parts[-1]}"
    return clean


@router.get("", response_model=list[RepoResponse], summary="List repositories")
async def list_repositories(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, Any]]:
    """List all repositories owned by or shared with current user."""
    # Query via repository members
    stmt = (
        select(Repository)
        .join(RepositoryMember, Repository.id == RepositoryMember.repository_id)
        .where(RepositoryMember.user_id == current_user.id)
        .order_by(Repository.created_at.desc())
    )
    result = await db.execute(stmt)
    repos = result.scalars().all()

    return [
        {
            "id": str(r.id),
            "owner_id": str(r.owner_id),
            "github_url": r.github_url,
            "github_full_name": r.github_full_name,
            "default_branch": r.default_branch,
            "indexing_status": r.indexing_status,
            "indexing_progress": r.indexing_progress,
            "total_chunks": r.total_chunks,
            "error_message": r.error_message,
            "created_at": r.created_at.isoformat() if r.created_at else "",
        }
        for r in repos
    ]


@router.post(
    "",
    response_model=RepoResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Connect repository",
)
async def create_repository(
    body: CreateRepoRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Connect a GitHub repository and queue the indexing pipeline."""
    full_name = _parse_github_full_name(body.github_url)

    # Check if already exists for user
    stmt = (
        select(Repository)
        .join(RepositoryMember, Repository.id == RepositoryMember.repository_id)
        .where(
            RepositoryMember.user_id == current_user.id,
            Repository.github_full_name == full_name,
        )
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing:
        return {
            "id": str(existing.id),
            "owner_id": str(existing.owner_id),
            "github_url": existing.github_url,
            "github_full_name": existing.github_full_name,
            "default_branch": existing.default_branch,
            "indexing_status": existing.indexing_status,
            "indexing_progress": existing.indexing_progress,
            "total_chunks": existing.total_chunks,
            "error_message": existing.error_message,
            "created_at": existing.created_at.isoformat() if existing.created_at else "",
        }

    repo_id = uuid.uuid4()
    repo = Repository(
        id=repo_id,
        owner_id=current_user.id,
        github_url=body.github_url,
        github_full_name=full_name,
        default_branch=body.default_branch,
        indexing_status="pending",
        indexing_progress=0,
        total_chunks=0,
    )
    db.add(repo)
    await db.flush()

    member = RepositoryMember(
        repository_id=repo.id,
        user_id=current_user.id,
        role="owner",
    )
    db.add(member)
    await db.commit()
    await db.refresh(repo)

    # Dispatch Celery background indexing task
    try:
        start_indexing_pipeline.delay(str(repo.id), repo.github_url)
    except Exception as exc:
        import structlog

        structlog.get_logger("codelens.repos").warning("celery_dispatch_skipped", error=str(exc))

    return {
        "id": str(repo.id or repo_id),
        "owner_id": str(repo.owner_id),
        "github_url": repo.github_url,
        "github_full_name": repo.github_full_name,
        "default_branch": repo.default_branch,
        "indexing_status": repo.indexing_status,
        "indexing_progress": repo.indexing_progress or 0,
        "total_chunks": repo.total_chunks or 0,
        "error_message": repo.error_message,
        "created_at": repo.created_at.isoformat() if repo.created_at else "",
    }


@router.get("/{repo_id}", response_model=RepoResponse, summary="Get repository details")
async def get_repository(
    repo_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve repository status, progress, and metadata."""
    stmt = (
        select(Repository)
        .join(RepositoryMember, Repository.id == RepositoryMember.repository_id)
        .where(Repository.id == repo_id, RepositoryMember.user_id == current_user.id)
    )
    result = await db.execute(stmt)
    repo = result.scalar_one_or_none()

    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found or access denied",
        )

    return {
        "id": str(repo.id),
        "owner_id": str(repo.owner_id),
        "github_url": repo.github_url,
        "github_full_name": repo.github_full_name,
        "default_branch": repo.default_branch,
        "indexing_status": repo.indexing_status,
        "indexing_progress": repo.indexing_progress,
        "total_chunks": repo.total_chunks,
        "error_message": repo.error_message,
        "created_at": repo.created_at.isoformat() if repo.created_at else "",
    }


@router.delete("/{repo_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete repository")
async def delete_repository(
    repo_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a repository and all associated chunks."""
    stmt = select(Repository).where(
        Repository.id == repo_id, Repository.owner_id == current_user.id
    )
    result = await db.execute(stmt)
    repo = result.scalar_one_or_none()

    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found or permission denied",
        )

    await db.delete(repo)
    await db.commit()


@router.websocket("/{repo_id}/progress")
async def websocket_progress(
    websocket: WebSocket,
    repo_id: str,
) -> None:
    """Stream live indexing progress events from Redis PubSub to WebSocket client."""
    await websocket.accept()

    redis_client = None
    pubsub = None
    try:
        redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)  # type: ignore[no-untyped-call]
        pubsub = redis_client.pubsub()
        channel = f"repo:{repo_id}:progress"
        await pubsub.subscribe(channel)

        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message and message.get("data"):
                data = message["data"]
                await websocket.send_text(data)
            await asyncio.sleep(0.1)
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        import structlog

        structlog.get_logger("codelens.ws").debug("ws_stream_closed", error=str(exc))
        try:
            await websocket.send_json({"error": str(exc)})
        except Exception:
            structlog.get_logger("codelens.ws").debug("ws_send_failed")
    finally:
        if pubsub:
            await pubsub.unsubscribe()
            await pubsub.close()
        if redis_client:
            await redis_client.aclose()
