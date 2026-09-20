"""
backend/tests/integration/test_application_api.py

Real integration tests for the application tracker FSM against a live
Postgres. Skips automatically when no DB is reachable (see conftest.py).
"""
import io
import uuid

import pytest

from app.dependencies import get_llm_provider
from app.main import app
from tests.unit.test_jd_extractor import VALID_JOB_JSON, StubProvider
import json

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


async def _create_resume_and_job(client, stub_llm_override):
    files = {"file": ("resume.txt", io.BytesIO(b"Jane Doe\nPython developer."), "text/plain")}
    resume_resp = await client.post("/api/v1/resume", files=files)
    resume_id = resume_resp.json()["id"]

    job_resp = await client.post("/api/v1/jobs/analyze", json={"text": "Backend Engineer at Acme Corp. Requires Python."})
    job_id = job_resp.json()["id"]
    return resume_id, job_id


@pytest.fixture
def stub_llm_override():
    app.dependency_overrides[get_llm_provider] = lambda: StubProvider(VALID_RESUME_JSON)
    yield
    app.dependency_overrides.pop(get_llm_provider, None)


@pytest.fixture
def stub_llm_job_override():
    app.dependency_overrides[get_llm_provider] = lambda: StubProvider(json.dumps(VALID_JOB_JSON))
    yield
    app.dependency_overrides.pop(get_llm_provider, None)


@pytest.mark.asyncio
async def test_create_application(client, require_db, stub_llm_override):
    files = {"file": ("resume.txt", io.BytesIO(b"Jane Doe\nPython developer."), "text/plain")}
    resume_resp = await client.post("/api/v1/resume", files=files)
    resume_id = resume_resp.json()["id"]

    app.dependency_overrides[get_llm_provider] = lambda: StubProvider(json.dumps(VALID_JOB_JSON))
    job_resp = await client.post("/api/v1/jobs/analyze", json={"text": "Backend Engineer JD"})
    job_id = job_resp.json()["id"]

    resp = await client.post("/api/v1/applications", json={"resume_id": resume_id, "job_id": job_id})
    assert resp.status_code == 201
    assert resp.json()["status"] == "DRAFT"


@pytest.mark.asyncio
async def test_valid_status_transition(client, require_db, stub_llm_override):
    files = {"file": ("resume.txt", io.BytesIO(b"Jane Doe\nPython developer."), "text/plain")}
    resume_resp = await client.post("/api/v1/resume", files=files)
    resume_id = resume_resp.json()["id"]

    app.dependency_overrides[get_llm_provider] = lambda: StubProvider(json.dumps(VALID_JOB_JSON))
    job_resp = await client.post("/api/v1/jobs/analyze", json={"text": "Backend Engineer JD"})
    job_id = job_resp.json()["id"]

    create_resp = await client.post("/api/v1/applications", json={"resume_id": resume_id, "job_id": job_id})
    application_id = create_resp.json()["id"]

    update_resp = await client.patch(f"/api/v1/applications/{application_id}/status", json={"status": "READY"})
    assert update_resp.status_code == 200
    assert update_resp.json()["status"] == "READY"


@pytest.mark.asyncio
async def test_invalid_status_transition_rejected(client, require_db, stub_llm_override):
    files = {"file": ("resume.txt", io.BytesIO(b"Jane Doe\nPython developer."), "text/plain")}
    resume_resp = await client.post("/api/v1/resume", files=files)
    resume_id = resume_resp.json()["id"]

    app.dependency_overrides[get_llm_provider] = lambda: StubProvider(json.dumps(VALID_JOB_JSON))
    job_resp = await client.post("/api/v1/jobs/analyze", json={"text": "Backend Engineer JD"})
    job_id = job_resp.json()["id"]

    create_resp = await client.post("/api/v1/applications", json={"resume_id": resume_id, "job_id": job_id})
    application_id = create_resp.json()["id"]

    # DRAFT -> OFFER is not a valid direct transition
    update_resp = await client.patch(f"/api/v1/applications/{application_id}/status", json={"status": "OFFER"})
    assert update_resp.status_code == 409


@pytest.mark.asyncio
async def test_get_nonexistent_application_returns_404(client, require_db):
    resp = await client.get(f"/api/v1/applications/{uuid.uuid4()}")
    assert resp.status_code == 404
