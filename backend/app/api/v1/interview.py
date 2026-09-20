"""
api/v1/interview.py

POST /api/v1/interview/prepare — generate a personalised interview
preparation guide (questions, coaching notes, opening pitch) for a
given (resume_id, job_id) pair.

The endpoint fetches both documents, retrieves or computes the latest
gap_analysis for the pair (reusing the persisted AnalysisReport if one
exists, matching the pattern in generation_service.py), then calls the
interview_coach AI module.

No DB writes occur — the guide is returned directly and is cheap to
regenerate. Callers may cache it on the client side.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.generation.interview_coach import generate_interview_prep
from ai.matching.gap_analyzer import classify_skill_gaps
from ai.providers.base import LLMProvider
from app.dependencies import get_db, get_llm_provider
from app.models.analysis import AnalysisReport
from app.services.job_service import get_job
from app.services.resume_service import get_resume

router = APIRouter(prefix="/interview", tags=["interview"])


class InterviewPrepRequest(BaseModel):
    resume_id: uuid.UUID
    job_id: uuid.UUID


class InterviewQuestion(BaseModel):
    id: int
    category: str
    question: str
    coaching_note: str
    difficulty: str


class InterviewPrepResponse(BaseModel):
    resume_id: uuid.UUID
    job_id: uuid.UUID
    job_title: str
    company: str
    questions: list[InterviewQuestion]
    company_prep_notes: str
    opening_pitch: str


async def _get_gap_analysis(
    db: AsyncSession,
    resume_id: uuid.UUID,
    job_id: uuid.UUID,
    resume_skills: list,
    job_skills: list,
) -> dict:
    """Prefer a persisted AnalysisReport gap_analysis; compute fresh if none."""
    result = await db.execute(
        select(AnalysisReport)
        .where(AnalysisReport.resume_id == resume_id, AnalysisReport.job_id == job_id)
        .order_by(AnalysisReport.created_at.desc())
        .limit(1)
    )
    report = result.scalar_one_or_none()
    if report and report.gap_analysis:
        return report.gap_analysis
    return classify_skill_gaps(resume_skills, job_skills)


@router.post("/prepare", response_model=InterviewPrepResponse)
async def prepare_interview(
    payload: InterviewPrepRequest,
    db: AsyncSession = Depends(get_db),
    provider: LLMProvider = Depends(get_llm_provider),
):
    """
    Generate a full interview preparation guide for a (resume, job) pair.
    Reuses any existing match analysis for gap data; falls back to
    computing gap_analysis fresh via classify_skill_gaps.
    """
    resume = await get_resume(db, payload.resume_id)
    job = await get_job(db, payload.job_id)

    resume_data = resume.parsed_data or {}
    job_data = job.parsed_data or {}

    gap_analysis = await _get_gap_analysis(
        db,
        payload.resume_id,
        payload.job_id,
        resume_data.get("skills", []),
        job_data.get("skills", []),
    )

    guide = await generate_interview_prep(resume_data, job_data, gap_analysis, provider)

    return InterviewPrepResponse(
        resume_id=payload.resume_id,
        job_id=payload.job_id,
        job_title=job.title or "Target Role",
        company=job.company or "Target Company",
        questions=[InterviewQuestion(**q) for q in guide["questions"]],
        company_prep_notes=guide["company_prep_notes"],
        opening_pitch=guide["opening_pitch"],
    )
