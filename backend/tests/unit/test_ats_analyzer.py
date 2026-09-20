from ai.ats.ats_analyzer import analyze_ats_compatibility, detect_formatting_issues, keyword_coverage


def test_keyword_coverage_calculation():
    result = keyword_coverage("I have experience with Python and SQL.", ["Python", "SQL", "Rust"])
    assert result["score"] == 66.67
    assert "Python" in result["present"]
    assert "Rust" in result["missing"]


def test_formatting_flags_tables():
    text = "Name | Role | Dates\nAcme | Engineer | 2020 | 2022\nFoo | Bar | 2019 | 2020"
    issues = detect_formatting_issues(text)
    assert "possible_table_detected" in issues


def test_score_breakdown_correct():
    job_data = {
        "skills": [{"name": "Python", "importance": "MANDATORY"}, {"name": "SQL", "importance": "MANDATORY"}],
        "ats_keywords": [],
        "requirements": [],
    }
    resume_text = "Experience\nSkills\nPython developer with SQL background."
    result = analyze_ats_compatibility(resume_text, job_data)
    assert result["keyword_coverage_score"] == 100.0
    assert result["ats_score"] <= 100.0
    assert isinstance(result["formatting_issues"], list)
