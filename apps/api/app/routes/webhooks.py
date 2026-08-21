from __future__ import annotations

import hashlib
import hmac
import json
import uuid
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.config import settings
from apps.api.app.db.models import Repository, WebhookEvent
from apps.api.app.db.session import get_db

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/github", summary="GitHub Webhook Handler with HMAC-SHA256 Verification")
async def github_webhook_handler(
    request: Request,
    db: AsyncSession = Depends(get_db),
    x_hub_signature_256: str | None = Header(None, alias="X-Hub-Signature-256"),
    x_github_event: str | None = Header(None, alias="X-GitHub-Event"),
    x_github_delivery: str | None = Header(None, alias="X-GitHub-Delivery"),
) -> dict[str, Any]:
    """Verify GitHub webhook HMAC signature, store audit event, and queue re-indexing."""
    raw_body = await request.body()

    # 1. Verify HMAC-SHA256 signature
    if not x_hub_signature_256:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Missing X-Hub-Signature-256 header",
        )

    secret = settings.GITHUB_WEBHOOK_SECRET.encode("utf-8")
    expected_sig = "sha256=" + hmac.new(secret, raw_body, hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected_sig, x_hub_signature_256):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid HMAC signature",
        )

    # 2. Check event type
    if x_github_event != "push":
        return {"status": "ignored", "event": x_github_event}

    # 3. Parse JSON payload
    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed JSON payload: {exc}",
        ) from exc

    repo_full_name = payload.get("repository", {}).get("full_name")
    delivery_id = x_github_delivery or str(uuid.uuid4())
    after_sha = payload.get("after", "")

    # 4. Collect changed and removed files across commits
    changed_files: set[str] = set()
    removed_files: set[str] = set()
    for commit in payload.get("commits", []):
        changed_files.update(commit.get("added", []))
        changed_files.update(commit.get("modified", []))
        removed_files.update(commit.get("removed", []))

    # 5. Look up repository by full name
    repo_id: uuid.UUID | None = None
    if repo_full_name:
        stmt = select(Repository).where(Repository.github_full_name == repo_full_name)
        result = await db.execute(stmt)
        repo = result.scalar_one_or_none()
        if repo:
            repo_id = repo.id
            if after_sha:
                repo.last_indexed_sha = after_sha
                repo.indexing_status = "indexing"

    # 6. Insert WebhookEvent audit record
    webhook_event = WebhookEvent(
        repository_id=repo_id,
        event_type="push",
        delivery_id=delivery_id,
        payload=payload,
        processed=True,
    )
    db.add(webhook_event)
    await db.commit()

    # 7. Dispatch incremental indexing task if repo found
    if repo_id:
        try:
            from apps.worker.tasks.indexing import incremental_reindex, start_indexing_pipeline

            if changed_files or removed_files:
                incremental_reindex.delay(
                    str(repo_id),
                    list(changed_files),
                    list(removed_files),
                    after_sha,
                )
            else:
                start_indexing_pipeline.delay(str(repo_id), payload["repository"]["clone_url"])
        except Exception as exc:
            import structlog

            structlog.get_logger("codelens.webhooks").warning(
                "webhook_dispatch_failed", error=str(exc)
            )

    return {
        "status": "queued",
        "repository": repo_full_name,
        "changed_files": len(changed_files),
        "removed_files": len(removed_files),
    }
