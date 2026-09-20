"""
ai/extractors/resume_extractor.py

Raw resume text -> structured ResumeData JSON via the LLM, validated
against ai/validation/schemas/resume_data.json (Golden Rule 2).
"""
from __future__ import annotations

from pathlib import Path

from ai.providers.base import LLMProvider
from ai.validation.validator import parse_and_validate
from app.core.logging import get_logger

logger = get_logger(__name__)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "resume_extraction.txt"


def _build_prompt(resume_text: str) -> str:
    template = PROMPT_PATH.read_text()
    return template.replace("{resume_text}", resume_text)


async def extract_resume_data(resume_text: str, provider: LLMProvider) -> dict:
    """
    Runs the resume-extraction prompt against `provider` and returns
    validated ResumeData. Raises ValidationFailedError (via
    parse_and_validate) if the LLM output never conforms to schema.
    """
    prompt = _build_prompt(resume_text)
    raw_output = await provider.generate_structured(prompt)
    data = parse_and_validate(raw_output, "resume_data")
    logger.info(
        "resume.extract.completed",
        fields_extracted={
            "education": len(data.get("education", [])),
            "experience": len(data.get("experience", [])),
            "skills": len(data.get("skills", [])),
        },
    )
    return data
