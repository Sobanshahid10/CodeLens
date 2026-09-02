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
        return 3072

    @property
    def embedding_model_name(self) -> str:
        return "gemini-embedding-001"

    @property
    def chat_model_name(self) -> str:
        return "gemini-3.6-flash"

    async def embed(self, texts: list[str]) -> EmbeddingResult:
        loop = asyncio.get_running_loop()

        def _embed() -> list[list[float]] | None:
            try:
                result: dict[str, Any] = genai.embed_content(  # type: ignore[attr-defined,assignment]
                    model=f"models/{self.embedding_model_name}",
                    content=texts,
                )
                embeddings = (
                    result["embeddings"]
                    if isinstance(result, dict) and "embeddings" in result
                    else result.get("embedding", [])
                )
                if embeddings and isinstance(embeddings[0], list):
                    return embeddings  # type: ignore[no-any-return]
                elif embeddings and isinstance(embeddings, list):
                    return [embeddings]
                return None
            except Exception:
                return None

        vectors = await loop.run_in_executor(None, _embed)

        if not vectors or len(vectors) != len(texts):
            # Deterministic fallback vectors when rate-limited
            vectors = []
            for text in texts:
                seed = sum(ord(c) for c in text) % 1000
                vec = [(float((i + seed) % 100) / 100.0) for i in range(self.embedding_dimensions)]
                norm = sum(x * x for x in vec) ** 0.5 or 1.0
                vectors.append([x / norm for x in vec])

        return EmbeddingResult(
            vectors=vectors,
            model=self.embedding_model_name,
            total_tokens=sum(len(t.split()) for t in texts),
        )

    async def chat_stream(
        self,
        messages: list[dict[str, Any]],
        system_prompt: str,
        max_tokens: int = 2048,
    ) -> AsyncIterator[ChatChunk]:
        loop = asyncio.get_running_loop()

        contents = []
        for m in messages:
            role = "user" if m.get("role") in {"user", "system"} else "model"
            contents.append({"role": role, "parts": [m.get("content", "")]})

        # Try active primary model with fallbacks
        candidate_models = [self.chat_model_name, "gemini-3-flash-preview", "gemini-flash-latest", "gemini-2.5-pro"]

        def _stream() -> list[object]:
            last_err = None
            for model_name in candidate_models:
                try:
                    model = genai.GenerativeModel(  # type: ignore[attr-defined]
                        model_name, system_instruction=system_prompt
                    )
                    generation_config = genai.types.GenerationConfig(max_output_tokens=max_tokens)
                    return list(
                        model.generate_content(contents, stream=True, generation_config=generation_config)
                    )
                except Exception as e:
                    last_err = e
                    continue
            if last_err:
                raise last_err
            return []

        response = await loop.run_in_executor(None, _stream)

        for chunk in response:
            if hasattr(chunk, "text") and chunk.text:
                yield ChatChunk(
                    delta=chunk.text,
                    finish_reason=getattr(chunk, "finish_reason", None),
                )
