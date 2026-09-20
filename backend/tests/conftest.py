"""
Shared pytest fixtures.

`client` (async httpx client against the FastAPI app) has no external
dependencies and always works. `db_available` / `db_session` require a
real reachable Postgres (DATABASE_URL) — integration tests that need
them skip automatically (not silently pass) when no DB is reachable,
via the `require_db` fixture, so `pytest` is honest in both a local
dev environment (docker compose up postgres) and a DB-less sandbox.
"""
import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import AsyncMock, patch

from app.main import app

@pytest.fixture(autouse=True)
def mock_embed():
    """Prevent real Gemini embedding calls during every test.

    Embedding is best-effort (failures are logged as warnings, not errors),
    but the network attempt still generates noise in CI. This fixture patches
    the embed method on all LLM providers so tests remain hermetic.
    """
    async def _zero_embed(self, text: str):
        return [0.0] * 768

    with patch(
        "ai.providers.gemini.GeminiProvider.embed",
        new=_zero_embed,
    ), patch(
        "ai.providers.ollama.OllamaProvider.embed",
        new=_zero_embed,
    ):
        yield


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def db_available() -> bool:
    from app.db.session import check_db_connection

    return await check_db_connection()


@pytest.fixture
async def require_db(db_available):
    if not db_available:
        pytest.skip("No reachable Postgres (DATABASE_URL) — start `docker compose up -d postgres` to run this test.")


@pytest.fixture
async def db_session(require_db):
    from app.db.session import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        yield session
        await session.rollback()
