from __future__ import annotations

import asyncio
import hashlib
import json
import os
import re
import shutil
from pathlib import Path
from typing import Any

import git
import redis
from celery import chord, group  # type: ignore[import-untyped]
from celery.utils.log import get_task_logger  # type: ignore[import-untyped]
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    HnswConfigDiff,
    MatchAny,
    MatchValue,
    PayloadSchemaType,
    PointStruct,
    SparseIndexParams,
    SparseVector,
    SparseVectorParams,
    VectorParams,
)

from apps.worker.celery_app import celery_app
from packages.ast_parser.src.engine import ASTParser
from packages.llm_gateway.src.router import get_provider

logger = get_task_logger(__name__)


def _get_redis_client() -> redis.Redis | None:
    try:
        redis_url = os.environ.get("REDIS_URL", "redis://:redis_password_change_me@redis:6379/0")
        return redis.Redis.from_url(redis_url)
    except Exception:
        return None


def _publish_progress(repo_id: str, status: str, progress: int, message: str) -> None:
    try:
        r = _get_redis_client()
        if r:
            event = {
                "repo_id": repo_id,
                "status": status,
                "progress": progress,
                "message": message,
            }
            r.publish(f"repo:{repo_id}:progress", json.dumps(event))
    except Exception as exc:
        logger.debug(f"Redis publish error: {exc}")


@celery_app.task(  # type: ignore[untyped-decorator]
    name="apps.worker.tasks.indexing.clone_repository", bind=True, max_retries=3
)
def clone_repository(self: Any, repo_id: str, clone_url: str) -> str:
    """Clone a GitHub repository locally."""
    target_path = f"/tmp/codelens/{repo_id}"
    try:
        if os.path.exists(target_path):
            shutil.rmtree(target_path, ignore_errors=True)
        Path(target_path).parent.mkdir(parents=True, exist_ok=True)

        logger.info(f"Cloning {clone_url} to {target_path}")
        git.Repo.clone_from(clone_url, target_path, depth=1)
        return target_path
    except git.GitCommandError as exc:
        logger.error(f"Git error: {exc}")
        raise self.retry(exc=exc, countdown=5)
    except Exception as exc:
        logger.error(f"Failed to clone repository: {exc}")
        raise


@celery_app.task(  # type: ignore[untyped-decorator]
    name="apps.worker.tasks.indexing.embed_and_index_batch", bind=True
)
def embed_and_index_batch(self: Any, repo_id: str, chunk_dicts: list[dict[str, Any]]) -> int:
    """Embed and index a batch of code chunks."""
    return asyncio.run(_embed_and_index_async(repo_id, chunk_dicts))


async def _embed_and_index_async(repo_id: str, chunk_dicts: list[dict[str, Any]]) -> int:
    """Async helper to embed and upsert chunks to Qdrant."""
    if not chunk_dicts:
        return 0

    provider = get_provider()
    qdrant_url = os.environ.get("QDRANT_URL", "http://localhost:6333")
    qdrant_api_key = os.environ.get("QDRANT_API_KEY")
    client = AsyncQdrantClient(url=qdrant_url, api_key=qdrant_api_key)

    try:
        # Ensure collection exists and matches provider dimension
        await _ensure_collection(client, provider.embedding_dimensions)

        # Extract embedding contexts
        embedding_texts = [chunk["embedding_context"] for chunk in chunk_dicts]

        # Call embedding API
        embedding_result = await provider.embed(embedding_texts)
        vectors = embedding_result.vectors

        # Build Qdrant points with both dense and sparse vectors
        points = []
        for i, chunk in enumerate(chunk_dicts):
            # Create sparse vector (token presence)
            tokens = chunk.get("source_code", "").split()
            sparse_indices = list(range(min(len(tokens), 1000)))
            sparse_vector = SparseVector(
                indices=sparse_indices,
                values=[1.0] * len(sparse_indices),
            )

            # Generate stable positive integer ID within int64 range
            chunk_hash = hashlib.sha256(chunk["chunk_id"].encode()).hexdigest()
            point_id = int(chunk_hash[:15], 16)

            point = PointStruct(
                id=point_id,
                vector={
                    "dense": vectors[i],
                    "sparse": sparse_vector,
                },
                payload={
                    "repo_id": repo_id,
                    "chunk_id": chunk["chunk_id"],
                    "file_path": chunk["file_path"],
                    "language": chunk["language"],
                    "node_type": chunk["node_type"],
                    "function_name": chunk.get("function_name"),
                    "docstring": chunk.get("docstring"),
                    "start_line": chunk["start_line"],
                    "end_line": chunk["end_line"],
                    "source_code": chunk["source_code"],
                },
            )
            points.append(point)

        # Upsert to Qdrant
        await client.upsert(
            collection_name="code_chunks",
            points=points,
            wait=True,
        )

        logger.info(f"Upserted {len(points)} chunks to Qdrant")
        return len(points)
    finally:
        await client.close()


