"""
backend/app/api/v1/mock_interview.py

Interactive AI Mock Interview Simulator endpoints:
- POST /api/v1/mock-interview/start — Starts session and generates question flow
- POST /api/v1/mock-interview/evaluate-answer — STAR method analysis of candidate answer
- POST /api/v1/mock-interview/complete — Final scorecard and readiness analysis
"""
from __future__ import annotations

import json
import re
import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ai.providers.base import LLMProvider
from app.dependencies import get_db, get_llm_provider
from app.services.job_service import get_job
from app.services.resume_service import get_resume

router = APIRouter(prefix="/mock-interview", tags=["mock-interview"])


class StartMockInterviewRequest(BaseModel):
    job_id: uuid.UUID
    resume_id: Optional[uuid.UUID] = None


class EvaluateAnswerRequest(BaseModel):
    job_title: str
    company: Optional[str] = "Company"
    question_id: int
    question: str
    category: str
    answer: str


class MockInterviewSummaryRequest(BaseModel):
    job_title: str
    company: Optional[str] = "Company"
    answers: list[dict]


@router.post("/start")
async def start_mock_interview(
    payload: StartMockInterviewRequest,
    db: AsyncSession = Depends(get_db),
    provider: LLMProvider = Depends(get_llm_provider),
):
    job = await get_job(db, payload.job_id)
    skills = [s.get("name", "") for s in (job.parsed_data or {}).get("skills", []) if s.get("name")]
    top_skills = skills[:4] if skills else ["Software Architecture", "API Design", "Cloud Infrastructure"]

    session_id = str(uuid.uuid4())
    job_title = job.title or "Target Role"
    company = job.company or "Hiring Company"

    questions = [
        {
            "id": 1,
            "category": "Opening & Pitch",
            "question": f"Welcome to the interview for the {job_title} role at {company}. Could you introduce yourself and walk us through your key technical accomplishments relevant to this position?",
            "time_limit_sec": 120,
            "focus": "Concise value proposition, passion, and relevant experience alignment.",
        },
        {
            "id": 2,
            "category": "Core Technical Deep-Dive",
            "question": f"In this role, we heavily rely on {top_skills[0] if top_skills else 'distributed systems'}. Can you describe a challenging scenario where you utilized {top_skills[0] if top_skills else 'this tech'} in production and how you handled edge cases or trade-offs?",
            "time_limit_sec": 180,
            "focus": f"Deep architectural comprehension of {top_skills[0] if top_skills else 'the core stack'}.",
        },
        {
            "id": 3,
            "category": "System Design & Scalability",
            "question": f"Suppose our system experiences a 10x traffic surge during peak hours. How would you architect {job_title} services using {', '.join(top_skills[:2])} to ensure zero downtime and sub-100ms latency?",
            "time_limit_sec": 180,
            "focus": "Horizontal scaling, caching, asynchronous queues, and monitoring.",
        },
        {
            "id": 4,
            "category": "Behavioral & Conflict Resolution",
            "question": "Tell me about a time when you strongly disagreed with an engineering decision or product requirement proposed by a teammate or stakeholder. How did you handle the situation and what was the outcome?",
            "time_limit_sec": 150,
            "focus": "STAR method: Diplomacy, data-driven reasoning, and collaboration.",
        },
        {
            "id": 5,
            "category": "Problem Solving & Failure Recovery",
            "question": "Walk me through the most critical production bug or system outage you have encountered. How did you diagnose the root cause, mitigate the immediate risk, and prevent it from recurring?",
            "time_limit_sec": 180,
            "focus": "Composure under pressure, root cause analysis (RCA), and defensive engineering.",
        },
    ]

    return {
        "session_id": session_id,
        "job_title": job_title,
        "company": company,
        "total_questions": len(questions),
        "questions": questions,
    }


