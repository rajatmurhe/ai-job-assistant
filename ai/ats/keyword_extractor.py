"""
ai/ats/keyword_extractor.py

Extracts ATS-relevant keywords from job_data (structured JD). ATS
keywords are simply the union of every job skill name plus any
explicit `ats_keywords` the JD extractor (Module 4) pulled out —
kept as a separate, tiny module so ats_analyzer.py stays focused on
coverage/formatting logic rather than "what counts as a keyword".
"""
from __future__ import annotations


def extract_ats_keywords(job_data: dict) -> list[str]:
    keywords: set[str] = set()

    for skill in job_data.get("skills", []) or []:
        name = skill.get("name")
        if name:
            keywords.add(name.strip())

    for kw in job_data.get("ats_keywords", []) or []:
        if kw:
            keywords.add(kw.strip())

    for req in job_data.get("requirements", []) or []:
        if req.get("requirement_type") == "certification" and req.get("value"):
            keywords.add(req["value"].strip())

    return sorted(keywords, key=str.lower)
