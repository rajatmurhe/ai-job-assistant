"""
api/v1/linkedin.py

Endpoint:
- POST /api/v1/linkedin/optimize — Generates optimized headline, about, bullets, etc.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.generation.linkedin_optimizer import generate_linkedin_profile
from ai.matching.gap_analyzer import classify_skill_gaps
from ai.providers.base import LLMProvider
from app.dependencies import get_db, get_llm_provider
from app.models.analysis import AnalysisReport
from app.services.job_service import get_job
from app.services.resume_service import get_resume

router = APIRouter(prefix="/linkedin", tags=["linkedin"])


class LinkedInOptimizeRequest(BaseModel):
    resume_id: uuid.UUID
    job_id: uuid.UUID


@router.post("/optimize")
async def optimize_linkedin(
    payload: LinkedInOptimizeRequest,
    db: AsyncSession = Depends(get_db),
    provider: LLMProvider = Depends(get_llm_provider),
):
    resume = await get_resume(db, payload.resume_id)
    job = await get_job(db, payload.job_id)

    resume_data = resume.parsed_data or {}
    job_data = job.parsed_data or {}

    # Get gap analysis if report exists
    result = await db.execute(
        select(AnalysisReport)
        .where(AnalysisReport.resume_id == payload.resume_id, AnalysisReport.job_id == payload.job_id)
        .order_by(AnalysisReport.created_at.desc())
        .limit(1)
    )
    report = result.scalar_one_or_none()
    gap_analysis = (report.gap_analysis if report else None) or classify_skill_gaps(
        resume_data.get("skills", []),
        job_data.get("skills", []),
    )

    profile_data = await generate_linkedin_profile(resume_data, job_data, gap_analysis, provider)

    return {
        "resume_id": str(payload.resume_id),
        "job_id": str(payload.job_id),
        "job_title": job.title or "Target Role",
        "company": job.company or "Company",
        **profile_data,
    }
