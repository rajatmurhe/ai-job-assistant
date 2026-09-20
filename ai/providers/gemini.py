"""
ai/providers/gemini.py

GeminiProvider — primary LLM (Stack B). Uses the Gemini REST API
directly over httpx (no SDK dependency) so the provider abstraction
stays lightweight and testable with a mocked httpx client.

NOTE: This sandbox has no network access to generativelanguage.
googleapis.com, so this code is implemented against the documented
Gemini REST API contract but has not been exercised against a live
endpoint here. Set GEMINI_API_KEY and LLM_PROVIDER=gemini to use it
for real.
"""
from __future__ import annotations

import httpx

from app.core.config import get_settings
from app.core.exceptions import ConfigurationError

from .base import LLMProvider

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"


class GeminiProvider(LLMProvider):
    name = "gemini"

    def __init__(self) -> None:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise ConfigurationError(
                "GEMINI_API_KEY is not set but LLM_PROVIDER=gemini.",
                details={"provider": "gemini"},
            )
        self._api_key = settings.gemini_api_key
        self._model = settings.gemini_model
        self._timeout = settings.llm_timeout_seconds

    async def _generate_once(self, prompt: str, *, system: str | None = None) -> str:
        models_to_try = [
            "gemini-3.5-flash-lite",
            "gemini-3.6-flash",
            "gemini-3.1-flash-lite",
            "gemini-3.1-flash-lite-preview",
            "gemini-3.5-flash",
            "gemini-3-flash-preview",
            "gemini-3.7-flash",
        ]
        if self._model and self._model not in models_to_try:
            models_to_try.insert(0, self._model)

        last_resp = None
        for model_name in models_to_try:
            url = f"{GEMINI_API_BASE}/models/{model_name}:generateContent?key={self._api_key}"
            payload: dict = {
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            }
            if system:
                payload["systemInstruction"] = {"parts": [{"text": system}]}

            # Use a generous read timeout for large AI generations; keep connect short
            timeout = httpx.Timeout(connect=10.0, read=max(self._timeout, 180), write=30.0, pool=5.0)
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    try:
                        return data["candidates"][0]["content"]["parts"][0]["text"]
                    except (KeyError, IndexError) as e:
                        raise ValueError(f"Unexpected Gemini response shape: {data}") from e
                elif resp.status_code == 429:
                    last_resp = resp
                    import asyncio
                    await asyncio.sleep(1.5)
                    continue
                elif resp.status_code in [503, 404]:
                    last_resp = resp
                    continue
                else:
                    resp.raise_for_status()

        if last_resp is not None:
            last_resp.raise_for_status()
        raise ValueError("No Gemini models succeeded.")

    async def embed(self, text: str) -> list[float]:
        # Gemini text-embedding-004 is documented in section 4 as an
        # alternative embedding backend, but Stack B's WINNER is
        # nomic-embed-text via Ollama (see ai/embeddings/embedder.py).
        # This method is implemented for completeness / future swap.
        url = f"{GEMINI_API_BASE}/models/text-embedding-004:embedContent?key={self._api_key}"
        payload = {"content": {"parts": [{"text": text}]}}

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        return data["embedding"]["values"]
