"""
ai/matching/scoring_engine.py

The deterministic, weighted match-score calculator. Golden Rule 3:
the LLM never determines the final score — this pure function does,
using only pre-computed deterministic/semantic inputs. The LLM's role
(see ai/generation/report_generator.py) is limited to *explaining*
this number in plain language after the fact; it cannot change it.

Weights are read from Settings (MATCH_*_WEIGHT env vars, validated at
startup to sum to 1.0 — see app/core/config.py) unless explicitly
overridden, which is only done in tests.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from app.core.config import get_settings

from .skill_matcher import match_skills

EDUCATION_LEVELS = {
    "none": 0,
    "high_school": 1,
    "associates": 2,
    "bachelors": 3,
    "masters": 4,
    "phd": 5,
}


@dataclass
class ScoringWeights:
    required_skills: float
    preferred_skills: float
    experience: float
    education: float
    projects: float
    semantic: float
    ats_keywords: float

    @classmethod
    def from_settings(cls) -> "ScoringWeights":
        s = get_settings()
        return cls(
            required_skills=s.match_required_skill_weight,
            preferred_skills=s.match_preferred_skill_weight,
            experience=s.match_experience_weight,
            education=s.match_education_weight,
            projects=s.match_project_weight,
            semantic=s.match_semantic_weight,
            ats_keywords=s.match_ats_keyword_weight,
        )

    def sum(self) -> float:
        return round(
            self.required_skills
            + self.preferred_skills
            + self.experience
            + self.education
            + self.projects
            + self.semantic
            + self.ats_keywords,
            4,
        )


def _skill_group_score(resume_skills: list[dict], job_skills: list[dict], importance: str) -> float:
    group = [s for s in job_skills if s.get("importance") == importance]
    if not group:
        # If evaluating MANDATORY but no skills were labeled MANDATORY, evaluate against all job skills
        if importance == "MANDATORY" and job_skills:
            result = match_skills(resume_skills, job_skills)
            return round(100 * len(result["matched"]) / len(job_skills), 2)
        return 100.0
    result = match_skills(resume_skills, group)
    return round(100 * len(result["matched"]) / len(group), 2)


def _experience_score(resume_years: float, required_years: float | None) -> float:
    if not required_years or required_years <= 0:
        return 100.0
    return round(min(100.0, (resume_years / required_years) * 100), 2)


def _education_score(resume_level: str, required_level: str | None) -> float:
    if not required_level or required_level == "none":
        return 100.0
    resume_rank = EDUCATION_LEVELS.get(resume_level, 0)
    required_rank = EDUCATION_LEVELS.get(required_level, 0)
    if resume_rank >= required_rank:
        return 100.0
    if required_rank == 0:
        return 100.0
    return round(max(0.0, (resume_rank / required_rank) * 100), 2)


def _project_score(resume_project_count: int, job_requires_projects: bool) -> float:
    if not job_requires_projects:
        return 100.0
    return round(min(100.0, resume_project_count * 50.0), 2)


def calculate_score(
    *,
    resume_skills: list[dict],
    job_skills: list[dict],
    resume_years_experience: float = 0.0,
    required_years_experience: float | None = None,
    resume_education_level: str = "none",
    required_education_level: str | None = None,
    resume_project_count: int = 0,
    job_requires_projects: bool = False,
    semantic_score: float = 0.0,
    ats_keyword_coverage: float = 0.0,
    weights: ScoringWeights | None = None,
) -> dict:
    """
    Returns a dict matching ai/validation/schemas/match_result.json's
    `sub_scores` + `overall_score` shape (recommendation/strong_matches/
    etc. are added by matching_service, which also runs gap_analyzer).
    """
    weights = weights or ScoringWeights.from_settings()
    if weights.sum() != 1.0:
        raise ValueError(f"Scoring weights must sum to 1.0, got {weights.sum()}")

    required_skill_match = match_skills(
        resume_skills, [s for s in job_skills if s.get("importance") == "MANDATORY"]
    )

    sub_scores = {
        "required_skills": _skill_group_score(resume_skills, job_skills, "MANDATORY"),
        "preferred_skills": _skill_group_score(resume_skills, job_skills, "PREFERRED"),
        "experience": _experience_score(resume_years_experience, required_years_experience),
        "education": _education_score(resume_education_level, required_education_level),
        "projects": _project_score(resume_project_count, job_requires_projects),
        "semantic": round(max(0.0, min(100.0, semantic_score)), 2),
        "ats_keywords": round(max(0.0, min(100.0, ats_keyword_coverage)), 2),
    }

    overall = (
        sub_scores["required_skills"] * weights.required_skills
        + sub_scores["preferred_skills"] * weights.preferred_skills
        + sub_scores["experience"] * weights.experience
        + sub_scores["education"] * weights.education
        + sub_scores["projects"] * weights.projects
        + sub_scores["semantic"] * weights.semantic
        + sub_scores["ats_keywords"] * weights.ats_keywords
    )

    return {
        "overall_score": round(overall, 2),
        "sub_scores": sub_scores,
        "_required_skills_missing_count": len(required_skill_match["missing"]),
    }


def recommendation_for_score(overall_score: float, required_skills_missing: int) -> str:
    """
    Maps a score (+ whether any MANDATORY skill is missing) to one of
    the recommendation enum values in match_result.json. A missing
    MANDATORY skill caps the recommendation even if the numeric score
    is otherwise high, since a single hard-blocker (e.g. a required
    clearance or degree) shouldn't be masked by strong scores elsewhere.
    """
    if required_skills_missing > 0 and overall_score >= 70:
        return "APPLY_WITH_CAUTION"
    if overall_score >= 85:
        return "STRONGLY_APPLY"
    if overall_score >= 70:
        return "APPLY"
    if overall_score >= 50:
        return "IMPROVE_FIRST"
    return "DO_NOT_APPLY"
