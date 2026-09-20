"""
api/v1/match.py

POST /match — run the deterministic match pipeline for (resume_id, job_id)
GET  /match/{id} — not implemented as a separate lookup; run_match returns
                    the full AnalysisReport directly since matches are
                    cheap/deterministic to recompute (no LLM call inside).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.match import MatchRequest
from app.services.matching_service import run_match

router = APIRouter(prefix="/match", tags=["match"])


@router.post("", status_code=201)
async def create_match(payload: MatchRequest, db: AsyncSession = Depends(get_db)):
    report = await run_match(db, resume_id=payload.resume_id, job_id=payload.job_id)
    return {
        "id": report.id,
        "resume_id": report.resume_id,
        "job_id": report.job_id,
        "overall_score": float(report.overall_score),
        "recommendation": report.recommendation,
        "sub_scores": report.sub_scores,
        "gap_analysis": report.gap_analysis,
        "ats_analysis": report.ats_analysis,
    }
