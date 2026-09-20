"""
ai/ats/ats_analyzer.py

ATS compatibility analysis (section 15 of the master doc):
  1. Keyword coverage — % of JD ATS keywords present (case-insensitive,
     substring-aware) somewhere in the resume's raw text.
  2. Formatting flags — patterns known to break ATS parsers: tables,
     multi-column layouts (approximated via raw_text heuristics since
     true layout detection needs the original PDF, not just text),
     images/icons instead of text bullets, non-standard section headers.

Deterministic and LLM-free by design — ATS software itself is not an
LLM, so an ATS *compatibility* check should mirror that mechanical,
keyword/format-matching nature rather than a semantic one.
"""
from __future__ import annotations

import re

STANDARD_SECTION_HEADERS = {
    "experience", "work experience", "employment", "education",
    "skills", "summary", "projects", "certifications",
}


def _keyword_in_text(keyword: str, text_lower: str) -> bool:
    return keyword.lower() in text_lower


def keyword_coverage(resume_raw_text: str, ats_keywords: list[str]) -> dict:
    if not ats_keywords:
        return {"score": 100.0, "present": [], "missing": []}

    text_lower = resume_raw_text.lower()
    present = [kw for kw in ats_keywords if _keyword_in_text(kw, text_lower)]
    missing = [kw for kw in ats_keywords if kw not in present]

    score = round(100 * len(present) / len(ats_keywords), 2)
    return {"score": score, "present": present, "missing": missing}


def detect_formatting_issues(resume_raw_text: str) -> list[str]:
    """
    Heuristic formatting-issue flags based on the extracted text.
    Table/multi-column detection is approximate (extracted text loses
    layout), but " | " separators and heavy whitespace-column
    alignment are strong signals a table was flattened badly.
    """
    issues: list[str] = []

    if resume_raw_text.count(" | ") > 3:
        issues.append("possible_table_detected")

    if re.search(r" {4,}\S+ {4,}\S+", resume_raw_text):
        issues.append("possible_multi_column_layout")

    lines = [l.strip() for l in resume_raw_text.split("\n") if l.strip()]
    header_lines = {l.lower().rstrip(":") for l in lines if len(l.split()) <= 4}
    if not (header_lines & STANDARD_SECTION_HEADERS):
        issues.append("no_standard_section_headers_found")

    if re.search(r"[\uf000-\uf8ff]", resume_raw_text):
        issues.append("icon_glyphs_detected_instead_of_text")

    return issues


def analyze_ats_compatibility(resume_raw_text: str, job_data: dict) -> dict:
    from .keyword_extractor import extract_ats_keywords

    keywords = extract_ats_keywords(job_data)
    coverage = keyword_coverage(resume_raw_text, keywords)
    formatting_issues = detect_formatting_issues(resume_raw_text)

    formatting_penalty = min(30.0, len(formatting_issues) * 10.0)
    ats_score = round(max(0.0, coverage["score"] - formatting_penalty), 2)

    return {
        "ats_score": ats_score,
        "keyword_coverage_score": coverage["score"],
        "keywords_present": coverage["present"],
        "keywords_missing": coverage["missing"],
        "formatting_issues": formatting_issues,
    }
