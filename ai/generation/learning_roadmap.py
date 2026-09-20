"""
ai/generation/learning_roadmap.py

Generates a personalized skill-gap learning roadmap for a (resume, job) pair.
Follows the same pattern as interview_coach.py.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from ai.providers.base import LLMProvider
from app.core.logging import get_logger

logger = get_logger(__name__)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "learning_roadmap.txt"


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
    data.setdefault("summary", "")
    data.setdefault("estimated_weeks_total", 8)
    data.setdefault("learning_paths", [])
    data.setdefault("weekly_schedule_suggestion", "")
    data.setdefault("quick_wins", [])
    for path in data["learning_paths"]:
        path.setdefault("skill", "")
        path.setdefault("priority", "Medium")
        path.setdefault("estimated_weeks", 2)
        path.setdefault("resources", [])
        path.setdefault("mini_project", "")
        path.setdefault("outcome", "")
    return data


async def generate_learning_roadmap(
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
        logger.error("learning_roadmap.parse_failed", error=str(exc))
        missing_skills = []
        if isinstance(gap_analysis, dict):
            for s in gap_analysis.get("missing", [])[:4]:
                name = s.get("name") if isinstance(s, dict) else str(s)
                if name:
                    missing_skills.append(name)

        fallback_paths = []
        for skill_name in missing_skills:
            fallback_paths.append({
                "skill": skill_name,
                "priority": "High",
                "current_level": "Beginner",
                "target_level": "Intermediate",
                "estimated_weeks": 2,
                "resources": [
                    {
                        "title": f"{skill_name} Official Documentation & Fundamentals",
                        "platform": "Official Docs",
                        "url_hint": f"https://www.google.com/search?q={skill_name}+getting+started",
                        "type": "Documentation",
                        "duration_hours": 12,
                    },
                    {
                        "title": f"Complete {skill_name} Video Guide",
                        "platform": "YouTube",
                        "url_hint": f"https://www.youtube.com/results?search_query={skill_name}+crash+course",
                        "type": "Video Course",
                        "duration_hours": 6,
                    }
                ],
                "mini_project": f"Build a hands-on project incorporating {skill_name}.",
                "outcome": f"Demonstrate production-ready understanding of {skill_name}.",
            })

        return {
            "summary": f"Focus your preparation on closing high-impact gaps: {', '.join(missing_skills) if missing_skills else 'core role requirements'}.",
            "estimated_weeks_total": max(4, len(fallback_paths) * 2),
            "learning_paths": fallback_paths,
            "weekly_schedule_suggestion": "Dedicate 8-10 hours weekly to reading documentation, building mini-projects, and documenting code on GitHub.",
            "quick_wins": missing_skills[:2] if missing_skills else ["Brush up on core role concepts"],
        }
