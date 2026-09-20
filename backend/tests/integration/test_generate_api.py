"""
backend/tests/integration/test_generate_api.py

Real integration tests for POST /api/v1/generate against a live
Postgres, with a stubbed LLM provider that returns fixed, truthful
content so the truthfulness checker passes deterministically. Skips
automatically when no DB is reachable (see conftest.py).
"""
import io
import json

import pytest

from ai.providers.base import LLMProvider
from app.dependencies import get_llm_provider
from app.main import app
from tests.unit.test_jd_extractor import VALID_JOB_JSON, StubProvider

VALID_RESUME_JSON = """
{
  "candidate": {"name": "Jane Doe", "email": "jane@example.com"},
  "summary": "Backend engineer.",
  "education": [],
  "experience": [{"company": "Acme", "title": "Engineer", "bullets": ["Built APIs with Python"], "technologies": ["Python"]}],
  "skills": [{"name": "Python"}],
  "projects": [],
  "certifications": []
}
"""


class SequencedStubProvider(LLMProvider):
    """Returns a different canned response for each successive generate() call."""

    name = "sequenced-stub"

    def __init__(self, responses: list[str]):
        self._responses = list(responses)
        self._i = 0

    async def _generate_once(self, prompt, *, system=None):
        response = self._responses[min(self._i, len(self._responses) - 1)]
        self._i += 1
        return response

    async def embed(self, text):
        return [0.0] * 768

    async def generate_structured(self, prompt, *, system=None):
        return await self._generate_once(prompt)


@pytest.mark.asyncio
async def test_generate_resume_cover_letter_and_email(client, require_db):
    app.dependency_overrides[get_llm_provider] = lambda: StubProvider(VALID_RESUME_JSON)
    files = {"file": ("resume.txt", io.BytesIO(b"Jane Doe\nPython developer at Acme."), "text/plain")}
    resume_resp = await client.post("/api/v1/resume", files=files)
    resume_id = resume_resp.json()["id"]

    app.dependency_overrides[get_llm_provider] = lambda: StubProvider(json.dumps(VALID_JOB_JSON))
    job_resp = await client.post("/api/v1/jobs/analyze", json={"text": "Backend Engineer JD"})
    job_id = job_resp.json()["id"]

    # Order matters: resume_optimizer -> cover_letter_generator -> email_generator.
    # Email generator expects JSON; the others expect plain text.
    responses = [
        "## Summary\nPython developer at Acme.\nCHANGES_MADE:\n- Reordered summary",
        "Dear Hiring Manager, I'm excited to apply. Sincerely, Jane",
        json.dumps({"subject": "Application for Backend Engineer", "body": "Please find my resume attached."}),
    ]
    app.dependency_overrides[get_llm_provider] = lambda: SequencedStubProvider(responses)

    resp = await client.post("/api/v1/generate", json={"resume_id": resume_id, "job_id": job_id})
    app.dependency_overrides.pop(get_llm_provider, None)

    assert resp.status_code == 200
    body = resp.json()
    assert body["truthfulness_check_passed"] is True
    assert "Python developer" in body["resume_markdown"]
    assert body["application_email"]["subject"] == "Application for Backend Engineer"
