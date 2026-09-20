"""
api/v1/resume.py

POST /resume       — upload + parse + extract a resume
GET  /resume        — list the current user's resumes
GET  /resume/{id}   — retrieve one resume
DELETE /resume/{id} — delete a resume
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from ai.providers.base import LLMProvider
from app.dependencies import get_current_user_id, get_db, get_llm_provider
from app.schemas.resume import ResumeResponse
from app.services.resume_service import delete_resume, get_resume, list_resumes, upload_and_process_resume

router = APIRouter(prefix="/resume", tags=["resume"])


@router.post("", response_model=ResumeResponse, status_code=201)
async def upload_resume(
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
    provider: LLMProvider = Depends(get_llm_provider),
):
    file_bytes = await file.read()
    resume = await upload_and_process_resume(
        db, user_id=user_id, file_bytes=file_bytes, file_name=file.filename, provider=provider
    )
    return resume


@router.get("", response_model=list[ResumeResponse])
async def get_resumes(db: AsyncSession = Depends(get_db), user_id: uuid.UUID = Depends(get_current_user_id)):
    return await list_resumes(db, user_id)


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume_by_id(resume_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await get_resume(db, resume_id)


@router.delete("/{resume_id}", status_code=204)
async def delete_resume_by_id(resume_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    await delete_resume(db, resume_id)
