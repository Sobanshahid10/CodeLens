from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.db.models import Repository, RepositoryMember, User
from apps.api.app.db.session import get_db
from apps.api.app.middleware.auth import get_current_user
from apps.api.app.services.retrieval import HybridSearchEngine, SearchHit

router = APIRouter(prefix="/repos", tags=["Search"])


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Natural language or code query")
    top_k: int = Field(5, ge=1, le=50, description="Maximum number of hits to return")
    language: str | None = Field(None, description="Filter by programming language")


class SearchHitResponse(BaseModel):
    chunk_id: str
    file_path: str
    function_name: str | None = None
    source_code: str
    start_line: int
    end_line: int
    language: str
    docstring: str | None = None
    rrf_score: float
    dense_rank: int | None = None
    sparse_rank: int | None = None


@router.post(
    "/{repo_id}/search",
    response_model=list[SearchHitResponse],
    summary="Perform hybrid code search",
)
async def search_code(
    repo_id: uuid.UUID,
    body: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[SearchHit]:
    """Execute hybrid search using dense vector embedding + sparse BM25 fusion (RRF)."""
    # Verify repository access
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

    engine = HybridSearchEngine()
    hits = await engine.search(
        query=body.query,
        repo_id=str(repo_id),
        top_k=body.top_k,
        language_filter=body.language,
    )
    return hits
