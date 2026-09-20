"""
ai/generation/cold_email_generator.py

Generates cold outreach emails, LinkedIn DMs, and follow-up templates for recruiters.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from ai.providers.base import LLMProvider
from app.core.logging import get_logger

logger = get_logger(__name__)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "cold_email.txt"


def _build_prompt(resume_data: dict, job_data: dict, recruiter_name: str, match_score: float) -> str:
    template = PROMPT_PATH.read_text()
    return (
        template
        .replace("{resume_data_json}", json.dumps(resume_data, indent=2))
        .replace("{job_data_json}", json.dumps(job_data, indent=2))
        .replace("{recruiter_name}", recruiter_name or "Hiring Team")
        .replace("{match_score}", str(match_score))
    )


def _extract_json(raw: str) -> dict:
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```$", "", cleaned.strip(), flags=re.MULTILINE)
    return json.loads(cleaned)


def _validate(data: dict, resume_data: dict | None = None, job_data: dict | None = None, recruiter: str = "") -> dict:
    rd = resume_data or {}
    jd = job_data or {}
    cand_name = (rd.get("candidate") or {}).get("name", "Candidate")
    rec_name = recruiter or "Hiring Team"
    title = jd.get("title", "Role")
    company = jd.get("company", "your company")
    top_skills = [s.get("name", "") for s in rd.get("skills", [])[:3] if s.get("name")]
    skill_str = ", ".join(top_skills) if top_skills else "software engineering"

    data.setdefault("subject_lines", [
        f"{title} position — {cand_name}",
        f"Quick question regarding the {title} opening at {company}",
        f"Experienced in {top_skills[0] if top_skills else 'software'} — interest in {company}"
    ])
    data.setdefault("email_body", (
        f"Hi {rec_name},\n\n"
        f"I came across the {title} role at {company} and wanted to reach out directly. "
        f"With a strong background in {skill_str}, I have built and delivered scalable solutions that drive measurable business outcomes.\n\n"
        f"Given {company}'s ongoing work, I believe my experience aligns well with what your team needs. "
        f"I have attached my resume for your review.\n\n"
        f"Would you be open to a brief 10-minute chat this week?\n\n"
        f"Best regards,\n{cand_name}"
    ))
    data.setdefault("linkedin_dm", (
        f"Hi {rec_name}, I saw the {title} opening at {company}. "
        f"With expertise in {skill_str}, I would love to connect and share how I could add value to your engineering team!"
    ))
    data.setdefault("follow_up_email", (
        f"Hi {rec_name},\n\n"
        f"Following up on my previous note regarding the {title} opening. "
        f"I remain very interested in the team's direction at {company} and would welcome the chance to connect.\n\n"
        f"Thanks again for your time,\n{cand_name}"
    ))
    data.setdefault("personalization_hooks", [
        f"Reference {company}'s recent technical initiatives and growth.",
        f"Highlight personal experience with {top_skills[0] if top_skills else 'core stack'}.",
        f"Mention shared connections or mutual interest in the problem space."
    ])
    data.setdefault("best_send_times", "Tuesday or Thursday 9:00 AM - 11:00 AM local time")
    data.setdefault("tips", [
        "Keep cold emails under 150 words — concise emails receive 2x higher reply rates.",
        "Include a single, clear question or call-to-action at the very end.",
        "Check the recruiter's LinkedIn activity to reference any recent posts or articles."
    ])
    return data


async def generate_cold_outreach(
    resume_data: dict,
    job_data: dict,
    recruiter_name: str,
    match_score: float,
    provider: LLMProvider,
) -> dict:
    prompt = _build_prompt(resume_data, job_data, recruiter_name, match_score)
    raw = await provider.generate(prompt)
    try:
        data = _extract_json(raw)
        return _validate(data, resume_data, job_data, recruiter_name)
    except Exception as exc:
        logger.error("cold_email_generator.parse_failed", error=str(exc))
        return _validate({}, resume_data, job_data, recruiter_name)
