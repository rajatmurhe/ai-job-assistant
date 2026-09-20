"""
ai/generation/followup_email.py

Generates stage-appropriate job application follow-up emails, thank-you notes, and timing advice.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

from ai.providers.base import LLMProvider
from app.core.logging import get_logger

logger = get_logger(__name__)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "followup_email.txt"


def _build_prompt(
    application_data: dict,
    job_data: dict,
    days_since_applied: int,
    current_status: str,
) -> str:
    template = PROMPT_PATH.read_text()
    return (
        template
        .replace("{application_data_json}", json.dumps(application_data, indent=2))
        .replace("{job_data_json}", json.dumps(job_data, indent=2))
        .replace("{days_since_applied}", str(days_since_applied))
        .replace("{current_status}", current_status)
    )


def _extract_json(raw: str) -> dict:
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```$", "", cleaned.strip(), flags=re.MULTILINE)
    return json.loads(cleaned)


def _validate(data: dict, job_data: dict | None = None, current_status: str = "APPLIED") -> dict:
    jd = job_data or {}
    title = jd.get("title", "this position")
    company = jd.get("company", "your company")

    if current_status == "INTERVIEWING":
        default_assessment = f"Since you recently interviewed for {title} at {company}, a thoughtful thank-you note or polite status check is highly recommended."
        default_emails = [
            {
                "type": "Thank You Note",
                "subject": f"Thank you — {title} interview",
                "body": (
                    f"Hi team,\n\n"
                    f"Thank you for taking the time to speak with me today regarding the {title} role. "
                    f"I really enjoyed our conversation and learning more about the team's objectives at {company}.\n\n"
                    f"Our discussion confirmed my excitement for this opportunity and my ability to contribute right away. "
                    f"Please let me know if you need any additional information from my side.\n\n"
                    f"Best regards,\n[Your Name]"
                ),
                "best_time": "Within 24 hours of interview completion",
                "tone": "Warm & Professional",
            },
            {
                "type": "Post-Interview Status Check",
                "subject": f"Checking in — {title} interview update",
                "body": (
                    f"Hi team,\n\n"
                    f"I hope you are having a great week. I am writing to check in on the status of the {title} search. "
                    f"I remain very enthusiastic about the opportunity to join {company} and would welcome any updates on the next steps in the process.\n\n"
                    f"Thank you again for your consideration,\n[Your Name]"
                ),
                "best_time": "5-7 business days after interview",
                "tone": "Polite & Inquiring",
            }
        ]
    else:
        default_assessment = f"For your application to {title} at {company}, a polite follow-up after 1-2 weeks reinforces your interest without being intrusive."
        default_emails = [
            {
                "type": "Application Status Check",
                "subject": f"Following up on application — {title}",
                "body": (
                    f"Hi Hiring Team,\n\n"
                    f"I submitted my application for the {title} position recently and wanted to reiterate my strong interest in joining {company}. "
                    f"Given my background, I believe I can make an immediate positive impact on your team.\n\n"
                    f"I would welcome the opportunity to speak with you when convenient. Please let me know if you need any additional portfolio or work samples.\n\n"
                    f"Best regards,\n[Your Name]"
                ),
                "best_time": "Tuesday or Wednesday mid-morning",
                "tone": "Professional & Confident",
            }
        ]

    data.setdefault("situation_assessment", default_assessment)
    data.setdefault("recommended_action", "Email" if current_status != "INTERVIEWING" else "Email / Thank-you note")
    data.setdefault("emails", default_emails)
    data.setdefault("linkedin_dm", (
        f"Hi! Just following up on my application for {title} at {company}. "
        f"I'm very excited about the team's vision and would love to connect briefly if you have a moment!"
    ))
    data.setdefault("do_not_do", [
        "Do not follow up more than once every 5-7 business days.",
        "Avoid expressing frustration, impatience, or demanding feedback.",
        "Never message multiple hiring managers on the same team with identical messages simultaneously."
    ])
    data.setdefault("timing_advice", "Wait 7-10 business days after applying before your first follow-up. For interviews, send a thank you within 24 hours.")
    return data


async def generate_followup(
    application_data: dict,
    job_data: dict,
    days_since_applied: int,
    current_status: str,
    provider: LLMProvider,
) -> dict:
    prompt = _build_prompt(application_data, job_data, days_since_applied, current_status)
    raw = await provider.generate(prompt)
    try:
        data = _extract_json(raw)
        return _validate(data, job_data, current_status)
    except Exception as exc:
        logger.error("followup_email.parse_failed", error=str(exc))
        return _validate({}, job_data, current_status)
