"""
ai/extractors/jd_extractor.py

Raw JD text -> structured JobData JSON via the LLM, validated against
ai/validation/schemas/job_data.json (Golden Rule 2).
"""
from __future__ import annotations

from pathlib import Path

from ai.providers.base import LLMProvider
from ai.validation.validator import parse_and_validate
from app.core.logging import get_logger

logger = get_logger(__name__)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "jd_extraction.txt"


def _build_prompt(jd_text: str) -> str:
    template = PROMPT_PATH.read_text()
    return template.replace("{jd_text}", jd_text)


async def extract_job_data(jd_text: str, provider: LLMProvider) -> dict:
    prompt = _build_prompt(jd_text)
    raw_output = await provider.generate_structured(prompt)
    data = parse_and_validate(raw_output, "job_data")
    logger.info("jd.extract.completed", skills_extracted=len(data.get("skills", [])))
    return data
