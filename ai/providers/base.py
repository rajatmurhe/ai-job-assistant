"""
ai/providers/base.py

Abstract base class every LLM provider (Gemini, Ollama) implements.
Retry logic lives here (shared), not duplicated per-provider, so
LLM_MAX_RETRIES / LLM_TIMEOUT_SECONDS behave identically regardless
of provider. Golden Rule 2 (never trust LLM output blindly) is
enforced by callers using ai.validation.validator.parse_and_validate
on whatever this returns — this layer's job is only "get text back
from the model reliably."
"""
from __future__ import annotations

from abc import ABC, abstractmethod

import structlog
import tenacity

from app.core.config import get_settings
from app.core.exceptions import LLMProviderError

logger = structlog.get_logger(__name__)


class LLMProvider(ABC):
    """Common interface implemented by GeminiProvider and OllamaProvider."""

    name: str = "base"

    @abstractmethod
    async def _generate_once(self, prompt: str, *, system: str | None = None) -> str:
        """Single, unretried call to the underlying model. Raises on failure."""
        raise NotImplementedError

    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        """Return a 768-dim embedding vector for `text`."""
        raise NotImplementedError

    async def generate(self, prompt: str, *, system: str | None = None) -> str:
        """
        Call the model with retry (LLM_MAX_RETRIES, exponential backoff).
        Raises LLMProviderError if every attempt fails.
        """
        settings = get_settings()

        @tenacity.retry(
            stop=tenacity.stop_after_attempt(settings.llm_max_retries + 1),
            wait=tenacity.wait_exponential(multiplier=1, min=1, max=10),
            retry=tenacity.retry_if_exception_type(Exception),
            reraise=True,
        )
        async def _call():
            return await self._generate_once(prompt, system=system)

        logger.info("llm.call.started", provider=self.name, prompt_hash=hash(prompt))
        try:
            result = await _call()
        except Exception as e:
            logger.error("llm.call.failed", provider=self.name, attempts=settings.llm_max_retries + 1, error=str(e))
            raise LLMProviderError(
                f"{self.name} provider failed after {settings.llm_max_retries + 1} attempts: {e}",
                details={"provider": self.name},
            ) from e
        logger.info("llm.call.completed", provider=self.name)
        return result

    async def generate_structured(self, prompt: str, *, system: str | None = None) -> str:
        """
        Like generate(), but instructs the model to return JSON only.
        The returned string is still raw text — callers must run it
        through ai.validation.validator.parse_and_validate.
        """
        json_system = (system or "") + (
            "\n\nRespond with ONLY a single valid JSON object. "
            "No prose, no markdown code fences, no explanation before or after."
        )
        return await self.generate(prompt, system=json_system.strip())
