from __future__ import annotations

import os
from collections.abc import AsyncIterator
from typing import Any

from openai import AsyncOpenAI

from .base import BaseLLMProvider, ChatChunk, EmbeddingResult


class OpenAIProvider(BaseLLMProvider):
    def __init__(self, api_key: str | None = None) -> None:
        self._client = AsyncOpenAI(api_key=api_key or os.environ.get("OPENAI_API_KEY"))

    @property
    def embedding_dimensions(self) -> int:
        return 3072

    @property
    def embedding_model_name(self) -> str:
        return "text-embedding-3-large"

    @property
    def chat_model_name(self) -> str:
        return "gpt-4o"

    async def embed(self, texts: list[str]) -> EmbeddingResult:
        response = await self._client.embeddings.create(
            model=self.embedding_model_name,
            input=texts,
            encoding_format="float",
        )
        return EmbeddingResult(
            vectors=[item.embedding for item in response.data],
            model=response.model,
            total_tokens=response.usage.total_tokens,
        )

    async def chat_stream(
        self,
        messages: list[dict[str, Any]],
        system_prompt: str,
        max_tokens: int = 2048,
    ) -> AsyncIterator[ChatChunk]:
        full_messages = [{"role": "system", "content": system_prompt}] + messages

        stream = await self._client.chat.completions.create(
            model=self.chat_model_name,
            messages=full_messages,
            max_tokens=max_tokens,
            stream=True,
        )
        async for event in stream:
            if event.choices and event.choices[0].delta.content:
                yield ChatChunk(
                    delta=event.choices[0].delta.content,
                    finish_reason=event.choices[0].finish_reason,
                )
