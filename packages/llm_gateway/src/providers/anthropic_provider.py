from __future__ import annotations

import os
from collections.abc import AsyncIterator
from typing import Any

import httpx
from anthropic import AsyncAnthropic

from .base import BaseLLMProvider, ChatChunk, EmbeddingResult


class AnthropicProvider(BaseLLMProvider):
    def __init__(self, api_key: str | None = None) -> None:
        self._client = AsyncAnthropic(api_key=api_key or os.environ.get("ANTHROPIC_API_KEY"))
        self._voyage_api_key = os.environ.get("VOYAGE_API_KEY", "")

    @property
    def embedding_dimensions(self) -> int:
        return 1536

    @property
    def embedding_model_name(self) -> str:
        return "voyage-code-2"

    @property
    def chat_model_name(self) -> str:
        return "claude-3-5-sonnet-20241022"

    async def embed(self, texts: list[str]) -> EmbeddingResult:
        # Call Voyage API via HTTP since Anthropic doesn't have native embeddings
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.voyageai.com/v1/embeddings",
                headers={"Authorization": f"Bearer {self._voyage_api_key}"},
                json={"model": self.embedding_model_name, "input": texts},
                timeout=60.0,
            )
            data = response.json()
            vectors = [item["embedding"] for item in data.get("data", [])]
            return EmbeddingResult(
                vectors=vectors,
                model=self.embedding_model_name,
                total_tokens=data.get("usage", {}).get("total_tokens", 0),
            )

    async def chat_stream(
        self,
        messages: list[dict[str, Any]],
        system_prompt: str,
        max_tokens: int = 2048,
    ) -> AsyncIterator[ChatChunk]:
        async with self._client.messages.stream(
            model=self.chat_model_name,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=messages,  # type: ignore[arg-type]
        ) as stream:
            async for event in stream:
                if hasattr(event, "delta") and hasattr(event.delta, "text"):
                    yield ChatChunk(
                        delta=str(event.delta.text),
                        finish_reason=getattr(event, "stop_reason", None),
                    )
