"""
ai/generation/salary_coach.py

Generates market salary benchmarks and personalized negotiation strategies.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from ai.providers.base import LLMProvider
from app.core.logging import get_logger

logger = get_logger(__name__)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "salary_negotiation.txt"


def _build_prompt(resume_data: dict, job_data: dict, match_score: float) -> str:
    template = PROMPT_PATH.read_text()
    return (
        template
        .replace("{resume_data_json}", json.dumps(resume_data, indent=2))
        .replace("{job_data_json}", json.dumps(job_data, indent=2))
        .replace("{match_score}", str(match_score))
    )


def _extract_json(raw: str) -> dict:
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```$", "", cleaned.strip(), flags=re.MULTILINE)
    return json.loads(cleaned)


def _validate(data: dict, job_data: dict | None = None) -> dict:
    jd = job_data or {}
    data.setdefault("role_title", jd.get("title") or "Software Engineer")
    data.setdefault("location", jd.get("location") or "Remote")
    data.setdefault("salary_range", {"low": 90000, "mid": 125000, "high": 160000, "currency": "USD", "period": "annual"})
    data.setdefault("candidate_target", 130000)
    data.setdefault("experience_level", "Mid-to-Senior")
    data.setdefault("market_notes", f"Market rates for {data['role_title']} reflect competitive demand for experienced engineers.")
    data.setdefault("negotiation_leverage", [
        "Demonstrated track record of delivering end-to-end features.",
        "Direct alignment with the required tech stack and tooling.",
        "Strong problem-solving and architectural capabilities."
    ])
    data.setdefault("negotiation_script", {
        "initial_ask": "Based on my relevant experience and market benchmarks for this role, I am targeting a compensation package around $130,000.",
        "counter_offer": "Thank you for the offer. Given the responsibilities and my background in this domain, is there flexibility to reach $135,000?",
        "closing": "I am thrilled about joining the team and confident I can create immediate impact. Let's finalize the details.",
    })
    data.setdefault("negotiation_tips", [
        "Always let the employer state their range or offer first if possible.",
        "Negotiate the total package: signing bonus, equity, performance bonus, and remote flexibility.",
        "Remain collaborative and enthusiastic rather than adversarial."
    ])
    data.setdefault("red_flags_to_watch", [
        "Exploding offers requiring a response within 24 hours.",
        "Reluctance to put verbal compensation or bonus numbers in writing.",
        "Vague equity descriptions without share count, valuation, or vesting schedules."
    ])
    data.setdefault("total_comp_checklist", [
        "Base Salary", "Annual Performance Bonus", "Equity / RSUs / Stock Options",
        "Signing Bonus", "Remote Work Stipend", "Learning & Development Budget",
        "Health & Wellness Benefits", "401(k) / Retirement Match"
    ])
    return data


async def generate_salary_guidance(
    resume_data: dict,
    job_data: dict,
    match_score: float,
    provider: LLMProvider,
) -> dict:
    prompt = _build_prompt(resume_data, job_data, match_score)
    raw = await provider.generate(prompt)
    try:
        data = _extract_json(raw)
        return _validate(data, job_data)
    except Exception as exc:
        logger.error("salary_coach.parse_failed", error=str(exc))
        return _validate({}, job_data)
