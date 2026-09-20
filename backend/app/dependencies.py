"""
app/dependencies.py

Shared FastAPI dependencies: DB session, LLM provider, current user.
"""
from __future__ import annotations

import uuid

from ai.providers.base import LLMProvider
from ai.providers.factory import get_llm_provider as _get_llm_provider
from app.db.session import get_db  # noqa: F401  (re-exported)

# Phase 2 (AUTH_ENABLED=true) will replace this with real JWT-derived
# user identity. Until then, every request acts as this fixed
# single-user id so the rest of the API is fully usable in local/dev.
DEFAULT_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


def get_llm_provider() -> LLMProvider:
    return _get_llm_provider()


def get_current_user_id() -> uuid.UUID:
    return DEFAULT_USER_ID