@router.post("/evaluate-answer")
async def evaluate_interview_answer(
    payload: EvaluateAnswerRequest,
    provider: LLMProvider = Depends(get_llm_provider),
):
    if not payload.answer or len(payload.answer.strip()) < 10:
        return {
            "score": 45,
            "star_breakdown": {
                "situation": "Brief or missing context.",
                "task": "Objective was not clearly outlined.",
                "action": "Needs specific technical actions and tools.",
                "result": "No quantifiable outcome provided.",
            },
            "strengths": ["Attempted response"],
            "improvements": [
                "Structure your answer using the STAR format (Situation, Task, Action, Result).",
                "Mention concrete metrics and technologies used.",
            ],
            "model_answer": f"In my previous role, our team faced a bottleneck with {payload.job_title} services. I took ownership of the task, refactored the pipeline using modern patterns, which reduced latency by 35% and saved 10 engineering hours weekly.",
        }

    prompt = f"""
You are an expert technical hiring manager interviewing a candidate for:
Role: {payload.job_title} at {payload.company}
Question Category: {payload.category}
Question: {payload.question}

Candidate's Answer:
"{payload.answer}"

Evaluate this answer strictly according to the STAR method (Situation, Task, Action, Result).
Return ONLY a valid JSON object matching this structure:
{{
  "score": <integer 0-100>,
  "star_breakdown": {{
    "situation": "<evaluation of how well context was established>",
    "task": "<evaluation of the defined goal or challenge>",
    "action": "<evaluation of specific technical steps taken>",
    "result": "<evaluation of tangible outcomes or business impact>"
  }},
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<actionable improvement 1>", "<actionable improvement 2>"],
  "model_answer": "<2-3 sentence ideal response illustrating what a 95+ score answer looks like>"
}}
"""
    try:
        raw = await provider.generate(prompt)
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.MULTILINE)
        cleaned = re.sub(r"\s*```$", "", cleaned.strip(), flags=re.MULTILINE)
        data = json.loads(cleaned)
        data.setdefault("score", 82)
        data.setdefault("star_breakdown", {
            "situation": "Context was clear.",
            "task": "Task was well defined.",
            "action": "Actions were described with good technical depth.",
            "result": "Impact was communicated effectively.",
        })
        data.setdefault("strengths", ["Clear communication", "Relevant technical terminology"])
        data.setdefault("improvements", ["Quantify the business impact with metrics"])
        data.setdefault("model_answer", "Highlight specific metrics and trade-offs made.")
        return data
    except Exception:
        # Fallback scoring based on answer completeness
        word_count = len(payload.answer.split())
        score = min(92, max(65, 50 + int(word_count * 0.4)))
        return {
            "score": score,
            "star_breakdown": {
                "situation": "Clear initial problem setup.",
                "task": "Demonstrated ownership of the challenge.",
                "action": "Good description of implementation steps.",
                "result": "Consider quantifying the final metrics (e.g. % performance gain or time saved).",
            },
            "strengths": ["Structured narrative", "Logical progression of thoughts"],
            "improvements": ["Incorporate specific performance numbers or cost savings to elevate the result."],
            "model_answer": f"When leading {payload.job_title} initiatives, I always tie technical implementation directly to business reliability and measurable KPIs.",
        }


@router.post("/complete")
async def complete_mock_interview(
    payload: MockInterviewSummaryRequest,
):
    scores = [int(a.get("score", 75)) for a in payload.answers]
    avg_score = round(sum(scores) / max(1, len(scores)), 1)

    if avg_score >= 88:
        readiness = "High (Ready for Onsite / Final Round)"
        recommendation = "Strong Hire Candidate"
        badge_color = "emerald"
    elif avg_score >= 75:
        readiness = "Moderate (Solid foundation, refine metrics & STAR flow)"
        recommendation = "Promising Hire — Polish Delivery"
        badge_color = "amber"
    else:
        readiness = "Developing (Practice STAR structure and technical deep-dives)"
        recommendation = "Needs Additional Practice"
        badge_color = "rose"

    return {
        "job_title": payload.job_title,
        "company": payload.company,
        "total_questions_answered": len(payload.answers),
        "overall_readiness_score": avg_score,
        "readiness_level": readiness,
        "recommendation": recommendation,
        "badge_color": badge_color,
        "final_coaching_notes": [
            "Keep answers between 90 and 150 seconds to maintain interviewer engagement.",
            "Always end your story with a concrete result: numbers, latency reduction, user adoption, or lesson learned.",
            f"Review {payload.job_title} architectural patterns before your real interview.",
        ],
    }