async def _ensure_collection(client: AsyncQdrantClient, dimensions: int) -> None:
    """Create Qdrant collection if it doesn't exist or if dimension needs updating."""
    try:
        collections = await client.get_collections()
        exists = any(c.name == "code_chunks" for c in collections.collections)
        if exists:
            # Check existing vector size
            col_info = await client.get_collection("code_chunks")
            vectors_config = col_info.config.params.vectors
            current_dim: int | None = None
            if vectors_config is not None:
                if hasattr(vectors_config, "size"):
                    current_dim = getattr(vectors_config, "size", None)
                elif isinstance(vectors_config, dict) and "dense" in vectors_config:
                    dense_cfg = vectors_config["dense"]
                    current_dim = getattr(dense_cfg, "size", None)

            if current_dim and current_dim != dimensions:
                logger.info(
                    f"Recreating collection to match dimension {dimensions} (was {current_dim})"
                )
                await client.delete_collection("code_chunks")
                exists = False
            else:
                logger.info("Collection 'code_chunks' exists with matching dimensions")
                return
    except Exception as exc:
        logger.debug(f"Collection check exception: {exc}")
        exists = False

    if not exists:
        logger.info(f"Creating collection 'code_chunks' with dimension {dimensions}")
        await client.create_collection(
            collection_name="code_chunks",
            vectors_config={
                "dense": VectorParams(
                    size=dimensions,
                    distance=Distance.COSINE,
                    hnsw_config=HnswConfigDiff(m=24, ef_construct=128),
                )
            },
            sparse_vectors_config={
                "sparse": SparseVectorParams(index=SparseIndexParams(on_disk=False))
            },
        )

        # Create index on repo_id for fast filtering
        await client.create_payload_index(
            collection_name="code_chunks",
            field_name="repo_id",
            field_schema=PayloadSchemaType.KEYWORD,
        )


@celery_app.task(name="apps.worker.tasks.indexing.build_dependency_graph")  # type: ignore[untyped-decorator]
def build_dependency_graph(results: list[int] | None, repo_id: str, clone_path: str) -> int:
    """Extract and store import dependencies."""
    edge_count = 0

    for file_path in Path(clone_path).rglob("*.py"):
        try:
            content = file_path.read_text(errors="ignore")
            for _ in re.finditer(r"^(?:from|import)\s+([^\s]+)", content, re.MULTILINE):
                edge_count += 1
        except OSError:
            pass

    logger.info(f"Extracted {edge_count} dependency edges for {repo_id}")
    msg = f"Indexing complete. {edge_count} dependency edges found."
    _publish_progress(repo_id, "complete", 100, msg)
    return edge_count


@celery_app.task(name="apps.worker.tasks.indexing.finalize_indexing")  # type: ignore[untyped-decorator]
def finalize_indexing(
    results: list[int], repo_id: str, commit_sha: str = "", total_chunks: int = 0
) -> None:
    """Finalize indexing task."""
    total = sum(results) if results else total_chunks
    logger.info(f"Finalized indexing for {repo_id}: {total} total chunks indexed")
    _publish_progress(repo_id, "complete", 100, f"Indexed {total} chunks successfully.")


@celery_app.task(  # type: ignore[untyped-decorator]
    name="apps.worker.tasks.indexing.start_indexing_pipeline", bind=True
)
def start_indexing_pipeline(self: Any, repo_id: str, clone_url: str) -> None:
    """Orchestrate the full indexing pipeline."""
    logger.info(f"Starting indexing for {repo_id}: {clone_url}")
    _publish_progress(repo_id, "cloning", 10, f"Cloning repository {clone_url}...")

    # Step 1: Clone
    clone_result = clone_repository.apply(args=[repo_id, clone_url]).get()
    logger.info(f"Repository cloned to {clone_result}")
    _publish_progress(repo_id, "parsing", 30, "Parsing AST chunks from codebase...")

    # Step 2: Parse AST and collect chunks
    parser = ASTParser()
    chunks = list(parser.parse_directory(Path(clone_result)))
    logger.info(f"Extracted {len(chunks)} code chunks")
    progress_msg = f"Extracted {len(chunks)} chunks. Embedding and indexing in Qdrant..."
    _publish_progress(repo_id, "embedding", 50, progress_msg)

    # Convert chunks to dicts for serialization
    chunk_dicts = [
        {
            "chunk_id": c.chunk_id,
            "file_path": c.file_path,
            "language": c.language,
            "node_type": c.node_type,
            "function_name": c.function_name,
            "docstring": c.docstring,
            "source_code": c.source_code,
            "start_line": c.start_line,
            "end_line": c.end_line,
            "imports": c.imports,
            "embedding_context": c.embedding_context,
        }
        for c in chunks
    ]

    # Step 3: Batch and embed
    batch_size = 100
    batches = [chunk_dicts[i : i + batch_size] for i in range(0, len(chunk_dicts), batch_size)]

    if not batches:
        logger.info("No code chunks found to index.")
        build_dependency_graph.apply_async(args=[[], repo_id, clone_result])
        return

    embed_tasks = group(embed_and_index_batch.s(repo_id, batch) for batch in batches)

    # Step 4: Build dependency graph on chord completion
    graph_task = build_dependency_graph.s(repo_id, clone_result)

    # Execute with chord pattern: wait for all embeds, then run graph
    chord(embed_tasks)(graph_task)
    logger.info(f"Indexing pipeline chord queued for {repo_id}")


