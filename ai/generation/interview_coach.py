"""
ai/generation/interview_coach.py

Generates a personalized interview preparation guide for a (resume, job) pair.
Follows the exact same pattern as cover_letter_generator.py:
  - loads prompt template from ai/prompts/interview_coach.txt
  - injects resume_data, job_data, gap_analysis
  - calls provider.generate()
  - parses and validates the JSON response
  - returns a typed dict

Golden Rule 3 is respected: this module reads gap_analysis but does NOT
call the match pipeline itself — the caller must supply it.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from ai.providers.base import LLMProvider
from app.core.logging import get_logger

logger = get_logger(__name__)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "interview_coach.txt"

VALID_CATEGORIES = {"Technical", "Behavioral", "Experience", "Culture"}
VALID_DIFFICULTIES = {"Easy", "Medium", "Hard"}


def _build_prompt(resume_data: dict, job_data: dict, gap_analysis: dict) -> str:
    template = PROMPT_PATH.read_text()
    return (
        template
        .replace("{resume_data_json}", json.dumps(resume_data, indent=2))
        .replace("{job_data_json}", json.dumps(job_data, indent=2))
        .replace("{gap_analysis_json}", json.dumps(gap_analysis, indent=2))
    )


def _extract_json(raw: str) -> dict:
    """Strip markdown fences if the model wraps the response."""
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```$", "", cleaned.strip(), flags=re.MULTILINE)
    return json.loads(cleaned)


def _validate_and_normalise(data: dict) -> dict:
    """Ensure the response has the expected shape; fill defaults where harmless."""
    questions = data.get("questions", [])
    valid_questions = []
    for i, q in enumerate(questions):
        if not isinstance(q, dict):
            continue
        valid_questions.append({
            "id": q.get("id", i + 1),
            "category": q.get("category", "General") if q.get("category") in VALID_CATEGORIES else "General",
            "question": str(q.get("question", "")).strip(),
            "coaching_note": str(q.get("coaching_note", "")).strip(),
            "difficulty": q.get("difficulty", "Medium") if q.get("difficulty") in VALID_DIFFICULTIES else "Medium",
        })

    return {
        "questions": valid_questions,
        "company_prep_notes": str(data.get("company_prep_notes", "")).strip(),
        "opening_pitch": str(data.get("opening_pitch", "")).strip(),
    }


async def generate_interview_prep(
    resume_data: dict,
    job_data: dict,
    gap_analysis: dict,
    provider: LLMProvider,
) -> dict:
    """
    Generate a full interview preparation guide.

    Returns:
        {
            "questions": [{ id, category, question, coaching_note, difficulty }],
            "company_prep_notes": str,
            "opening_pitch": str,
        }
    """
    prompt = _build_prompt(resume_data, job_data, gap_analysis)
    raw = (await provider.generate(prompt)).strip()

    try:
        data = _extract_json(raw)
        result = _validate_and_normalise(data)
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        logger.warning("interview_coach.parse_failed", error=str(e), raw_snippet=raw[:200])
        # Retry once with an explicit correction prompt
        correction = (
            f"{prompt}\n\n"
            "Your previous response was not valid JSON. "
            "Respond with ONLY the raw JSON object (no markdown, no explanations, no code fences)."
        )
        try:
            raw = (await provider.generate(correction)).strip()
            data = _extract_json(raw)
            result = _validate_and_normalise(data)
        except Exception as retry_err:
            logger.error("interview_coach.retry_failed", error=str(retry_err))
            result = {
                "questions": [
                    {
                        "id": 1,
                        "category": "Experience",
                        "question": f"Can you walk us through your experience and how it aligns with {job_data.get('title', 'this position')}?",
                        "coaching_note": "Highlight quantifiable accomplishments and core technologies from your resume.",
                        "difficulty": "Medium",
                    }
                ],
                "company_prep_notes": f"Review {job_data.get('company', 'the company')}'s mission, recent public announcements, and role expectations.",
                "opening_pitch": f"With my background in {', '.join([s.get('name', '') for s in resume_data.get('skills', [])[:3]]) or 'software engineering'}, I am eager to contribute immediately.",
            }

    logger.info(
        "interview_coach.completed",
        question_count=len(result["questions"]),
        job_title=job_data.get("title", ""),
    )
    return result
