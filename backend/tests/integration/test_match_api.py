"""
backend/tests/integration/test_match_api.py

Real integration test for POST /api/v1/match against a live Postgres.
Skips automatically when no DB is reachable (see conftest.py).
"""
import io
import json

import pytest

from app.dependencies import get_llm_provider
from app.main import app
from tests.unit.test_jd_extractor import VALID_JOB_JSON, StubProvider

VALID_RESUME_JSON = """
{
  "candidate": {"name": "Jane Doe", "email": "jane@example.com"},
  "summary": "Backend engineer.",
  "education": [{"institution": "MIT", "degree": "Bachelor of Science", "field": "CS"}],
  "experience": [{"company": "Acme", "title": "Engineer", "start_date": "2019", "end_date": "2023", "bullets": [], "technologies": []}],
  "skills": [{"name": "Python"}],
  "projects": [],
  "certifications": []
}
"""


@pytest.mark.asyncio
async def test_match_returns_all_scores(client, require_db):
    app.dependency_overrides[get_llm_provider] = lambda: StubProvider(VALID_RESUME_JSON)
    files = {"file": ("resume.txt", io.BytesIO(b"Jane Doe\nPython developer."), "text/plain")}
    resume_resp = await client.post("/api/v1/resume", files=files)
    resume_id = resume_resp.json()["id"]

    app.dependency_overrides[get_llm_provider] = lambda: StubProvider(json.dumps(VALID_JOB_JSON))
    job_resp = await client.post("/api/v1/jobs/analyze", json={"text": "Backend Engineer JD requiring Python."})
    job_id = job_resp.json()["id"]

    app.dependency_overrides.pop(get_llm_provider, None)
    match_resp = await client.post("/api/v1/match", json={"resume_id": resume_id, "job_id": job_id})
    assert match_resp.status_code == 201
    body = match_resp.json()
    assert set(body["sub_scores"].keys()) == {
        "required_skills", "preferred_skills", "experience",
        "education", "projects", "semantic", "ats_keywords",
    }
    assert 0 <= body["overall_score"] <= 100
    assert body["recommendation"] in {
        "STRONGLY_APPLY", "APPLY", "APPLY_WITH_CAUTION", "IMPROVE_FIRST", "DO_NOT_APPLY",
    }


@pytest.mark.asyncio
async def test_match_gap_analysis_complete(client, require_db):
    app.dependency_overrides[get_llm_provider] = lambda: StubProvider(VALID_RESUME_JSON)
    files = {"file": ("resume.txt", io.BytesIO(b"Jane Doe\nPython developer."), "text/plain")}
    resume_resp = await client.post("/api/v1/resume", files=files)
    resume_id = resume_resp.json()["id"]

    app.dependency_overrides[get_llm_provider] = lambda: StubProvider(json.dumps(VALID_JOB_JSON))
    job_resp = await client.post("/api/v1/jobs/analyze", json={"text": "Backend Engineer JD"})
    job_id = job_resp.json()["id"]

    app.dependency_overrides.pop(get_llm_provider, None)
    match_resp = await client.post("/api/v1/match", json={"resume_id": resume_id, "job_id": job_id})
    gap = match_resp.json()["gap_analysis"]
    assert set(gap.keys()) == {"strong", "partial", "missing", "transferable"}


@pytest.mark.asyncio
async def test_match_ats_analysis_complete(client, require_db):
    app.dependency_overrides[get_llm_provider] = lambda: StubProvider(VALID_RESUME_JSON)
    files = {"file": ("resume.txt", io.BytesIO(b"Jane Doe\nPython developer."), "text/plain")}
    resume_resp = await client.post("/api/v1/resume", files=files)
    resume_id = resume_resp.json()["id"]

    app.dependency_overrides[get_llm_provider] = lambda: StubProvider(json.dumps(VALID_JOB_JSON))
    job_resp = await client.post("/api/v1/jobs/analyze", json={"text": "Backend Engineer JD"})
    job_id = job_resp.json()["id"]

    app.dependency_overrides.pop(get_llm_provider, None)
    match_resp = await client.post("/api/v1/match", json={"resume_id": resume_id, "job_id": job_id})
    ats = match_resp.json()["ats_analysis"]
    assert "ats_score" in ats
    assert "keywords_missing" in ats
    assert "formatting_issues" in ats
