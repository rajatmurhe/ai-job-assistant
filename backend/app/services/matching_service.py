"""
app/services/matching_service.py

Orchestrates the full match pipeline for a (resume, job) pair:
  1. deterministic skill scoring (ai/matching/scoring_engine.py)
  2. semantic similarity from stored embeddings (ai/matching/semantic_matcher.py)
  3. ATS keyword/formatting analysis (ai/ats/ats_analyzer.py)
  4. skill-gap classification (ai/matching/gap_analyzer.py)
  5. persists an AnalysisReport row

Golden Rule 3 is enforced structurally: this function never calls an
LLM provider. Only report_generator.py (invoked separately, by the
caller, if a narrative report is wanted) touches the LLM, and it is
only ever given the already-final numbers to narrate.
"""
from __future__ import annotations

import re
import uuid
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from ai.ats.ats_analyzer import analyze_ats_compatibility
from ai.matching.gap_analyzer import classify_skill_gaps
from ai.matching.scoring_engine import calculate_score, recommendation_for_score
from ai.matching.semantic_matcher import semantic_score as compute_semantic_score
from app.core.logging import get_logger
from app.models.analysis import AnalysisReport
from app.models.job import Job
from app.models.resume import Resume

from .job_service import get_job
from .resume_service import get_resume

logger = get_logger(__name__)

EDUCATION_KEYWORDS = [
    ("phd", ["phd", "ph.d", "doctorate", "d.phil"]),
    ("masters", ["master", "m.s.", "msc", "m.tech", "mtech", "mba", "mca", "m.e.", "m.eng", "postgraduate"]),
    ("bachelors", ["bachelor", "b.s.", "bsc", "b.tech", "btech", "b.e.", "be", "b.a.", "b.eng", "bba", "bca", "undergraduate", "b.sc", "b.com", "bcom"]),
    ("associates", ["associate"]),
    ("high_school", ["high school", "higher secondary", "secondary", "hsc", "cbse", "icse", "ged", "12th"]),
]

_YEAR_RE = re.compile(r"\b(19|20)\d{2}\b")


def _compute_fallback_semantic_score(resume_text: str, job_text: str) -> float:
    """Computes dynamic lexical & keyword overlap score when vector embeddings are unavailable."""
    if not resume_text or not job_text:
        return 50.0
    r_words = set(re.findall(r"\b[a-zA-Z0-9_+#.-]{3,}\b", resume_text.lower()))
    j_words = set(re.findall(r"\b[a-zA-Z0-9_+#.-]{3,}\b", job_text.lower()))
    if not j_words:
        return 50.0
    overlap = len(r_words & j_words)
    coverage = overlap / len(j_words)
    jaccard = overlap / len(r_words | j_words) if (r_words | j_words) else 0.0
    raw_score = (coverage * 0.75 + jaccard * 0.25) * 100 * 2.2
    return round(min(100.0, max(15.0, raw_score)), 2)


def _highest_education_level(education: list[dict]) -> str:
    for level, keywords in EDUCATION_KEYWORDS:
        for entry in education:
            degree = (entry.get("degree") or "").lower()
            field_name = (entry.get("field") or "").lower()
            combined = f"{degree} {field_name}"
            if any(kw in combined for kw in keywords):
                return level
    return "none"


def _required_education_level(job_requirements: list[dict]) -> str | None:
    for req in job_requirements:
        if req.get("requirement_type") == "education":
            value = req["value"].lower()
            for level, keywords in EDUCATION_KEYWORDS:
                if any(kw in value for kw in keywords):
                    return level
    return None


def _estimate_years_experience(experience: list[dict]) -> float:
    """
    Sums (end_year - start_year) across experience entries where both
    years can be parsed from free-text dates. Overlapping roles are
    double-counted (a deliberate, documented simplification — true
    interval-union math is out of scope for Module 6's deterministic
    scorer and would require far more date-format normalization).
    Entries with unparseable dates contribute 0 rather than guessing.
    """
    total = 0.0
    current_year = date.today().year

    for entry in experience:
        start = entry.get("start_date") or ""
        end = entry.get("end_date") or ""
        start_match = _YEAR_RE.search(start)
        if not start_match:
            continue
        start_year = int(start_match.group())

        if entry.get("is_current") or "present" in end.lower() or "current" in end.lower():
            end_year = current_year
        else:
            end_match = _YEAR_RE.search(end)
            end_year = int(end_match.group()) if end_match else start_year

        if end_year >= start_year:
            total += end_year - start_year

    return total


def _required_years_experience(job_requirements: list[dict], job_skills: list[dict]) -> float | None:
    for req in job_requirements:
        if req.get("requirement_type") == "experience":
            match = re.search(r"(\d+)", req["value"])
            if match:
                return float(match.group(1))
    years_from_skills = [s["years_required"] for s in job_skills if s.get("years_required")]
    return max(years_from_skills) if years_from_skills else None


async def run_match(db: AsyncSession, *, resume_id: uuid.UUID, job_id: uuid.UUID) -> AnalysisReport:
    resume: Resume = await get_resume(db, resume_id)
    job: Job = await get_job(db, job_id)

    resume_data = resume.parsed_data
    job_data = job.parsed_data

    resume_skills = resume_data.get("skills", [])
    job_skills = job_data.get("skills", [])
    job_requirements = job_data.get("requirements", [])

    semantic = 0.0
    if resume.embedding is not None and job.embedding is not None:
        semantic = compute_semantic_score(list(resume.embedding), list(job.embedding))
    else:
        semantic = _compute_fallback_semantic_score(resume.raw_text, job.raw_text)

    ats_result = analyze_ats_compatibility(resume.raw_text, job_data)

    scoring_result = calculate_score(
        resume_skills=resume_skills,
        job_skills=job_skills,
        resume_years_experience=_estimate_years_experience(resume_data.get("experience", [])),
        required_years_experience=_required_years_experience(job_requirements, job_skills),
        resume_education_level=_highest_education_level(resume_data.get("education", [])),
        required_education_level=_required_education_level(job_requirements),
        resume_project_count=len(resume_data.get("projects", [])),
        job_requires_projects=any(r.get("requirement_type") == "skill" and "project" in r.get("value", "").lower() for r in job_requirements),
        semantic_score=semantic,
        ats_keyword_coverage=ats_result["keyword_coverage_score"],
    )

    gap = classify_skill_gaps(resume_skills, job_skills)
    recommendation = recommendation_for_score(scoring_result["overall_score"], scoring_result["_required_skills_missing_count"])

    report = AnalysisReport(
        resume_id=resume_id,
        job_id=job_id,
        overall_score=scoring_result["overall_score"],
        recommendation=recommendation,
        sub_scores=scoring_result["sub_scores"],
        gap_analysis=gap,
        ats_analysis=ats_result,
    )
    db.add(report)
    await db.commit()
    await db.refresh(report)

    logger.info("match.completed", resume_id=str(resume_id), job_id=str(job_id), score=scoring_result["overall_score"])
    return report
