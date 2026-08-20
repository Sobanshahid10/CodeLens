from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.db.models import ASTChunk, DependencyEdge, Repository, RepositoryMember, User
from apps.api.app.db.session import get_db
from apps.api.app.middleware.auth import get_current_user

router = APIRouter(prefix="/repos", tags=["Graph"])


class GraphNode(BaseModel):
    id: str
    label: str
    language: str | None = None
    chunk_count: int = 0


class GraphLink(BaseModel):
    source: str
    target: str
    edge_type: str
    weight: int = 1


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    links: list[GraphLink]


@router.get(
    "/{repo_id}/graph", response_model=GraphResponse, summary="Get repository dependency graph"
)
async def get_repository_graph(
    repo_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Retrieve file-level dependency graph nodes and edges for D3.js visualization."""
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

    # Fetch dependency edges
    edge_stmt = select(DependencyEdge).where(DependencyEdge.repository_id == repo_id)
    edge_res = await db.execute(edge_stmt)
    edges = edge_res.scalars().all()

    # Fetch AST chunks to get file metadata and chunk counts
    chunk_stmt = select(ASTChunk.file_path, ASTChunk.language).where(
        ASTChunk.repository_id == repo_id
    )
    chunk_res = await db.execute(chunk_stmt)
    chunk_rows = chunk_res.all()

    node_dict: dict[str, dict[str, Any]] = {}
    for file_path, language in chunk_rows:
        if file_path not in node_dict:
            node_dict[file_path] = {
                "id": file_path,
                "label": file_path.split("/")[-1],
                "language": language,
                "chunk_count": 0,
            }
        node_dict[file_path]["chunk_count"] += 1

    links = []
    for edge in edges:
        # Ensure source and target nodes are represented
        if edge.source_file not in node_dict:
            node_dict[edge.source_file] = {
                "id": edge.source_file,
                "label": edge.source_file.split("/")[-1],
                "language": "python",
                "chunk_count": 1,
            }
        if edge.target_file not in node_dict:
            node_dict[edge.target_file] = {
                "id": edge.target_file,
                "label": edge.target_file.split("/")[-1],
                "language": "python",
                "chunk_count": 1,
            }
        links.append(
            {
                "source": edge.source_file,
                "target": edge.target_file,
                "edge_type": edge.edge_type,
                "weight": edge.weight,
            }
        )

    return {
        "nodes": list(node_dict.values()),
        "links": links,
    }
