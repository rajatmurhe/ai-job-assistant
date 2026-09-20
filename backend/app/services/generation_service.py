"""
app/services/generation_service.py

Orchestrates resume/cover-letter/email generation for a given
application: fetch resume+job+latest analysis, run the AI generation
layer (which enforces the truthfulness contract internally), persist
each result as a GeneratedDocument row.
"""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.generation.cover_letter_generator import generate_cover_letter
from ai.generation.email_generator import generate_application_email
from ai.generation.resume_optimizer import optimize_resume
from ai.matching.gap_analyzer import classify_skill_gaps
from ai.providers.base import LLMProvider
from app.core.logging import get_logger
from app.models.analysis import AnalysisReport
from app.models.document import GeneratedDocument

from .job_service import get_job
from .resume_service import get_resume

logger = get_logger(__name__)


async def _latest_gap_analysis(db: AsyncSession, resume_id: uuid.UUID, job_id: uuid.UUID, resume_skills: list, job_skills: list) -> dict:
    """Prefers a persisted AnalysisReport's gap_analysis (run_match already computed it); falls back to computing fresh."""
    result = await db.execute(
        select(AnalysisReport)
        .where(AnalysisReport.resume_id == resume_id, AnalysisReport.job_id == job_id)
        .order_by(AnalysisReport.created_at.desc())
        .limit(1)
    )
    report = result.scalar_one_or_none()
    if report:
        return report.gap_analysis
    return classify_skill_gaps(resume_skills, job_skills)


async def generate_all_documents(
    db: AsyncSession,
    *,
    resume_id: uuid.UUID,
    job_id: uuid.UUID,
    application_id: uuid.UUID | None,
    provider: LLMProvider,
) -> dict:
    resume = await get_resume(db, resume_id)
    job = await get_job(db, job_id)

    resume_data = resume.parsed_data
    job_data = job.parsed_data

    gap_analysis = await _latest_gap_analysis(db, resume_id, job_id, resume_data.get("skills", []), job_data.get("skills", []))

    resume_result = await optimize_resume(resume_data, job_data, gap_analysis, provider)
    cover_letter_result = await generate_cover_letter(resume_data, job_data, provider)
    email_result = await generate_application_email(resume_data, job_data, provider)

    if application_id:
        for doc_type, result, content_key in [
            ("resume", resume_result, "resume_markdown"),
            ("cover_letter", cover_letter_result, "cover_letter"),
            ("email", email_result, "body"),
        ]:
            db.add(GeneratedDocument(
                application_id=application_id,
                document_type=doc_type,
                content=result[content_key],
                changes_made=result.get("changes_made", []),
                truthfulness_check_passed=result["truthfulness_check_passed"],
            ))
        await db.commit()

    logger.info("generation.completed", resume_id=str(resume_id), job_id=str(job_id))

    return {
        "resume_markdown": resume_result["resume_markdown"],
        "cover_letter": cover_letter_result["cover_letter"],
        "application_email": {"subject": email_result["subject"], "body": email_result["body"]},
        "changes_made": resume_result.get("changes_made", []),
        "truthfulness_check_passed": all([
            resume_result["truthfulness_check_passed"],
            cover_letter_result["truthfulness_check_passed"],
            email_result["truthfulness_check_passed"],
        ]),
    }
