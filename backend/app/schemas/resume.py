"""app/schemas/resume.py — API request/response shapes for resumes."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class CandidateInfo(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    linkedin: str | None = None
    github: str | None = None
    portfolio: str | None = None


class EducationEntry(BaseModel):
    institution: str
    degree: str
    field: str | None = None
    gpa: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    achievements: list[str] = []


class ExperienceEntry(BaseModel):
    company: str
    title: str
    location: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    is_current: bool = False
    bullets: list[str] = []
    technologies: list[str] = []


class SkillEntry(BaseModel):
    name: str
    category: str | None = None
    years: float | None = None
    proficiency: str | None = None
    context: str | None = None


class ProjectEntry(BaseModel):
    name: str
    description: str | None = None
    technologies: list[str] = []
    url: str | None = None


class CertificationEntry(BaseModel):
    name: str
    issuer: str | None = None
    date: str | None = None


class ResumeData(BaseModel):
    candidate: CandidateInfo
    summary: str | None = None
    education: list[EducationEntry] = []
    experience: list[ExperienceEntry] = []
    skills: list[SkillEntry] = []
    projects: list[ProjectEntry] = []
    certifications: list[CertificationEntry] = []


class ResumeResponse(BaseModel):
    id: uuid.UUID
    file_name: str
    parsed_data: ResumeData
    created_at: datetime

    model_config = {"from_attributes": True}
