"""
api/v1/roadmap.py

Skill Gap Learning Roadmap API endpoints:
- POST /api/v1/roadmap/{report_id}
- POST /api/v1/roadmap/generate (with resume_id, job_id)
"""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.generation.learning_roadmap import generate_learning_roadmap
from ai.matching.gap_analyzer import classify_skill_gaps
from ai.providers.base import LLMProvider
from app.dependencies import get_db, get_llm_provider
from app.models.analysis import AnalysisReport
from app.services.job_service import get_job
from app.services.resume_service import get_resume

router = APIRouter(prefix="/roadmap", tags=["roadmap"])


class GenerateRoadmapRequest(BaseModel):
    resume_id: uuid.UUID
    job_id: uuid.UUID


@router.post("/{report_id}")
async def generate_roadmap_by_report(
    report_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    provider: LLMProvider = Depends(get_llm_provider),
):
    result = await db.execute(select(AnalysisReport).where(AnalysisReport.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Analysis report not found")

    resume = await get_resume(db, report.resume_id)
    job = await get_job(db, report.job_id)

    gap_analysis = report.gap_analysis or classify_skill_gaps(
        (resume.parsed_data or {}).get("skills", []),
        (job.parsed_data or {}).get("skills", []),
    )

    roadmap = await generate_learning_roadmap(
        resume.parsed_data or {},
        job.parsed_data or {},
        gap_analysis,
        provider,
    )
    return {
        "report_id": str(report_id),
        "job_title": job.title or "Target Role",
        "company": job.company or "Company",
        **roadmap,
    }


@router.post("/generate")
async def generate_roadmap_direct(
    payload: GenerateRoadmapRequest,
    db: AsyncSession = Depends(get_db),
    provider: LLMProvider = Depends(get_llm_provider),
):
    resume = await get_resume(db, payload.resume_id)
    job = await get_job(db, payload.job_id)

    # Check if a recent report exists
    result = await db.execute(
        select(AnalysisReport)
        .where(AnalysisReport.resume_id == payload.resume_id, AnalysisReport.job_id == payload.job_id)
        .order_by(AnalysisReport.created_at.desc())
        .limit(1)
    )
    report = result.scalar_one_or_none()
    gap_analysis = (report.gap_analysis if report else None) or classify_skill_gaps(
        (resume.parsed_data or {}).get("skills", []),
        (job.parsed_data or {}).get("skills", []),
    )

    roadmap = await generate_learning_roadmap(
        resume.parsed_data or {},
        job.parsed_data or {},
        gap_analysis,
        provider,
    )
    return {
        "resume_id": str(payload.resume_id),
        "job_id": str(payload.job_id),
        "job_title": job.title or "Target Role",
        "company": job.company or "Company",
        **roadmap,
    }
