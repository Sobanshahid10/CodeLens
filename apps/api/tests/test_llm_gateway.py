from __future__ import annotations

import pytest

from packages.llm_gateway.src.providers.anthropic_provider import AnthropicProvider
from packages.llm_gateway.src.providers.gemini_provider import GeminiProvider
from packages.llm_gateway.src.providers.openai_provider import OpenAIProvider
from packages.llm_gateway.src.router import get_provider


def test_provider_properties() -> None:
    openai = OpenAIProvider(api_key="mock-key")
    assert openai.embedding_dimensions == 3072
    assert openai.embedding_model_name == "text-embedding-3-large"
    assert openai.chat_model_name == "gpt-4o"

    anthropic = AnthropicProvider(api_key="mock-key")
    assert anthropic.embedding_dimensions == 1536
    assert anthropic.embedding_model_name == "voyage-code-2"
    assert anthropic.chat_model_name == "claude-3-5-sonnet-20241022"

    gemini = GeminiProvider(api_key="mock-key")
    assert gemini.embedding_dimensions == 3072
    assert gemini.embedding_model_name == "gemini-embedding-001"
    assert gemini.chat_model_name == "gemini-3.6-flash"


def test_router_provider_selection(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "mock-openai-key")
    provider = get_provider()
    assert isinstance(provider, OpenAIProvider)
    assert provider.embedding_dimensions == 3072

    monkeypatch.setenv("LLM_PROVIDER", "anthropic")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "mock-anthropic-key")
    provider = get_provider()
    assert isinstance(provider, AnthropicProvider)
    assert provider.embedding_dimensions == 1536

    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GOOGLE_API_KEY", "mock-google-key")
    provider = get_provider()
    assert isinstance(provider, GeminiProvider)
    assert provider.embedding_dimensions == 3072


def test_router_invalid_provider(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LLM_PROVIDER", "invalid_provider_name")
    with pytest.raises(ValueError, match="Unknown provider"):
        get_provider()
