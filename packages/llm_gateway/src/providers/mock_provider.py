from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any

from .base import BaseLLMProvider, ChatChunk, EmbeddingResult


class MockProvider(BaseLLMProvider):
    """Mock LLM and Embedding provider for testing and local offline development."""

    def __init__(self, dimensions: int = 1536) -> None:
        self._dimensions = dimensions

    @property
    def embedding_dimensions(self) -> int:
        return self._dimensions

    @property
    def embedding_model_name(self) -> str:
        return "mock-embedding-model"

    @property
    def chat_model_name(self) -> str:
        return "mock-chat-model"

    async def embed(self, texts: list[str]) -> EmbeddingResult:
        vectors: list[list[float]] = []
        for text in texts:
            # Deterministic mock embedding based on character values
            seed = sum(ord(c) for c in text) % 1000
            vec = [(float((i + seed) % 100) / 100.0) for i in range(self._dimensions)]
            # Normalize
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
        mock_tokens = [
            "Based ",
            "on ",
            "the ",
            "provided ",
            "codebase, ",
            "here ",
            "is ",
            "the ",
            "relevant ",
            "implementation ",
            "explanation.",
        ]
        for token in mock_tokens:
            yield ChatChunk(delta=token, finish_reason=None)
        yield ChatChunk(delta="", finish_reason="stop")
