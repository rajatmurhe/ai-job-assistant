"""
ai/generation/linkedin_optimizer.py

Generates optimized LinkedIn profile sections for a (resume, job) pair.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from ai.providers.base import LLMProvider
from app.core.logging import get_logger

logger = get_logger(__name__)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "linkedin_optimizer.txt"


def _build_prompt(resume_data: dict, job_data: dict, gap_analysis: dict) -> str:
    template = PROMPT_PATH.read_text()
    return (
        template
        .replace("{resume_data_json}", json.dumps(resume_data, indent=2))
        .replace("{job_data_json}", json.dumps(job_data, indent=2))
        .replace("{gap_analysis_json}", json.dumps(gap_analysis, indent=2))
    )


def _extract_json(raw: str) -> dict:
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```$", "", cleaned.strip(), flags=re.MULTILINE)
    return json.loads(cleaned)


def _validate(data: dict) -> dict:
    data.setdefault("headline", "")
    data.setdefault("about", "")
    data.setdefault("experience_bullets", [])
    data.setdefault("skills_to_add", [])
    data.setdefault("open_to_work_tagline", "")
    data.setdefault("connection_note_template", "")
    data.setdefault("tips", [])
    return data


async def generate_linkedin_profile(
    resume_data: dict,
    job_data: dict,
    gap_analysis: dict,
    provider: LLMProvider,
) -> dict:
    prompt = _build_prompt(resume_data, job_data, gap_analysis)
    raw = await provider.generate(prompt)
    try:
        data = _extract_json(raw)
        return _validate(data)
    except Exception as exc:
        logger.error("linkedin_optimizer.parse_failed", error=str(exc))
        title = job_data.get("title", "Software Engineer")
        skills = [s.get("name", "") for s in resume_data.get("skills", [])[:4] if s.get("name")]
        skill_str = " | ".join(skills) if skills else "Full-Stack Development"
        return {
            "headline": f"{title} | Specializing in {skill_str}",
            "about": f"Dedicated {title} with a track record of building resilient software solutions and delivering measurable business impact.\n\nCore Expertise:\n• {', '.join(skills) if skills else 'System Design, APIs, Cloud'}\n\nI am always interested in discussing new opportunities and technical challenges.",
            "experience_bullets": [
                f"Engineered and deployed scalable features aligned with {title} standards.",
                "Collaborated cross-functionally with product and engineering teams to accelerate shipping cycles.",
                "Optimized application performance and reliability, reducing latency and operational overhead."
            ],
            "skills_to_add": [s.get("name", "") for s in job_data.get("skills", [])[:5] if s.get("name")],
            "open_to_work_tagline": f"Open to {title} roles where I can drive scalable impact.",
            "connection_note_template": f"Hi, I noticed your work at {job_data.get('company', 'your company')} and would love to connect given my background in {skills[0] if skills else 'engineering'}!",
            "tips": [
                "Place your target role title in the first 50 characters of your headline for search visibility.",
                "Add your top 5 technical skills to your LinkedIn featured skills section.",
                "Engage with company posts before sending connection requests to warm up conversations."
            ],
        }
