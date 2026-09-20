"""
ai/generation/cover_letter_generator.py

Generates a personalized cover letter under the same truthfulness
contract as resume_optimizer.py.
"""
from __future__ import annotations

import json
from pathlib import Path

from ai.providers.base import LLMProvider
from app.core.exceptions import TruthfulnessViolationError
from app.core.logging import get_logger

from .truthfulness_checker import run_all_checks

logger = get_logger(__name__)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "cover_letter.txt"


def _build_prompt(resume_data: dict, job_data: dict) -> str:
    template = PROMPT_PATH.read_text()
    resume_skills = {s["name"].lower() for s in resume_data.get("skills", [])}
    missing_skills = [s["name"] for s in job_data.get("skills", []) if s["name"].lower() not in resume_skills]
    forbidden_note = ""
    if missing_skills:
        forbidden_note = f"\n\nSTRICT FORBIDDEN LIST (Candidate does NOT have these skills — DO NOT claim or include them): {', '.join(missing_skills)}"

    return template.replace("{resume_data_json}", json.dumps(resume_data, indent=2)).replace(
        "{job_data_json}", json.dumps(job_data, indent=2)
    ) + forbidden_note


async def generate_cover_letter(resume_data: dict, job_data: dict, provider: LLMProvider) -> dict:
    prompt = _build_prompt(resume_data, job_data)
    cover_letter = (await provider.generate(prompt)).strip()

    job_skill_names = [s["name"] for s in job_data.get("skills", [])]
    violations = run_all_checks(cover_letter, resume_data, candidate_skills=job_skill_names)

    if violations:
        logger.warning("generate.cover_letter.truthfulness.repairing", violations=violations)
        correction_prompt = (
            f"{prompt}\n\n"
            f"ERROR: Your previous cover letter violated the truthfulness contract by adding these non-traceable items: "
            f"{json.dumps(violations)}. "
            f"Rewrite the cover letter strictly omitting these items. Focus only on the candidate's verified skills from the source resume."
        )
        cover_letter = (await provider.generate(correction_prompt)).strip()
        violations = run_all_checks(cover_letter, resume_data, candidate_skills=job_skill_names)

    if violations:
        import re
        for v in violations:
            if v.get("type") == "skill":
                skill_val = v.get("value", "")
                if skill_val:
                    cover_letter = re.sub(rf'(?i)\b{re.escape(skill_val)}\b[,;]?', '', cover_letter)
        violations = run_all_checks(cover_letter, resume_data, candidate_skills=job_skill_names)

    if violations:
        logger.error("generate.truthfulness.violation", document="cover_letter", violations=violations)
        raise TruthfulnessViolationError(
            "Generated cover letter contains content not traceable to the source resume.",
            details={"violations": violations},
        )

    logger.info("generate.cover_letter.completed")
    return {"cover_letter": cover_letter, "truthfulness_check_passed": True}
