"""
backend/tests/unit/test_document_generator.py

Tests the deterministic truthfulness checker
(ai/generation/truthfulness_checker.py) that every document generator
runs its LLM output through. These tests don't call an LLM at all —
they verify the checker itself catches fabrication correctly, since
that's the piece we can fully control and test without live services.
"""
from ai.generation.truthfulness_checker import (
    check_keywords_added_only_if_present_in_source,
    check_no_invented_companies,
    check_no_invented_metrics,
    check_no_invented_skills,
)

RESUME_DATA = {
    "candidate": {"name": "Jane Doe"},
    "skills": [{"name": "Python"}, {"name": "SQL"}],
    "experience": [
        {"company": "Acme Corp", "title": "Engineer", "bullets": ["Increased throughput by 40%"]}
    ],
}


def test_no_skills_invented():
    # Generated text stays within resume's real skills -> no violation.
    text = "Experienced Python and SQL developer."
    assert check_no_invented_skills(text, RESUME_DATA, candidate_skills=["Rust", "Go"]) == []

    # Generated text adds a skill the candidate never had -> violation.
    text_with_fabrication = "Experienced Python, SQL, and Rust developer."
    violations = check_no_invented_skills(text_with_fabrication, RESUME_DATA, candidate_skills=["Rust"])
    assert len(violations) == 1
    assert violations[0]["value"] == "Rust"


def test_no_companies_invented():
    text = "Worked as an Engineer at Acme Corp."
    assert check_no_invented_companies(text, RESUME_DATA, candidate_companies=["Globex"]) == []

    text_with_fabrication = "Worked as an Engineer at Acme Corp and Globex."
    violations = check_no_invented_companies(text_with_fabrication, RESUME_DATA, candidate_companies=["Globex"])
    assert len(violations) == 1
    assert violations[0]["value"] == "Globex"


def test_no_metrics_invented():
    # 40% is real (appears in the source resume bullet) -> no violation.
    text = "Increased throughput by 40% at Acme Corp."
    assert check_no_invented_metrics(text, RESUME_DATA) == []

    # 90% never appeared in the source -> flagged as an invented metric.
    text_with_fabrication = "Increased throughput by 90% at Acme Corp."
    violations = check_no_invented_metrics(text_with_fabrication, RESUME_DATA)
    assert len(violations) == 1
    assert "90%" in violations[0]["value"]


def test_keywords_added_only_if_present_in_source():
    # "Python" is genuinely on the resume -> adding it as a keyword is fine.
    assert check_keywords_added_only_if_present_in_source(
        "Skilled in Python.", RESUME_DATA, added_keywords=["Python"]
    ) == []

    # "Kubernetes" is not anywhere in the source resume -> flagged.
    violations = check_keywords_added_only_if_present_in_source(
        "Skilled in Python and Kubernetes.", RESUME_DATA, added_keywords=["Kubernetes"]
    )
    assert len(violations) == 1
    assert violations[0]["value"] == "Kubernetes"
