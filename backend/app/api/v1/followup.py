"""
api/v1/followup.py

Endpoints:
- POST /api/v1/followup/{application_id}
- POST /api/v1/followup/generate (direct with job_id and status)
"""
from __future__ import annotations

import datetime
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.generation.followup_email import generate_followup
from ai.providers.base import LLMProvider
from app.dependencies import get_db, get_llm_provider
from app.models.application import Application
from app.services.job_service import get_job
from app.services.resume_service import get_resume

router = APIRouter(prefix="/followup", tags=["followup"])


class DirectFollowupRequest(BaseModel):
    job_id: uuid.UUID
    resume_id: Optional[uuid.UUID] = None
    status: str = "APPLIED"
    days_since_applied: int = 7


@router.post("/{application_id}")
async def generate_followup_for_application(
    application_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    provider: LLMProvider = Depends(get_llm_provider),
):
    result = await db.execute(select(Application).where(Application.id == application_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    job = await get_job(db, app.job_id)
    days_since = 7
    if app.created_at:
        now = datetime.datetime.now(datetime.timezone.utc)
        created = app.created_at if app.created_at.tzinfo else app.created_at.replace(tzinfo=datetime.timezone.utc)
        days_since = max(1, (now - created).days)

    app_data = {
        "id": str(app.id),
        "status": app.status,
        "notes": app.notes or "",
        "created_at": str(app.created_at),
    }

    result_data = await generate_followup(
        app_data,
        job.parsed_data or {},
        days_since,
        app.status,
        provider,
    )

    return {
        "application_id": str(app.id),
        "job_title": job.title or "Target Role",
        "company": job.company or "Target Company",
        "current_status": app.status,
        "days_since_applied": days_since,
        **result_data,
    }


@router.post("/generate")
async def generate_followup_direct(
    payload: DirectFollowupRequest,
    db: AsyncSession = Depends(get_db),
    provider: LLMProvider = Depends(get_llm_provider),
):
    job = await get_job(db, payload.job_id)

    app_data = {
        "status": payload.status,
        "days_since_applied": payload.days_since_applied,
    }

    result_data = await generate_followup(
        app_data,
        job.parsed_data or {},
        payload.days_since_applied,
        payload.status,
        provider,
    )

    return {
        "job_title": job.title or "Target Role",
        "company": job.company or "Target Company",
        "current_status": payload.status,
        "days_since_applied": payload.days_since_applied,
        **result_data,
    }
