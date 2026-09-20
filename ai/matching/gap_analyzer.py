"""
ai/matching/gap_analyzer.py

Classifies each job skill against the resume as one of:
    STRONG        exact/alias match found in the resume (skill_matcher)
    PARTIAL       related resume skill found (word-overlap heuristic,
                   e.g. job wants "AWS Lambda", resume has "AWS")
    MISSING       no match and no partial overlap
    TRANSFERABLE  not present on the resume, but related to a resume
                   skill via a known adjacency map (e.g. Vue experience
                   is transferable toward a React requirement)

This module never invents a skill name that isn't already present in
either the resume_skills or job_skills input lists — it only
classifies/labels the inputs it's given (Golden Rule 1: never
fabricate). The built-in TRANSFERABLE_SKILL_MAP only ever *labels* an
existing resume skill as transferable toward an existing job skill;
it does not add new skills to any output list.
"""
from __future__ import annotations

from .skill_matcher import _normalize, match_skills

# A small, explicit adjacency map for common transferable-skill pairs.
# Intentionally conservative — only well-established analogues, not
# guesses. Extend deliberately; this is reviewed content, not LLM output.
TRANSFERABLE_SKILL_MAP: dict[str, set[str]] = {
    "react": {"vue", "angular", "svelte", "next.js", "javascript", "typescript"},
    "vue": {"react", "angular", "svelte", "javascript"},
    "angular": {"react", "vue", "svelte", "typescript"},
    "postgresql": {"mysql", "sqlite", "sql server", "oracle", "sql"},
    "mysql": {"postgresql", "sqlite", "sql server", "sql"},
    "docker": {"podman", "containerd", "kubernetes", "ci/cd"},
    "kubernetes": {"docker swarm", "nomad", "docker", "aws"},
    "tensorflow": {"pytorch", "jax", "keras", "machine learning", "deep learning"},
    "pytorch": {"tensorflow", "jax", "keras", "machine learning", "deep learning"},
    "aws": {"gcp", "azure", "google cloud", "cloud"},
    "gcp": {"aws", "azure", "cloud"},
    "azure": {"aws", "gcp", "cloud"},
    "fastapi": {"flask", "django", "express.js", "rest apis", "python"},
    "flask": {"fastapi", "django", "express.js", "python"},
    "django": {"fastapi", "flask", "python"},
    "tableau": {"powerbi", "power bi", "matplotlib", "seaborn", "pandas", "python", "sql", "excel", "alteryx"},
    "powerbi": {"tableau", "matplotlib", "seaborn", "pandas", "python", "sql", "excel"},
    "alteryx": {"python", "pandas", "sql", "tableau", "excel", "etl"},
    "excel": {"sql", "python", "pandas", "data analytics", "spreadsheets"},
    "mongodb": {"redis", "postgresql", "dynamodb", "nosql"},
    "redis": {"memcached", "mongodb", "postgresql"},
}


def _partial_overlap(job_name: str, resume_name: str) -> bool:
    """True if one skill name's words are a subset of the other's (e.g. 'AWS' <-> 'AWS Lambda')."""
    job_words = set(_normalize(job_name).split())
    resume_words = set(_normalize(resume_name).split())
    if not job_words or not resume_words:
        return False
    return job_words.issubset(resume_words) or resume_words.issubset(job_words)


def classify_skill_gaps(resume_skills: list[dict], job_skills: list[dict]) -> dict:
    """
    Returns:
        {
          "strong": [job_skill_name, ...],
          "partial": [job_skill_name, ...],
          "missing": [job_skill_name, ...],
          "transferable": [job_skill_name, ...],
        }
    Every skill name in every list is copied verbatim from either
    resume_skills or job_skills — nothing is generated.
    """
    exact = match_skills(resume_skills, job_skills)
    matched_names = {s["name"] for s in exact["matched"]}
    remaining = exact["missing"]

    partial: list[str] = []
    transferable: list[str] = []
    missing: list[str] = []

    resume_names = [_normalize(s["name"]) for s in resume_skills]

    for job_skill in remaining:
        job_name_norm = _normalize(job_skill["name"])

        if any(_partial_overlap(job_skill["name"], rs["name"]) for rs in resume_skills):
            partial.append(job_skill["name"])
            continue

        related = TRANSFERABLE_SKILL_MAP.get(job_name_norm, set())
        if related and any(rn in related for rn in resume_names):
            transferable.append(job_skill["name"])
            continue

        missing.append(job_skill["name"])

    return {
        "strong": sorted(matched_names),
        "partial": sorted(partial),
        "missing": sorted(missing),
        "transferable": sorted(transferable),
    }
