"""
api/v1/generate.py

POST /generate — generate optimized resume, cover letter, and
application email for a (resume, job) pair, enforcing the
truthfulness contract (section 16) inside the AI layer.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ai.providers.base import LLMProvider
from app.dependencies import get_db, get_llm_provider
from app.schemas.generation import GenerateRequest, GeneratedDocumentsResponse
from app.services.generation_service import generate_all_documents

router = APIRouter(prefix="/generate", tags=["generate"])


@router.post("", response_model=GeneratedDocumentsResponse)
async def generate_documents(
    payload: GenerateRequest,
    db: AsyncSession = Depends(get_db),
    provider: LLMProvider = Depends(get_llm_provider),
):
    result = await generate_all_documents(
        db,
        resume_id=payload.resume_id,
        job_id=payload.job_id,
        application_id=payload.application_id,
        provider=provider,
    )
    return result
