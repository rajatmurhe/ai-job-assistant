"""app/schemas/job.py — API request/response shapes for jobs."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, field_validator


class JobRequirementEntry(BaseModel):
    requirement_type: str
    value: str
    importance: str


class JobSkillEntry(BaseModel):
    name: str
    importance: str
    years_required: float | None = None


class JobData(BaseModel):
    title: str
    company: str | None = None
    location: str | None = None
    work_arrangement: str | None = None
    seniority: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    salary_currency: str | None = None
    summary: str | None = None
    requirements: list[JobRequirementEntry] = []
    skills: list[JobSkillEntry] = []
    ats_keywords: list[str] = []


class JobAnalyzeRequest(BaseModel):
    text: str | None = None
    url: str | None = None

    @field_validator("url")
    @classmethod
    def _one_of_text_or_url(cls, v, info):
        if not v and not info.data.get("text"):
            raise ValueError("Either 'text' or 'url' must be provided.")
        return v


class JobResponse(BaseModel):
    id: uuid.UUID
    title: str
    company: str | None = None
    parsed_data: JobData
    created_at: datetime

    model_config = {"from_attributes": True}
