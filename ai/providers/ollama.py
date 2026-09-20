"""
ai/providers/ollama.py

OllamaProvider — fully local fallback (Qwen2.5-7B for generation,
nomic-embed-text for embeddings). Talks to a local Ollama daemon over
its REST API (OLLAMA_BASE_URL). No API key required, no data leaves
the machine.

NOTE: This sandbox cannot reach a local Ollama daemon (no such
service running here), so this code is implemented against Ollama's
documented /api/generate and /api/embeddings contract but has not
been exercised live in this environment. Run `docker compose --profile
dev up -d ollama` and pull the models to use it for real.
"""
from __future__ import annotations

import httpx

from app.core.config import get_settings

from .base import LLMProvider


class OllamaProvider(LLMProvider):
    name = "ollama"

    def __init__(self) -> None:
        settings = get_settings()
        self._base_url = settings.ollama_base_url.rstrip("/")
        self._model = settings.ollama_model
        self._embed_model = settings.ollama_embed_model
        self._timeout = settings.llm_timeout_seconds

    async def _generate_once(self, prompt: str, *, system: str | None = None) -> str:
        payload = {
            "model": self._model,
            "prompt": prompt,
            "system": system or "",
            "stream": False,
        }
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            resp = await client.post(f"{self._base_url}/api/generate", json=payload)
            resp.raise_for_status()
            data = resp.json()
        return data["response"]

    async def embed(self, text: str) -> list[float]:
        payload = {"model": self._embed_model, "prompt": text}
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            resp = await client.post(f"{self._base_url}/api/embeddings", json=payload)
            resp.raise_for_status()
            data = resp.json()
        return data["embedding"]
