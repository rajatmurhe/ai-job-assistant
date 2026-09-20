"""
backend/app/api/v1/tailored_resume.py

Endpoints for 95+ Match & ATS Tailored Resume generation, saving as variant, and PDF export.
"""
from __future__ import annotations

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db, get_llm_provider
from app.models.resume import Resume
from app.services.job_service import get_job
from app.services.resume_service import get_resume
from app.services.tailor_service import build_95_plus_tailored_resume, generate_ats_pdf_bytes

router = APIRouter(prefix="/tailored-resume", tags=["tailored-resume"])


class GenerateTailoredResumeRequest(BaseModel):
    resume_id: uuid.UUID
    job_id: uuid.UUID


class SaveTailoredVariantRequest(BaseModel):
    resume_id: uuid.UUID
    job_id: uuid.UUID
    custom_variant_name: Optional[str] = None


@router.post("/generate")
async def generate_tailored_resume(
    payload: GenerateTailoredResumeRequest,
    db: AsyncSession = Depends(get_db),
):
    resume = await get_resume(db, payload.resume_id)
    job = await get_job(db, payload.job_id)

    resume_data = resume.parsed_data or {}
    job_data = job.parsed_data or {}
    job_data["title"] = job.title or job_data.get("title")
    job_data["company"] = job.company or job_data.get("company")
    job_data["raw_text"] = job.raw_text or job_data.get("raw_text")

    tailored = build_95_plus_tailored_resume(resume_data, job_data)

    return {
        "resume_id": str(payload.resume_id),
        "job_id": str(payload.job_id),
        **tailored,
    }


@router.get("/export-pdf")
@router.post("/export-pdf")
async def export_tailored_pdf(
    payload: Optional[GenerateTailoredResumeRequest] = None,
    resume_id: Optional[uuid.UUID] = None,
    job_id: Optional[uuid.UUID] = None,
    inline: Optional[bool] = False,
    db: AsyncSession = Depends(get_db),
):
    target_resume_id = payload.resume_id if payload else resume_id
    target_job_id = payload.job_id if payload else job_id

    if not target_resume_id or not target_job_id:
        raise HTTPException(status_code=400, detail="resume_id and job_id are required.")

    resume = await get_resume(db, target_resume_id)
    job = await get_job(db, target_job_id)

    resume_data = resume.parsed_data or {}
    job_data = job.parsed_data or {}
    job_data["title"] = job.title or job_data.get("title")
    job_data["company"] = job.company or job_data.get("company")
    job_data["raw_text"] = job.raw_text or job_data.get("raw_text")

    tailored = build_95_plus_tailored_resume(resume_data, job_data)
    pdf_bytes = generate_ats_pdf_bytes(tailored)

    candidate_name = tailored['candidate'].get('name', 'Candidate').replace(' ', '_')
    company_name = (job.company or job.title or 'Role').replace(' ', '_')
    # Strip any characters that cause issues in Content-Disposition
    candidate_name = "".join(c for c in candidate_name if c.isalnum() or c in "_-")
    company_name = "".join(c for c in company_name if c.isalnum() or c in "_-")
    filename = f"{candidate_name}_Tailored_{company_name}.pdf"

    disposition_type = "inline" if inline else "attachment"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'{disposition_type}; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
        },
    )


@router.post("/save-variant")
async def save_tailored_as_variant(
    payload: SaveTailoredVariantRequest,
    db: AsyncSession = Depends(get_db),
):
    original = await get_resume(db, payload.resume_id)
    job = await get_job(db, payload.job_id)

    resume_data = original.parsed_data or {}
    job_data = job.parsed_data or {}
    job_data["title"] = job.title or job_data.get("title")
    job_data["company"] = job.company or job_data.get("company")

    tailored = build_95_plus_tailored_resume(resume_data, job_data)

    variant_name = payload.custom_variant_name or f"95% Tailored — {job.title} ({job.company})"

    saved_parsed_data = {
        "candidate": tailored["candidate"],
        "summary": tailored["summary"],
        "skills": tailored["skills"],
        "experience": tailored["experience"],
        "projects": tailored["projects"],
        "education": tailored["education"],
        "variant_name": variant_name,
        "target_role": job.title,
        "target_company": job.company,
        "tailored_match_score": tailored["verified_match_score"],
        "tailored_ats_score": tailored["verified_ats_score"],
    }

    variant_resume = Resume(
        user_id=original.user_id,
        file_name=f"{variant_name}.pdf",
        storage_path=original.storage_path,
        raw_text=tailored["raw_text"],
        parsed_data=saved_parsed_data,
        embedding=original.embedding,
        is_active_version=False,
    )
    db.add(variant_resume)
    await db.commit()
    await db.refresh(variant_resume)

    return {
        "id": str(variant_resume.id),
        "file_name": variant_resume.file_name,
        "variant_name": variant_name,
        "verified_match_score": tailored["verified_match_score"],
        "verified_ats_score": tailored["verified_ats_score"],
        "message": "Tailored resume saved as new role variant successfully!",
    }
