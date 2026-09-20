"""
api/v1/jobs.py

POST /jobs/analyze — ingest a JD (pasted text or URL), extract structured data
GET  /jobs          — list analyzed jobs
GET  /jobs/{id}      — retrieve one job
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ai.providers.base import LLMProvider
from app.dependencies import get_db, get_llm_provider
from app.schemas.job import JobAnalyzeRequest, JobResponse
from app.services.job_service import analyze_job, get_job, list_jobs

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("/analyze", response_model=JobResponse, status_code=201)
async def analyze_job_posting(
    payload: JobAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    provider: LLMProvider = Depends(get_llm_provider),
):
    job = await analyze_job(db, text=payload.text, url=payload.url, provider=provider)
    return job


@router.get("", response_model=list[JobResponse])
async def get_jobs(db: AsyncSession = Depends(get_db)):
    return await list_jobs(db)


@router.get("/{job_id}", response_model=JobResponse)
async def get_job_by_id(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await get_job(db, job_id)
