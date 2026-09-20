"""
app/services/resume_service.py

Orchestrates: validate upload -> extract raw text -> save file to
storage -> LLM-extract structured ResumeData -> embed -> persist
Resume row. Wires together ai/parsers, ai/extractors, ai/embeddings,
ai/providers and app/models/resume.py.
"""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.embeddings.embedder import embed_resume
from ai.extractors.resume_extractor import extract_resume_data
from ai.parsers.resume_parser import parse_resume_file
from ai.providers.base import LLMProvider
from app.core.exceptions import NotFoundError
from app.core.logging import get_logger
from app.core.security import validate_file_extension, validate_magic_bytes
from app.models.resume import Resume

from .storage_service import save_file

logger = get_logger(__name__)


async def upload_and_process_resume(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    file_bytes: bytes,
    file_name: str,
    provider: LLMProvider,
) -> Resume:
    ext = validate_file_extension(file_name)
    validate_magic_bytes(file_bytes, ext)

    raw_text = parse_resume_file(file_bytes, file_name)
    storage_path = save_file(file_bytes, file_name, subfolder="resumes")
    parsed_data = await extract_resume_data(raw_text, provider)

    embedding: list[float] | None = None
    try:
        embedding = await embed_resume(raw_text)
    except Exception as e:  # embeddings are best-effort; semantic score degrades gracefully without them
        logger.warning("resume.embedding.failed", error=str(e))

    resume = Resume(
        user_id=user_id,
        file_name=file_name,
        storage_path=storage_path,
        raw_text=raw_text,
        parsed_data=parsed_data,
        embedding=embedding,
    )
    db.add(resume)
    await db.commit()
    await db.refresh(resume)

    logger.info("resume.processed", resume_id=str(resume.id), skills_count=len(parsed_data.get("skills", [])))
    return resume


async def get_resume(db: AsyncSession, resume_id: uuid.UUID) -> Resume:
    result = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = result.scalar_one_or_none()
    if resume is None:
        raise NotFoundError(f"Resume {resume_id} not found.")
    return resume


async def list_resumes(db: AsyncSession, user_id: uuid.UUID) -> list[Resume]:
    result = await db.execute(select(Resume).where(Resume.user_id == user_id).order_by(Resume.created_at.desc()))
    return list(result.scalars().all())


async def delete_resume(db: AsyncSession, resume_id: uuid.UUID) -> None:
    resume = await get_resume(db, resume_id)
    await db.delete(resume)
    await db.commit()
    logger.info("resume.deleted", resume_id=str(resume_id))
