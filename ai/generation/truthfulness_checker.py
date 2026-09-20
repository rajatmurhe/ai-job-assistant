"""
ai/generation/truthfulness_checker.py

Deterministic, LLM-free post-generation checks enforcing the
truthfulness contract (section 16, Golden Rule 1: NEVER FABRICATE).
Every document generator (resume_optimizer, cover_letter_generator,
email_generator) runs its output through this before returning it.
On any violation, callers raise TruthfulnessViolationError — this
module never silently strips or "fixes" a violation, it only detects
and reports (Golden Rule 9: fail loudly).

Not a substitute for careful prompting — a second, independent line
of defense in case the LLM ignores the truthfulness instructions in
the prompt.
"""
from __future__ import annotations

import re

_METRIC_RE = re.compile(
    r"""
    (?:\$\s?\d[\d,]*(?:\.\d+)?[kKmMbB]?)      # dollar amounts: $40k, $1.2M
    | (?:\d+(?:\.\d+)?\s?%)                   # percentages: 40%, 12.5%
    | (?:\b\d+(?:\.\d+)?[xX]\b)               # multipliers: 3x, 2.5x
    """,
    re.VERBOSE,
)


def _resume_source_text(resume_data: dict) -> str:
    """Flattens every string value in resume_data into one lowercase blob for substring checks."""
    parts: list[str] = []

    def _walk(value):
        if isinstance(value, str):
            parts.append(value)
        elif isinstance(value, dict):
            for v in value.values():
                _walk(v)
        elif isinstance(value, list):
            for v in value:
                _walk(v)

    _walk(resume_data)
    return " ".join(parts).lower()


def check_no_invented_metrics(generated_text: str, resume_data: dict) -> list[dict]:
    """
    Every percentage / dollar figure / multiplier in generated_text
    must appear verbatim somewhere in the source resume. A metric
    that appears in the generated doc but nowhere in the source is a
    fabricated (or at minimum, unverifiable) number.
    """
    source = _resume_source_text(resume_data)
    violations = []
    for match in _METRIC_RE.finditer(generated_text):
        metric = match.group().strip()
        normalized = metric.lower().replace(" ", "")
        if normalized not in source.replace(" ", ""):
            violations.append({"type": "metric", "value": metric})
    return violations


def _contains_word(text: str, target: str) -> bool:
    """Matches `target` as a distinct word/token rather than a raw substring (e.g. avoid 'excel' in 'excellent')."""
    if not target or not text:
        return False
    pattern = rf'(?:\b|_){re.escape(target.strip())}(?:\b|_)'
    return bool(re.search(pattern, text, re.IGNORECASE))


def check_no_invented_skills(generated_text: str, resume_data: dict, candidate_skills: list[str]) -> list[dict]:
    """
    Flags candidate_skills (skills missing from source resume) that appear as
    distinct tokens in generated_text.
    """
    resume_skill_names = {s["name"].lower() for s in resume_data.get("skills", [])}

    violations = []
    for skill in candidate_skills:
        if skill.lower() in resume_skill_names:
            continue  # legitimately on the resume; not a fabrication
        if _contains_word(generated_text, skill):
            violations.append({"type": "skill", "value": skill})
    return violations


def check_no_invented_companies(generated_text: str, resume_data: dict, candidate_companies: list[str]) -> list[dict]:
    """
    Checks candidate_companies against the resume's actual employer list.
    """
    resume_companies = {e["company"].lower() for e in resume_data.get("experience", [])}

    violations = []
    for company in candidate_companies:
        if company.lower() in resume_companies:
            continue
        if _contains_word(generated_text, company):
            violations.append({"type": "company", "value": company})
    return violations


def check_keywords_added_only_if_present_in_source(
    generated_text: str, resume_data: dict, added_keywords: list[str]
) -> list[dict]:
    """
    Verifies that ATS keywords added appear as distinct words and are traceable to source.
    """
    source = _resume_source_text(resume_data)

    violations = []
    for kw in added_keywords:
        if _contains_word(generated_text, kw) and not _contains_word(source, kw):
            violations.append({"type": "keyword", "value": kw})
    return violations


def run_all_checks(
    generated_text: str,
    resume_data: dict,
    *,
    candidate_skills: list[str] | None = None,
    candidate_companies: list[str] | None = None,
    added_keywords: list[str] | None = None,
) -> list[dict]:
    violations: list[dict] = []
    violations += check_no_invented_metrics(generated_text, resume_data)
    if candidate_skills:
        violations += check_no_invented_skills(generated_text, resume_data, candidate_skills)
    if candidate_companies:
        violations += check_no_invented_companies(generated_text, resume_data, candidate_companies)
    if added_keywords:
        violations += check_keywords_added_only_if_present_in_source(generated_text, resume_data, added_keywords)
    return violations
