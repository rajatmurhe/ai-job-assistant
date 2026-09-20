"""
app/services/job_service.py

Orchestrates: receive JD (text or URL) -> clean -> LLM-extract
structured JobData -> embed -> persist Job + JobRequirement rows.
"""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.embeddings.embedder import embed_job
from ai.extractors.jd_extractor import extract_job_data
from ai.parsers.jd_parser import parse_jd_from_text, parse_jd_from_url
from ai.providers.base import LLMProvider
from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.models.job import Job, JobRequirement

logger = get_logger(__name__)


async def analyze_job(
    db: AsyncSession,
    *,
    text: str | None,
    url: str | None,
    provider: LLMProvider,
) -> Job:
    jd_text = await parse_jd_from_url(url) if url else parse_jd_from_text(text or "")
    parsed_data = await extract_job_data(jd_text, provider)

    embedding: list[float] | None = None
    try:
        embedding = await embed_job(jd_text)
    except Exception as e:
        logger.warning("job.embedding.failed", error=str(e))

    job = Job(
        title=parsed_data["title"],
        company=parsed_data["company"],
        source_url=url,
        raw_text=jd_text,
        parsed_data=parsed_data,
        embedding=embedding,
    )
    db.add(job)
    await db.flush()

    for req in parsed_data.get("requirements", []):
        db.add(JobRequirement(job_id=job.id, requirement_type=req["requirement_type"], value=req["value"], importance=req["importance"]))

    await db.commit()
    await db.refresh(job)

    logger.info("job.processed", job_id=str(job.id), skills_count=len(parsed_data.get("skills", [])))
    return job


async def get_job(db: AsyncSession, job_id: uuid.UUID) -> Job:
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if job is None:
        raise NotFoundError(f"Job {job_id} not found.")
    return job


async def list_jobs(db: AsyncSession) -> list[Job]:
    result = await db.execute(select(Job).order_by(Job.created_at.desc()))
    return list(result.scalars().all())
