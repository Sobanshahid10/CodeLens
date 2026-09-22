from __future__ import annotations

import json
import time
import uuid
from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.app.db.models import ChatMessage, ChatSession, Repository, RepositoryMember, User
from apps.api.app.db.session import AsyncSessionLocal, get_db
from apps.api.app.middleware.auth import get_current_user
from apps.api.app.middleware.metrics import LLM_REQUEST_LATENCY, LLM_TOKENS_TOTAL
from apps.api.app.services.retrieval import HybridSearchEngine
from packages.llm_gateway.src.router import get_provider

router = APIRouter(prefix="/repos", tags=["Chat"])


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User question or prompt")
    session_id: uuid.UUID | None = Field(None, description="Existing chat session ID")


def _sse_event(event_type: str, data: object) -> str:
    """Format SSE event string according to SSE standard."""
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"


@router.post("/{repo_id}/chat", summary="Stream SSE RAG chat response with citations")
async def chat_stream_endpoint(
    repo_id: uuid.UUID,
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Generate token-streamed RAG response backed by hybrid code retrieval with exact citations."""
    # 1. Verify access to repository
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

    # 2. Get or create ChatSession
    session_id = body.session_id
    if session_id:
        sess_stmt = select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id,
            ChatSession.repository_id == repo_id,
        )
        sess_res = await db.execute(sess_stmt)
        chat_session = sess_res.scalar_one_or_none()
        if not chat_session:
            chat_session = ChatSession(
                id=session_id,
                repository_id=repo_id,
                user_id=current_user.id,
                title=body.message[:50],
            )
            db.add(chat_session)
            await db.commit()
    else:
        chat_session = ChatSession(
            repository_id=repo_id,
            user_id=current_user.id,
            title=body.message[:50],
        )
        db.add(chat_session)
        await db.commit()
        await db.refresh(chat_session)
        session_id = chat_session.id

    async def event_stream() -> AsyncIterator[str]:
        start_time = time.perf_counter()
        provider = get_provider()

        # Step 1: Emit status event
        yield _sse_event(
            "status",
            {"stage": "searching", "message": "Finding relevant code..."},
        )

        # Step 2: Retrieve relevant code chunks
        search_engine = HybridSearchEngine(provider=provider)
        try:
            hits = await search_engine.search(
                query=body.message,
                repo_id=str(repo_id),
                top_k=10,
            )
        except Exception:
            hits = []

        # Step 3: Emit citations event
        citations: list[dict[str, Any]] = [
            {
                "file_path": hit.file_path,
                "start_line": hit.start_line,
                "end_line": hit.end_line,
                "function_name": hit.function_name or "",
                "snippet": hit.source_code[:300],
            }
            for hit in hits
        ]
        yield _sse_event("citations", citations)

        # Build context prompt with retrieved citations
        context_blocks = []
        for i, hit in enumerate(hits, start=1):
            func_name = hit.function_name or "module"
            loc = f"{hit.file_path}:{hit.start_line}-{hit.end_line}"
            header = f"--- Citation [{i}] {loc} ({func_name}) ---"
            context_blocks.append(f"{header}\n{hit.source_code}\n")
        context_text = (
            "\n".join(context_blocks)
            if context_blocks
            else "No direct matching code found in vector store."
        )

        system_prompt = (
            "You are CodeLens AI, an expert codebase intelligence engine.\n"
            "RESPONSE GUIDELINES:\n"
            "1. Deliver a COMPLETE and ACCURATE technical explanation"
            " that gives full understanding.\n"
            "2. Structure your answer cleanly:\n"
            "   - **Overview**: 1-2 sentences explaining the core"
            " architecture and direct answer.\n"
            "   - **Key Mechanisms**: 3-4 structured bullet points"
            " explaining the concrete data flow, logic, algorithms,"
            " or configurations.\n"
            "3. Always cite exact file paths and line ranges"
            " (e.g. `apps/api/app/services/retrieval.py:L15-L42`).\n"
            "4. Avoid unnecessary fluff, chit-chat, ASCII diagrams,"
            " or repetitive text. Keep the tone authoritative,"
            " technical, and clear (~130-180 words)."
        )

        messages = [
            {
                "role": "user",
                "content": (
                    f"Codebase Context:\n{context_text}\n\n"
                    f"User Question: {body.message}\n\n"
                    "Provide a clear, complete technical explanation"
                    " with an overview, key mechanisms with exact"
                    " line citations, and balanced detail."
                ),
            }
        ]

        # Step 4: Stream tokens
        accumulated_text = []
        llm_start_time = time.perf_counter()
        try:
            async for chunk in provider.chat_stream(
                messages=messages,
                system_prompt=system_prompt,
            ):
                if chunk.delta:
                    accumulated_text.append(chunk.delta)
                    yield _sse_event("token", {"text": chunk.delta})
        except Exception as exc:
            err_msg = f" Error streaming completion: {exc}"
            accumulated_text.append(err_msg)
            yield _sse_event("token", {"text": err_msg})
        finally:
            llm_duration = time.perf_counter() - llm_start_time
            provider_name = provider.__class__.__name__.replace("Provider", "").lower()
            model_name = getattr(provider, "chat_model_name", "unknown")
            LLM_REQUEST_LATENCY.labels(
                provider=provider_name, model=model_name
            ).observe(llm_duration)
            prompt_tokens = sum(len(m.get("content", "").split()) for m in messages)
            completion_tokens = sum(len(t.split()) for t in accumulated_text)
            LLM_TOKENS_TOTAL.labels(
                provider=provider_name, model=model_name, token_type="prompt"
            ).inc(prompt_tokens)
            LLM_TOKENS_TOTAL.labels(
                provider=provider_name, model=model_name, token_type="completion"
            ).inc(completion_tokens)

        # Step 5: Emit done event
        latency_ms = int((time.perf_counter() - start_time) * 1000)
        yield _sse_event(
            "done",
            {
                "latency_ms": latency_ms,
                "chunks_retrieved": len(hits),
                "provider": provider.__class__.__name__,
            },
        )

        # Step 6: Persist chat messages to DB in independent session
        full_assistant_reply = "".join(accumulated_text)
        try:
            async with AsyncSessionLocal() as persist_db:
                # User message
                user_msg = ChatMessage(
                    session_id=session_id,
                    role="user",
                    content=body.message,
                    citations=[],
                    token_count=len(body.message.split()),
                )
                persist_db.add(user_msg)

                # Assistant message
                asst_msg = ChatMessage(
                    session_id=session_id,
                    role="assistant",
                    content=full_assistant_reply,
                    citations=citations,
                    token_count=len(full_assistant_reply.split()),
                    latency_ms=latency_ms,
                    provider=provider_name,
                    model=provider.chat_model_name,
                )
                persist_db.add(asst_msg)
                await persist_db.commit()
        except Exception as exc:
            import structlog

            structlog.get_logger("codelens.chat").warning("chat_persistence_failed", error=str(exc))

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
