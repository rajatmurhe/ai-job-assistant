"""
backend/tests/unit/test_jd_extractor.py

Tests extract_job_data() against a stubbed LLMProvider (no live
Gemini/Ollama call), so we can exercise the full extraction +
validation pipeline deterministically.
"""
import json

import pytest

from ai.extractors.jd_extractor import extract_job_data
from ai.providers.base import LLMProvider
from app.core.exceptions import ValidationFailedError

VALID_JOB_JSON = {
    "title": "Backend Engineer",
    "company": "Acme Corp",
    "location": "Remote",
    "work_arrangement": "remote",
    "seniority": "mid",
    "salary_min": None,
    "salary_max": None,
    "salary_currency": None,
    "summary": "Build APIs.",
    "requirements": [
        {"requirement_type": "skill", "value": "Python", "importance": "MANDATORY"}
    ],
    "skills": [
        {"name": "Python", "importance": "MANDATORY", "years_required": 3},
        {"name": "Docker", "importance": "PREFERRED", "years_required": None},
    ],
    "ats_keywords": ["Agile"],
}


class StubProvider(LLMProvider):
    name = "stub"

    def __init__(self, response: str):
        self._response = response

    async def _generate_once(self, prompt, *, system=None):
        return self._response

    async def embed(self, text):
        return [0.0] * 768

    async def generate_structured(self, prompt, *, system=None):
        return self._response


@pytest.mark.asyncio
async def test_mandatory_skills_extracted():
    provider = StubProvider(json.dumps(VALID_JOB_JSON))
    result = await extract_job_data("some JD text", provider)
    mandatory = [s for s in result["skills"] if s["importance"] == "MANDATORY"]
    assert len(mandatory) == 1
    assert mandatory[0]["name"] == "Python"


@pytest.mark.asyncio
async def test_preferred_skills_classified():
    provider = StubProvider(json.dumps(VALID_JOB_JSON))
    result = await extract_job_data("some JD text", provider)
    preferred = [s for s in result["skills"] if s["importance"] == "PREFERRED"]
    assert len(preferred) == 1
    assert preferred[0]["name"] == "Docker"


@pytest.mark.asyncio
async def test_missing_fields_return_null():
    provider = StubProvider(json.dumps(VALID_JOB_JSON))
    result = await extract_job_data("some JD text", provider)
    assert result["salary_min"] is None
    assert result["salary_max"] is None


@pytest.mark.asyncio
async def test_invalid_llm_output_raises_validation_error():
    provider = StubProvider("this is not JSON at all")
    with pytest.raises(ValidationFailedError):
        await extract_job_data("some JD text", provider)
