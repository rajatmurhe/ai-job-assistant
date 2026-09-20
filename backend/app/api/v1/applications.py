"""
api/v1/applications.py

CRUD for the application tracker + FSM status transitions (section 17).
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user_id, get_db
from app.schemas.application import ApplicationCreate, ApplicationResponse, ApplicationStatusUpdate
from app.services.tracking_service import create_application, get_application, list_applications, transition_status

router = APIRouter(prefix="/applications", tags=["applications"])


@router.post("", response_model=ApplicationResponse, status_code=201)
async def create_new_application(
    payload: ApplicationCreate,
    db: AsyncSession = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
):
    return await create_application(db, user_id=user_id, resume_id=payload.resume_id, job_id=payload.job_id, notes=payload.notes)


@router.get("", response_model=list[ApplicationResponse])
async def get_applications(db: AsyncSession = Depends(get_db), user_id: uuid.UUID = Depends(get_current_user_id)):
    return await list_applications(db, user_id)


@router.get("/{application_id}", response_model=ApplicationResponse)
async def get_application_by_id(application_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await get_application(db, application_id)


@router.patch("/{application_id}/status", response_model=ApplicationResponse)
async def update_application_status(application_id: uuid.UUID, payload: ApplicationStatusUpdate, db: AsyncSession = Depends(get_db)):
    return await transition_status(db, application_id, payload.status, payload.note)
