"""app/schemas/match.py — API request/response shapes for match scoring."""
from __future__ import annotations

import uuid

from pydantic import BaseModel


class MatchRequest(BaseModel):
    resume_id: uuid.UUID
    job_id: uuid.UUID


class SubScores(BaseModel):
    required_skills: float
    preferred_skills: float
    experience: float
    education: float
    projects: float
    semantic: float
    ats_keywords: float


class MatchResult(BaseModel):
    overall_score: float
    sub_scores: SubScores
    strong_matches: list[str] = []
    partial_matches: list[str] = []
    missing_skills: list[str] = []
    transferable_skills: list[str] = []
    missing_ats_keywords: list[str] = []
    recommendation: str
    explanation: str | None = None


class MatchResponse(BaseModel):
    id: uuid.UUID
    resume_id: uuid.UUID
    job_id: uuid.UUID
    result: MatchResult
