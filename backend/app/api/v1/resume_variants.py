"""
api/v1/resume_variants.py

Multi-Resume Variant Strategy endpoints:
- POST /api/v1/resumes/{resume_id}/clone-variant — Clone resume into a tailored role variant
- PATCH /api/v1/resumes/{resume_id}/set-active — Set as active primary resume
"""
from __future__ import annotations

import copy
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.resume import Resume
from app.services.resume_service import get_resume

router = APIRouter(prefix="/resume-variants", tags=["resume-variants"])


class CloneVariantRequest(BaseModel):
    variant_name: str
    target_role: Optional[str] = None
    notes: Optional[str] = None


class UpdateVariantRequest(BaseModel):
    variant_name: Optional[str] = None
    target_role: Optional[str] = None
    notes: Optional[str] = None


@router.post("/{resume_id}/clone")
async def clone_resume_variant(
    resume_id: uuid.UUID,
    payload: CloneVariantRequest,
    db: AsyncSession = Depends(get_db),
):
    original = await get_resume(db, resume_id)

    # Create new cloned parsed_data
    cloned_data = copy.deepcopy(original.parsed_data or {})
    cloned_data["variant_name"] = payload.variant_name
    cloned_data["target_role"] = payload.target_role or cloned_data.get("role_focus", "General")
    cloned_data["notes"] = payload.notes or ""

    cloned_file_name = f"{payload.variant_name} - {original.file_name}"

    variant = Resume(
        user_id=original.user_id,
        file_name=cloned_file_name,
        storage_path=original.storage_path,
        raw_text=original.raw_text,
        parsed_data=cloned_data,
        embedding=original.embedding,
        is_active_version=False,
    )
    db.add(variant)
    await db.commit()
    await db.refresh(variant)

    return {
        "id": str(variant.id),
        "file_name": variant.file_name,
        "variant_name": payload.variant_name,
        "target_role": payload.target_role,
        "is_active_version": variant.is_active_version,
        "created_at": str(variant.created_at),
    }


@router.patch("/{resume_id}/set-active")
async def set_active_resume(
    resume_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    resume = await get_resume(db, resume_id)

    # Set all other resumes for this user to inactive
    await db.execute(
        update(Resume)
        .where(Resume.user_id == resume.user_id)
        .values(is_active_version=False)
    )

    # Set this one to active
    resume.is_active_version = True
    await db.commit()
    await db.refresh(resume)

    return {
        "id": str(resume.id),
        "file_name": resume.file_name,
        "is_active_version": resume.is_active_version,
        "message": "Resume set as active primary version.",
    }
