from __future__ import annotations

import asyncio
import os
from collections.abc import AsyncIterator
from typing import Any

import google.generativeai as genai

from .base import BaseLLMProvider, ChatChunk, EmbeddingResult


class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: str | None = None) -> None:
        self._api_key = api_key or os.environ.get("GOOGLE_API_KEY")
        if self._api_key:
            genai.configure(api_key=self._api_key)  # type: ignore[attr-defined]

    @property
    def embedding_dimensions(self) -> int:
        return 768

    @property
    def embedding_model_name(self) -> str:
        return "text-embedding-004"

    @property
    def chat_model_name(self) -> str:
        return "gemini-2.0-flash"

    async def embed(self, texts: list[str]) -> EmbeddingResult:
        loop = asyncio.get_running_loop()

        def _embed() -> dict[str, Any]:
            result: dict[str, Any] = genai.embed_content(  # type: ignore[attr-defined,assignment]
                model=f"models/{self.embedding_model_name}",
                content=texts,
            )
            return result

        result = await loop.run_in_executor(None, _embed)
        embeddings = (
            result["embeddings"]
            if isinstance(result, dict) and "embeddings" in result
            else result.get("embedding", [])
        )
        vectors = embeddings if (embeddings and isinstance(embeddings[0], list)) else [embeddings]
        return EmbeddingResult(
            vectors=vectors,
            model=self.embedding_model_name,
            total_tokens=0,  # Gemini doesn't return token counts for embeddings
        )

    async def chat_stream(
        self,
        messages: list[dict[str, Any]],
        system_prompt: str,
        max_tokens: int = 2048,
    ) -> AsyncIterator[ChatChunk]:
        loop = asyncio.get_running_loop()
        model = genai.GenerativeModel(  # type: ignore[attr-defined]
            self.chat_model_name, system_instruction=system_prompt
        )

        contents = []
        for m in messages:
            role = "user" if m.get("role") in {"user", "system"} else "model"
            contents.append({"role": role, "parts": [m.get("content", "")]})

        def _stream() -> list[object]:
            generation_config = genai.types.GenerationConfig(max_output_tokens=max_tokens)
            return list(
                model.generate_content(contents, stream=True, generation_config=generation_config)
            )

        response = await loop.run_in_executor(None, _stream)

        for chunk in response:
            if hasattr(chunk, "text") and chunk.text:
                yield ChatChunk(
                    delta=chunk.text,
                    finish_reason=getattr(chunk, "finish_reason", None),
                )
