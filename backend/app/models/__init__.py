"""
app/models/__init__.py

Imports every model so Base.metadata is fully populated for Alembic
autogeneration (see app/db/migrations/env.py) and so relationship()
string references (e.g. "User", "Resume") resolve correctly.
"""
from .base import Base  # noqa: F401
from .user import User  # noqa: F401
from .resume import Resume  # noqa: F401
from .job import Job, JobRequirement  # noqa: F401
from .skill import Skill, ResumeSkill  # noqa: F401
from .application import Application, ApplicationEvent, APPLICATION_STATUSES  # noqa: F401
from .document import GeneratedDocument  # noqa: F401
from .analysis import AnalysisReport  # noqa: F401

__all__ = [
    "Base", "User", "Resume", "Job", "JobRequirement", "Skill", "ResumeSkill",
    "Application", "ApplicationEvent", "APPLICATION_STATUSES",
    "GeneratedDocument", "AnalysisReport",
]
