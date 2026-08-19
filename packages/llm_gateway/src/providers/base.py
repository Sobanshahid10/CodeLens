from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any


@dataclass
class EmbeddingResult:
    vectors: list[list[float]]
    model: str
    total_tokens: int


@dataclass
class ChatChunk:
    delta: str
    finish_reason: str | None


class BaseLLMProvider(ABC):
    @abstractmethod
    async def embed(self, texts: list[str]) -> EmbeddingResult:
        """Generate embeddings for a batch of texts."""
        ...

    @abstractmethod
    def chat_stream(
        self,
        messages: list[dict[str, Any]],
        system_prompt: str,
        max_tokens: int = 2048,
    ) -> AsyncIterator[ChatChunk]:
        """Stream chat responses token-by-token."""
        ...

    @property
    @abstractmethod
    def embedding_dimensions(self) -> int:
        """Vector dimension count for this provider."""
        ...

    @property
    @abstractmethod
    def embedding_model_name(self) -> str:
        """Model identifier for embeddings."""
        ...

    @property
    @abstractmethod
    def chat_model_name(self) -> str:
        """Model identifier for chat."""
        ...
