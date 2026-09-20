"""
GET /health

Reports backend status, DB connectivity, and configured LLM provider.
Fully implemented in Module 2 — every other module can depend on this
for docker-compose healthchecks and CI smoke tests.
"""
from fastapi import APIRouter

from app.core.config import get_settings
from app.db.session import check_db_connection

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check() -> dict:
    settings = get_settings()
    db_ok = await check_db_connection()
    return {
        "status": "ok" if db_ok else "degraded",
        "version": settings.app_version,
        "environment": settings.app_env,
        "db": "up" if db_ok else "down",
        "llm_provider": settings.llm_provider,
    }
