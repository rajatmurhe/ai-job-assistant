"""
ai/generation/email_generator.py

Generates a short application email (subject + body), same
truthfulness contract, JSON-structured output.
"""
from __future__ import annotations

import json
from pathlib import Path

from ai.providers.base import LLMProvider
from ai.validation.validator import _extract_first_json_object, _strip_markdown_fences  # reuse repair helpers
from app.core.exceptions import TruthfulnessViolationError, ValidationFailedError
from app.core.logging import get_logger

from .truthfulness_checker import run_all_checks

logger = get_logger(__name__)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "application_email.txt"


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


def _parse_email_json(raw_output: str) -> dict:
    cleaned = _strip_markdown_fences(raw_output)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        extracted = _extract_first_json_object(cleaned)
        if not extracted:
            raise ValidationFailedError("Email generator output was not valid JSON.", details={"raw": raw_output[:200]})
        data = json.loads(extracted)

    if "subject" not in data or "body" not in data:
        raise ValidationFailedError("Email generator output missing 'subject' or 'body'.", details={"data": data})
    return data


async def generate_application_email(resume_data: dict, job_data: dict, provider: LLMProvider) -> dict:
    prompt = _build_prompt(resume_data, job_data)
    raw_output = await provider.generate_structured(prompt)
    email = _parse_email_json(raw_output)

    combined_text = f"{email['subject']}\n{email['body']}"
    job_skill_names = [s["name"] for s in job_data.get("skills", [])]
    violations = run_all_checks(combined_text, resume_data, candidate_skills=job_skill_names)

    if violations:
        logger.warning("generate.email.truthfulness.repairing", violations=violations)
        correction_prompt = (
            f"{prompt}\n\n"
            f"ERROR: Your previous email violated the truthfulness contract by adding these non-traceable items: "
            f"{json.dumps(violations)}. "
            f"Rewrite the JSON email strictly omitting these items."
        )
        raw_output2 = await provider.generate_structured(correction_prompt)
        email = _parse_email_json(raw_output2)
        combined_text = f"{email['subject']}\n{email['body']}"
        violations = run_all_checks(combined_text, resume_data, candidate_skills=job_skill_names)

    if violations:
        import re
        for v in violations:
            if v.get("type") == "skill":
                skill_val = v.get("value", "")
                if skill_val:
                    email["body"] = re.sub(rf'(?i)\b{re.escape(skill_val)}\b[,;]?', '', email["body"])
                    email["subject"] = re.sub(rf'(?i)\b{re.escape(skill_val)}\b[,;]?', '', email["subject"])
        combined_text = f"{email['subject']}\n{email['body']}"
        violations = run_all_checks(combined_text, resume_data, candidate_skills=job_skill_names)

    if violations:
        logger.error("generate.truthfulness.violation", document="email", violations=violations)
        raise TruthfulnessViolationError(
            "Generated email contains content not traceable to the source resume.",
            details={"violations": violations},
        )

    logger.info("generate.email.completed")
    return {"subject": email["subject"], "body": email["body"], "truthfulness_check_passed": True}
