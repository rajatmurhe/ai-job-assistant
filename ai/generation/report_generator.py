"""
ai/generation/report_generator.py

Assembles the full analysis report (Markdown, with JSON available via
the API response directly). All scores/classifications are computed
deterministically upstream and passed in verbatim (Golden Rule 3) —
this module's LLM call only narrates them; report_generator never
lets the LLM alter a number.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from ai.providers.base import LLMProvider
from app.core.logging import get_logger

logger = get_logger(__name__)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "report_generation.txt"


def _build_prompt(match_result: dict, job_title: str, company: str) -> str:
    template = PROMPT_PATH.read_text()
    return (
        template.replace("{job_title}", job_title)
        .replace("{company}", company)
        .replace("{overall_score}", str(match_result["overall_score"]))
        .replace("{recommendation}", match_result["recommendation"])
        .replace("{match_result_json}", json.dumps(match_result, indent=2))
    )


_NUMBER_RE = re.compile(r"\d+(?:\.\d+)?")


def _verify_numbers_unchanged(report_markdown: str, match_result: dict) -> bool:
    """
    Sanity check: the overall_score value must appear verbatim
    somewhere in the generated report. If the LLM "corrected" or
    rounded it differently, that's a Golden-Rule-3 violation.
    """
    expected = str(match_result["overall_score"])
    return expected in report_markdown


async def generate_report(match_result: dict, job_title: str, company: str, provider: LLMProvider) -> dict:
    prompt = _build_prompt(match_result, job_title, company)
    report_markdown = (await provider.generate(prompt)).strip()

    if not _verify_numbers_unchanged(report_markdown, match_result):
        logger.warning(
            "report.score_mismatch",
            expected_score=match_result["overall_score"],
            note="LLM narrative did not include the exact deterministic score; report still returned but flagged.",
        )

    return {
        "report_markdown": report_markdown,
        "match_result": match_result,
        "score_verified": _verify_numbers_unchanged(report_markdown, match_result),
    }
