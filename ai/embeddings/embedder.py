"""
ai/embeddings/embedder.py

Thin wrapper around nomic-embed-text via Ollama for producing the
768-dim vectors stored in resumes.embedding / jobs.embedding
(pgvector). Kept separate from ai/providers/ollama.py's generic
embed() so callers depend on "the embedder" rather than "the Ollama
provider specifically" — the embedding model can be swapped
independently of the generation model (see .env: OLLAMA_EMBED_MODEL).
"""
from __future__ import annotations

from app.core.config import get_settings
from app.core.exceptions import ConfigurationError

EXPECTED_DIMENSIONS = 768


async def embed_text(text: str) -> list[float]:
    """
    Returns a 768-dim embedding for `text` using OLLAMA_EMBED_MODEL,
    regardless of which LLM_PROVIDER is configured for generation
    (embeddings are always local/Ollama per Stack B — see section 4).
    """
    from ai.providers.ollama import OllamaProvider

    settings = get_settings()
    if not settings.ollama_base_url:
        raise ConfigurationError("OLLAMA_BASE_URL is not set; required for embeddings even when LLM_PROVIDER=gemini.")

    provider = OllamaProvider()
    vector = await provider.embed(text)

    if len(vector) != EXPECTED_DIMENSIONS:
        raise ValueError(
            f"Embedding model {settings.ollama_embed_model!r} returned {len(vector)} dims, "
            f"expected {EXPECTED_DIMENSIONS} (pgvector column is fixed at 768)."
        )
    return vector


async def embed_resume(resume_text: str) -> list[float]:
    return await embed_text(resume_text)


async def embed_job(job_text: str) -> list[float]:
    return await embed_text(job_text)
