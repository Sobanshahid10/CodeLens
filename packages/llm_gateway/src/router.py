from __future__ import annotations

import os
from pathlib import Path
from dotenv import load_dotenv

# Ensure .env is loaded
load_dotenv(dotenv_path=Path(__file__).resolve().parents[3] / ".env")
load_dotenv()

from packages.llm_gateway.src.providers.anthropic_provider import AnthropicProvider
from packages.llm_gateway.src.providers.base import BaseLLMProvider
from packages.llm_gateway.src.providers.gemini_provider import GeminiProvider
from packages.llm_gateway.src.providers.mock_provider import MockProvider
from packages.llm_gateway.src.providers.openai_provider import OpenAIProvider


def get_provider(provider_override: str | None = None) -> BaseLLMProvider:
    provider = (provider_override or os.environ.get("LLM_PROVIDER", "")).lower()


    if not provider:
        if os.environ.get("OPENAI_API_KEY"):
            return OpenAIProvider(api_key=os.environ.get("OPENAI_API_KEY"))
        if os.environ.get("ANTHROPIC_API_KEY"):
            return AnthropicProvider(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        if os.environ.get("GOOGLE_API_KEY"):
            return GeminiProvider(api_key=os.environ.get("GOOGLE_API_KEY"))
        return MockProvider()

    match provider:
        case "openai":
            key = os.environ.get("OPENAI_API_KEY")
            return OpenAIProvider(api_key=key) if key else MockProvider()
        case "anthropic":
            key = os.environ.get("ANTHROPIC_API_KEY")
            return AnthropicProvider(api_key=key) if key else MockProvider()
        case "gemini":
            key = os.environ.get("GOOGLE_API_KEY")
            return GeminiProvider(api_key=key) if key else MockProvider()
        case "mock":
            return MockProvider()
        case _:
            raise ValueError(
                f"Unknown provider: {provider}. Choose: openai | anthropic | gemini | mock"
            )


