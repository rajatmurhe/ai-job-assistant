"""
api/v1/reports.py

GET  /reports/{analysis_report_id} — fetch a persisted match analysis
POST /reports/{id}/narrative       — LLM-narrate an existing report
POST /reports/{id}/master-prompt   — AI-synthesize a master resume rewrite prompt
POST /reports/{id}/send            — email the report to the user
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.generation.report_generator import generate_report
from ai.generation.master_prompt_generator import generate_master_prompt
from ai.providers.base import LLMProvider
from app.core.exceptions import NotFoundError
from app.dependencies import get_db, get_llm_provider
from app.models.analysis import AnalysisReport
from app.services.email_service import send_application_email
from app.services.job_service import get_job
from app.services.resume_service import get_resume
from pydantic import BaseModel


class MasterPromptRequest(BaseModel):
    user_rules: str = ""

router = APIRouter(prefix="/reports", tags=["reports"])


async def _get_report(db: AsyncSession, report_id: uuid.UUID) -> AnalysisReport:
    result = await db.execute(select(AnalysisReport).where(AnalysisReport.id == report_id))
    report = result.scalar_one_or_none()
    if report is None:
        raise NotFoundError(f"Analysis report {report_id} not found.")
    return report


@router.get("/{report_id}")
async def get_report(report_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    report = await _get_report(db, report_id)
    return {
        "id": report.id,
        "resume_id": report.resume_id,
        "job_id": report.job_id,
        "overall_score": float(report.overall_score),
        "recommendation": report.recommendation,
        "sub_scores": report.sub_scores,
        "gap_analysis": report.gap_analysis,
        "ats_analysis": report.ats_analysis,
        "report_markdown": report.report_markdown,
    }


@router.post("/{report_id}/narrative")
async def narrate_report(report_id: uuid.UUID, db: AsyncSession = Depends(get_db), provider: LLMProvider = Depends(get_llm_provider)):
    report = await _get_report(db, report_id)
    job = await get_job(db, report.job_id)

    match_result = {
        "overall_score": float(report.overall_score),
        "recommendation": report.recommendation,
        "sub_scores": report.sub_scores,
        **report.gap_analysis,
    }
    narrated = await generate_report(match_result, job.title, job.company, provider)

    report.report_markdown = narrated["report_markdown"]
    await db.commit()

    return {"report_markdown": narrated["report_markdown"], "score_verified": narrated["score_verified"]}


@router.post("/{report_id}/master-prompt")
async def generate_master_resume_prompt(
    report_id: uuid.UUID,
    payload: MasterPromptRequest,
    db: AsyncSession = Depends(get_db),
    provider: LLMProvider = Depends(get_llm_provider),
):
    """AI-synthesizes a comprehensive Master Resume Rewrite Prompt from full match intelligence."""
    report = await _get_report(db, report_id)
    job = await get_job(db, report.job_id)
    resume = await get_resume(db, report.resume_id)

    master_prompt = await generate_master_prompt(
        job_title=job.title or "Target Role",
        company=job.company or "Target Company",
        job_data=job.parsed_data or {},
        resume_data=resume.parsed_data or {},
        gap_analysis=report.gap_analysis or {},
        ats_analysis=report.ats_analysis or {},
        sub_scores=report.sub_scores or {},
        overall_score=float(report.overall_score),
        user_rules=payload.user_rules,
        provider=provider,
    )

    return {"master_prompt": master_prompt}


@router.post("/{report_id}/send")
async def send_report(report_id: uuid.UUID, to_email: str, db: AsyncSession = Depends(get_db)):
    report = await _get_report(db, report_id)
    body = report.report_markdown or f"Match score: {report.overall_score} ({report.recommendation})"
    await send_application_email(to_email, "Your AI Job Assistant match report", body)
    return {"sent": True}
