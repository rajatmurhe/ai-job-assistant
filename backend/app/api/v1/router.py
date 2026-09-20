"""
Registers all v1 routers onto a single APIRouter, mounted in app/main.py
under the /api/v1 prefix. Each individual router file owns its own
prefix (see api/v1/{resume,jobs,...}.py) so this file never needs to
know endpoint paths — only which modules exist.
"""
from fastapi import APIRouter

from app.api.v1 import (
    analytics,
    applications,
    ats_preview,
    cold_email,
    followup,
    generate,
    health,
    interview,
    jobs,
    linkedin,
    match,
    mock_interview,
    reports,
    resume,
    resume_variants,
    roadmap,
    salary,
    tailored_resume,
)

api_router = APIRouter()

api_router.include_router(health.router)  # exposed at /health (not under /api/v1, see main.py)
api_router.include_router(resume.router)
api_router.include_router(jobs.router)
api_router.include_router(match.router)
api_router.include_router(generate.router)
api_router.include_router(applications.router)
api_router.include_router(reports.router)
api_router.include_router(interview.router)
api_router.include_router(analytics.router)
api_router.include_router(roadmap.router)
api_router.include_router(linkedin.router)
api_router.include_router(salary.router)
api_router.include_router(cold_email.router)
api_router.include_router(followup.router)
api_router.include_router(ats_preview.router)
api_router.include_router(resume_variants.router)
api_router.include_router(tailored_resume.router)
api_router.include_router(mock_interview.router)


