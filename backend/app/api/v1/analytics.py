"""
api/v1/analytics.py

GET /api/v1/analytics/summary — returns comprehensive metrics, stage breakdown,
conversion rates (response rate, interview rate, offer rate), average match score,
and top missing skills across all job match evaluations.
"""
from __future__ import annotations

from collections import Counter
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user_id, get_db
from app.models.analysis import AnalysisReport
from app.models.application import APPLICATION_STATUSES, Application
from app.models.job import Job
from app.models.resume import Resume

router = APIRouter(prefix="/analytics", tags=["analytics"])


class StageMetric(BaseModel):
    status: str
    count: int
    percentage: float


class RecentApplicationItem(BaseModel):
    id: str
    job_title: str
    company: str
    status: str
    created_at: str


class TopSkillGap(BaseModel):
    name: str
    count: int


class AnalyticsSummaryResponse(BaseModel):
    total_applications: int
    total_resumes: int
    total_jobs: int
    status_counts: dict[str, int]
    response_rate: float
    interview_rate: float
    offer_rate: float
    average_match_score: float
    total_matches_run: int
    high_matches_count: int
    stage_breakdown: list[StageMetric]
    recent_applications: list[RecentApplicationItem]
    top_missing_skills: list[TopSkillGap]


@router.get("/summary", response_model=AnalyticsSummaryResponse)
async def get_analytics_summary(
    db: AsyncSession = Depends(get_db),
    user_id=Depends(get_current_user_id),
):
    # 1. Total counts
    total_resumes = (await db.execute(select(func.count(Resume.id)))).scalar_one() or 0
    total_jobs = (await db.execute(select(func.count(Job.id)))).scalar_one() or 0

    # 2. Applications
    apps_result = await db.execute(
        select(Application, Job.title, Job.company)
        .outerjoin(Job, Application.job_id == Job.id)
        .order_by(Application.created_at.desc())
    )
    app_rows = apps_result.all()
    total_applications = len(app_rows)

    status_counts = {st: 0 for st in APPLICATION_STATUSES}
    recent_apps = []
    for app, job_title, job_company in app_rows:
        curr_status = app.status or "DRAFT"
        if curr_status in status_counts:
            status_counts[curr_status] += 1
        else:
            status_counts[curr_status] = 1

        if len(recent_apps) < 8:
            recent_apps.append(
                RecentApplicationItem(
                    id=str(app.id),
                    job_title=job_title or "Target Role",
                    company=job_company or "Company",
                    status=curr_status,
                    created_at=app.created_at.strftime("%b %d, %Y") if app.created_at else "",
                )
            )

    # Calculate funnel rates based on submitted apps (APPLIED and forward)
    submitted = (
        status_counts.get("APPLIED", 0)
        + status_counts.get("IN_REVIEW", 0)
        + status_counts.get("INTERVIEWING", 0)
        + status_counts.get("OFFER", 0)
        + status_counts.get("REJECTED", 0)
    )
    heard_back = (
        status_counts.get("INTERVIEWING", 0)
        + status_counts.get("OFFER", 0)
        + status_counts.get("REJECTED", 0)
    )
    interviewing = status_counts.get("INTERVIEWING", 0) + status_counts.get("OFFER", 0)
    offers = status_counts.get("OFFER", 0)

    response_rate = round((heard_back / submitted * 100), 1) if submitted > 0 else 0.0
    interview_rate = round((interviewing / submitted * 100), 1) if submitted > 0 else 0.0
    offer_rate = round((offers / submitted * 100), 1) if submitted > 0 else 0.0

    stage_breakdown = []
    for st in APPLICATION_STATUSES:
        cnt = status_counts.get(st, 0)
        pct = round((cnt / total_applications * 100), 1) if total_applications > 0 else 0.0
        stage_breakdown.append(StageMetric(status=st, count=cnt, percentage=pct))

    # 3. Match report analytics
    reports_res = await db.execute(select(AnalysisReport))
    reports = reports_res.scalars().all()
    total_matches_run = len(reports)
    avg_score = 0.0
    high_matches = 0
    missing_counter: Counter[str] = Counter()

    if total_matches_run > 0:
        total_score = sum(float(r.overall_score or 0) for r in reports)
        avg_score = round(total_score / total_matches_run, 1)
        high_matches = sum(1 for r in reports if float(r.overall_score or 0) >= 75.0)

        for r in reports:
            if isinstance(r.gap_analysis, dict):
                missing_list = r.gap_analysis.get("missing", [])
                if isinstance(missing_list, list):
                    for item in missing_list:
                        name = item.get("name") if isinstance(item, dict) else str(item)
                        if name:
                            missing_counter[name.strip().title()] += 1

    top_missing_skills = [
        TopSkillGap(name=name, count=count)
        for name, count in missing_counter.most_common(6)
    ]

    return AnalyticsSummaryResponse(
        total_applications=total_applications,
        total_resumes=total_resumes,
        total_jobs=total_jobs,
        status_counts=status_counts,
        response_rate=response_rate,
        interview_rate=interview_rate,
        offer_rate=offer_rate,
        average_match_score=avg_score,
        total_matches_run=total_matches_run,
        high_matches_count=high_matches,
        stage_breakdown=stage_breakdown,
        recent_applications=recent_apps,
        top_missing_skills=top_missing_skills,
    )
