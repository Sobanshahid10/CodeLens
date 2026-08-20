from __future__ import annotations

import os

from packages.llm_gateway.src.providers.anthropic_provider import AnthropicProvider
from packages.llm_gateway.src.providers.base import BaseLLMProvider
from packages.llm_gateway.src.providers.gemini_provider import GeminiProvider
from packages.llm_gateway.src.providers.mock_provider import MockProvider
from packages.llm_gateway.src.providers.openai_provider import OpenAIProvider


def get_provider(provider_override: str | None = None) -> BaseLLMProvider:
    provider = (provider_override or os.environ.get("LLM_PROVIDER", "openai")).lower()
    match provider:
        case "openai":
            return OpenAIProvider(api_key=os.environ.get("OPENAI_API_KEY"))
        case "anthropic":
            return AnthropicProvider(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        case "gemini":
            return GeminiProvider(api_key=os.environ.get("GOOGLE_API_KEY"))
        case "mock":
            return MockProvider()
        case _:
            raise ValueError(
                f"Unknown provider: {provider}. Choose: openai | anthropic | gemini | mock"
            )
