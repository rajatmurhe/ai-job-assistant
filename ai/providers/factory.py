"""
ai/providers/factory.py

get_llm_provider() — reads LLM_PROVIDER from settings and returns the
matching provider instance. `auto` tries Gemini first and falls back
to Ollama if Gemini isn't configured (e.g. no API key set), matching
section 3's "Gemini primary / Ollama fallback" architecture.
"""
from __future__ import annotations

from functools import lru_cache

from app.core.config import get_settings
from app.core.exceptions import ConfigurationError

from .base import LLMProvider
from .gemini import GeminiProvider
from .ollama import OllamaProvider


@lru_cache
def get_llm_provider() -> LLMProvider:
    settings = get_settings()

    if settings.llm_provider == "gemini":
        return GeminiProvider()

    if settings.llm_provider == "ollama":
        return OllamaProvider()

    if settings.llm_provider == "auto":
        if settings.gemini_api_key:
            return GeminiProvider()
        return OllamaProvider()

    raise ConfigurationError(
        f"Unknown LLM_PROVIDER: {settings.llm_provider!r}. Expected gemini | ollama | auto.",
        details={"llm_provider": settings.llm_provider},
    )
