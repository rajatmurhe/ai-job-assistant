"""
api/v1/cold_email.py

Endpoint:
- POST /api/v1/outreach/cold-email — Generates subject lines, email body, LinkedIn DM, and follow-up templates.
"""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.generation.cold_email_generator import generate_cold_outreach
from ai.providers.base import LLMProvider
from app.dependencies import get_db, get_llm_provider
from app.models.analysis import AnalysisReport
from app.services.job_service import get_job
from app.services.resume_service import get_resume

router = APIRouter(prefix="/outreach", tags=["outreach"])


class ColdOutreachRequest(BaseModel):
    resume_id: uuid.UUID
    job_id: uuid.UUID
    recruiter_name: Optional[str] = None


@router.post("/cold-email")
async def generate_cold_email(
    payload: ColdOutreachRequest,
    db: AsyncSession = Depends(get_db),
    provider: LLMProvider = Depends(get_llm_provider),
):
    resume = await get_resume(db, payload.resume_id)
    job = await get_job(db, payload.job_id)

    # Check match score if available
    result = await db.execute(
        select(AnalysisReport)
        .where(AnalysisReport.resume_id == payload.resume_id, AnalysisReport.job_id == payload.job_id)
        .order_by(AnalysisReport.created_at.desc())
        .limit(1)
    )
    report = result.scalar_one_or_none()
    match_score = float(report.overall_score) if report and report.overall_score else 80.0

    outreach_data = await generate_cold_outreach(
        resume.parsed_data or {},
        job.parsed_data or {},
        payload.recruiter_name or "",
        match_score,
        provider,
    )

    return {
        "resume_id": str(payload.resume_id),
        "job_id": str(payload.job_id),
        "job_title": job.title or "Target Role",
        "company": job.company or "Target Company",
        **outreach_data,
    }