@celery_app.task(  # type: ignore[untyped-decorator]
    name="apps.worker.tasks.indexing.incremental_reindex", bind=True
)
def incremental_reindex(
    self: Any,
    repo_id: str,
    changed_files: list[str],
    removed_files: list[str],
    new_sha: str = "",
) -> None:
    """Incrementally re-index changed and removed files following webhook push events."""
    logger.info(
        f"Starting incremental re-indexing for {repo_id}: "
        f"{len(changed_files)} changed, {len(removed_files)} removed"
    )
    _publish_progress(
        repo_id,
        "indexing",
        30,
        f"Processing {len(changed_files)} changed files and {len(removed_files)} deletions...",
    )
    return asyncio.run(
        _incremental_reindex_async(repo_id, changed_files, removed_files, new_sha)
    )


async def _incremental_reindex_async(
    repo_id: str,
    changed_files: list[str],
    removed_files: list[str],
    new_sha: str = "",
) -> None:
    """Async helper for incremental Qdrant vector deletion and partial AST re-embedding."""
    qdrant_url = os.environ.get("QDRANT_URL", "http://localhost:6333")
    qdrant_api_key = os.environ.get("QDRANT_API_KEY")
    client = AsyncQdrantClient(url=qdrant_url, api_key=qdrant_api_key)

    try:
        # 1. Delete points for removed files
        if removed_files:
            logger.info(
                f"Deleting Qdrant points for removed files in repo {repo_id}: {removed_files}"
            )
            await client.delete(
                collection_name="code_chunks",
                points_selector=Filter(
                    must=[
                        FieldCondition(key="file_path", match=MatchAny(any=removed_files)),
                        FieldCondition(key="repo_id", match=MatchValue(value=repo_id)),
                    ]
                ),
            )

        # 2. Delete old points for changed files, then re-parse & re-embed
        if changed_files:
            logger.info(
                f"Deleting stale points for modified files in repo {repo_id}: {changed_files}"
            )
            await client.delete(
                collection_name="code_chunks",
                points_selector=Filter(
                    must=[
                        FieldCondition(key="file_path", match=MatchAny(any=changed_files)),
                        FieldCondition(key="repo_id", match=MatchValue(value=repo_id)),
                    ]
                ),
            )

            # Re-parse changed files from local cloned repo
            clone_path = Path(f"/tmp/codelens/{repo_id}")
            parser = ASTParser()
            new_chunk_dicts = []

            for rel_path in changed_files:
                file_path = (
                    clone_path / rel_path
                    if not Path(rel_path).is_absolute()
                    else Path(rel_path)
                )
                if file_path.exists() and file_path.is_file():
                    file_chunks = parser.parse_file(file_path)
                    for c in file_chunks:
                        new_chunk_dicts.append(
                            {
                                "chunk_id": c.chunk_id,
                                "file_path": rel_path,
                                "language": c.language,
                                "node_type": c.node_type,
                                "function_name": c.function_name,
                                "docstring": c.docstring,
                                "source_code": c.source_code,
                                "start_line": c.start_line,
                                "end_line": c.end_line,
                                "imports": c.imports,
                                "embedding_context": c.embedding_context,
                            }
                        )

            if new_chunk_dicts:
                logger.info(
                    f"Embedding and upserting {len(new_chunk_dicts)} new chunks for {repo_id}"
                )
                await _embed_and_index_async(repo_id, new_chunk_dicts)

        _publish_progress(
            repo_id,
            "complete",
            100,
            f"Incremental re-indexing completed for {len(changed_files)} changed files.",
        )
    finally:
        await client.close()

