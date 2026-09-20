"""
api/v1/ats_preview.py

Real-time ATS Score Preview & Compatibility Analyzer.
Evaluates:
- Keyword match rate (found vs missing keywords)
- Section heading detection (Standard ATS headings)
- Measurable impact & metric density
- Formatting & parseability checks
- Specific recommendations to boost ATS score
"""
from __future__ import annotations

import re
import uuid
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.services.job_service import get_job
from app.services.resume_service import get_resume

router = APIRouter(prefix="/ats", tags=["ats"])

STANDARD_HEADINGS = ["experience", "work experience", "education", "skills", "projects", "summary", "objective"]
STRONG_ACTION_VERBS = {
    "architected", "developed", "spearheaded", "engineered", "optimized",
    "implemented", "designed", "deployed", "scaled", "orchestrated",
    "reduced", "increased", "accelerated", "automated", "mentored",
    "led", "built", "delivered", "transformed", "generated"
}


class ATSPreviewRequest(BaseModel):
    resume_id: uuid.UUID
    job_id: uuid.UUID


def _extract_keywords(text: str) -> list[str]:
    # Extract significant technical and domain words
    words = re.findall(r"\b[A-Za-z][A-Za-z0-9+#.-]{2,}\b", text.lower())
    stop_words = {
        "and", "the", "for", "with", "that", "this", "from", "have", "will", "your",
        "our", "all", "are", "not", "can", "work", "role", "team", "about", "what",
        "you", "who", "they", "been", "more", "such", "join", "help", "years", "looking"
    }
    return [w for w in words if w not in stop_words and len(w) > 2]


@router.post("/preview")
async def preview_ats_score(
    payload: ATSPreviewRequest,
    db: AsyncSession = Depends(get_db),
):
    resume = await get_resume(db, payload.resume_id)
    job = await get_job(db, payload.job_id)

    raw_resume = (resume.raw_text or "").lower()
    raw_job = (job.raw_text or "").lower()

    # 1. Keywords analysis
    job_keywords = set(_extract_keywords(raw_job))
    resume_keywords = set(_extract_keywords(raw_resume))

    # Targeted skills from parsed data
    job_skills = [s.get("name", "").lower() for s in (job.parsed_data or {}).get("skills", []) if s.get("name")]
    resume_skills = [s.get("name", "").lower() for s in (resume.parsed_data or {}).get("skills", []) if s.get("name")]

    found_skills = [s for s in job_skills if s in resume_keywords or any(s in rs for rs in resume_skills)]
    missing_skills = [s for s in job_skills if s not in found_skills]

    keyword_coverage = (len(found_skills) / max(1, len(job_skills))) * 100 if job_skills else 80.0

    # 2. Section Headings Health
    detected_headings = []
    missing_headings = []
    for heading in ["experience", "education", "skills", "summary"]:
        if heading in raw_resume:
            detected_headings.append(heading.title())
        else:
            missing_headings.append(heading.title())

    # 3. Action Verbs Check
    found_verbs = [v for v in STRONG_ACTION_VERBS if v in raw_resume]

    # 4. Metric Density Check (look for numbers, percentages, currency)
    metrics_count = len(re.findall(r"\b\d+[%+kKmM]?|\$\d+|\d+\s*(?:percent|users|x|million|billion)", raw_resume))

    # 5. Calculate Weighted ATS Score
    # Keyword coverage: 50%
    # Sections health: 20%
    # Action verbs & impact: 20%
    # Formatting/parseability: 10%
    section_score = (len(detected_headings) / 4.0) * 100
    impact_score = min(100.0, (metrics_count * 8) + (len(found_verbs) * 5))
    formatting_score = 95.0 if len(raw_resume) > 200 else 60.0

    overall_ats_score = round(
        (keyword_coverage * 0.50) +
        (section_score * 0.20) +
        (impact_score * 0.20) +
        (formatting_score * 0.10),
        1,
    )
    overall_ats_score = max(20.0, min(98.0, overall_ats_score))

    # Recommendations
    recommendations = []
    if missing_skills:
        recommendations.append(f"Incorporate missing target keywords: {', '.join(missing_skills[:5])}")
    if missing_headings:
        recommendations.append(f"Add clear section headings for: {', '.join(missing_headings)}")
    if metrics_count < 5:
        recommendations.append("Quantify your achievements with numbers, percentages, or dollar values.")
    if len(found_verbs) < 5:
        recommendations.append("Use stronger action verbs (e.g. Architected, Spearheaded, Accelerated) at the start of bullet points.")
    if keyword_coverage < 70:
        recommendations.append("Mirror the exact phrasing used in the job description to pass strict keyword filters.")

    return {
        "resume_id": str(payload.resume_id),
        "job_id": str(payload.job_id),
        "job_title": job.title or "Target Role",
        "company": job.company or "Target Company",
        "ats_score": overall_ats_score,
        "keyword_coverage_percent": round(keyword_coverage, 1),
        "found_skills": found_skills,
        "missing_skills": missing_skills,
        "detected_headings": detected_headings,
        "missing_headings": missing_headings,
        "action_verbs_detected": found_verbs,
        "metrics_detected_count": metrics_count,
        "formatting_score": formatting_score,
        "recommendations": recommendations,
    }
