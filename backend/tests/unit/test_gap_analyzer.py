from ai.matching.gap_analyzer import classify_skill_gaps


def test_missing_skill_classified_correctly():
    resume = [{"name": "Python"}]
    job = [{"name": "Rust", "importance": "MANDATORY"}]
    result = classify_skill_gaps(resume, job)
    assert "Rust" in result["missing"]
    assert result["strong"] == []


def test_partial_skill_classified_correctly():
    resume = [{"name": "AWS"}]
    job = [{"name": "AWS Lambda", "importance": "MANDATORY"}]
    result = classify_skill_gaps(resume, job)
    assert "AWS Lambda" in result["partial"]


def test_transferable_skill_identified():
    resume = [{"name": "Vue"}]
    job = [{"name": "React", "importance": "PREFERRED"}]
    result = classify_skill_gaps(resume, job)
    assert "React" in result["transferable"]


def test_no_fabrication_in_output():
    """
    Every skill name in every output bucket must come verbatim from
    either the resume_skills or job_skills input — the analyzer must
    never invent a new skill name (Golden Rule 1).
    """
    resume = [{"name": "Python"}, {"name": "Vue"}]
    job = [
        {"name": "Rust", "importance": "MANDATORY"},
        {"name": "React", "importance": "PREFERRED"},
        {"name": "Python", "importance": "MANDATORY"},
    ]
    result = classify_skill_gaps(resume, job)
    all_output_names = set(result["strong"]) | set(result["partial"]) | set(result["missing"]) | set(result["transferable"])
    allowed_names = {s["name"] for s in resume} | {s["name"] for s in job}
    assert all_output_names.issubset(allowed_names)
