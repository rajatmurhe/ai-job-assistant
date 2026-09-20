"""
backend/tests/integration/test_resume_api.py

Real integration tests against the running FastAPI app + a live
Postgres. They skip automatically (via the `require_db` fixture) when
no DATABASE_URL is reachable — run with `docker compose up -d postgres`
first, then `make test-integration`, to actually execute them.

Uses a stubbed LLM provider override (no live Gemini/Ollama needed)
so these test the API/DB wiring, not the LLM call itself — that's
covered separately by the unit-level extractor tests.
"""
import io

import pytest

from app.dependencies import get_llm_provider
from app.main import app
from tests.unit.test_jd_extractor import StubProvider

VALID_RESUME_JSON = """
{
  "candidate": {"name": "Jane Doe", "email": "jane@example.com"},
  "summary": "Backend engineer.",
  "education": [],
  "experience": [],
  "skills": [{"name": "Python"}],
  "projects": [],
  "certifications": []
}
"""


@pytest.fixture
def stub_llm_override():
    app.dependency_overrides[get_llm_provider] = lambda: StubProvider(VALID_RESUME_JSON)
    yield
    app.dependency_overrides.pop(get_llm_provider, None)


@pytest.mark.asyncio
async def test_upload_txt_succeeds(client, require_db, stub_llm_override):
    files = {"file": ("resume.txt", io.BytesIO(b"Jane Doe\nPython developer."), "text/plain")}
    resp = await client.post("/api/v1/resume", files=files)
    assert resp.status_code == 201
    body = resp.json()
    assert body["parsed_data"]["candidate"]["name"] == "Jane Doe"


@pytest.mark.asyncio
async def test_upload_invalid_type_fails(client, require_db):
    files = {"file": ("resume.exe", io.BytesIO(b"not a resume"), "application/octet-stream")}
    resp = await client.post("/api/v1/resume", files=files)
    assert resp.status_code == 415


@pytest.mark.asyncio
async def test_get_resume_by_id(client, require_db, stub_llm_override):
    files = {"file": ("resume.txt", io.BytesIO(b"Jane Doe\nPython developer."), "text/plain")}
    upload_resp = await client.post("/api/v1/resume", files=files)
    resume_id = upload_resp.json()["id"]

    get_resp = await client.get(f"/api/v1/resume/{resume_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == resume_id


@pytest.mark.asyncio
async def test_delete_resume(client, require_db, stub_llm_override):
    files = {"file": ("resume.txt", io.BytesIO(b"Jane Doe\nPython developer."), "text/plain")}
    upload_resp = await client.post("/api/v1/resume", files=files)
    resume_id = upload_resp.json()["id"]

    delete_resp = await client.delete(f"/api/v1/resume/{resume_id}")
    assert delete_resp.status_code == 204

    get_resp = await client.get(f"/api/v1/resume/{resume_id}")
    assert get_resp.status_code == 404
