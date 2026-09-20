"""
ai/matching/skill_matcher.py

Deterministic skill overlap calculation. No LLM involved — this is
pure, fast, and testable set logic. Case-insensitive, alias-aware.

A "skill" here is a plain dict: {"name": str, "aliases": list[str] (optional)}.
Matching is symmetric: a resume skill matches a job skill if either's
name or any alias equals the other's name or any alias (normalized).
"""
from __future__ import annotations


def _normalize(name: str) -> str:
    return name.strip().lower().replace("-", " ").replace("_", " ")


def _all_names(skill: dict) -> set[str]:
    names = {_normalize(skill["name"])}
    for alias in skill.get("aliases", []) or []:
        names.add(_normalize(alias))
    return names


def match_skills(resume_skills: list[dict], job_skills: list[dict]) -> dict:
    """
    Returns:
        {
          "matched": [job_skill, ...],      # job skills found in the resume
          "missing": [job_skill, ...],      # job skills NOT found in the resume
        }
    """
    resume_name_sets = [_all_names(s) for s in resume_skills]

    matched: list[dict] = []
    missing: list[dict] = []

    for job_skill in job_skills:
        job_names = _all_names(job_skill)
        found = any(job_names & resume_names for resume_names in resume_name_sets)
        (matched if found else missing).append(job_skill)

    return {"matched": matched, "missing": missing}


def skill_present(skill_name: str, resume_skills: list[dict]) -> bool:
    """Case-insensitive / alias-aware membership check for a single skill name."""
    target = _normalize(skill_name)
    return any(target in _all_names(s) for s in resume_skills)
