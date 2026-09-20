"""Pure-function tests for app/services/matching_service.py date/education helpers (no DB needed)."""
from app.services.matching_service import (
    _estimate_years_experience,
    _highest_education_level,
    _required_education_level,
    _required_years_experience,
)


def test_estimate_years_experience_sums_ranges():
    exp = [
        {"start_date": "Jan 2018", "end_date": "Mar 2021"},
        {"start_date": "2021", "end_date": "Present", "is_current": True},
    ]
    assert _estimate_years_experience(exp) > 0


def test_estimate_years_experience_handles_unparseable_dates():
    exp = [{"start_date": "a while ago", "end_date": "recently"}]
    assert _estimate_years_experience(exp) == 0.0


def test_highest_education_level_masters():
    edu = [{"degree": "Master of Science in Computer Science"}]
    assert _highest_education_level(edu) == "masters"


def test_highest_education_level_none_when_empty():
    assert _highest_education_level([]) == "none"


def test_required_education_level_parses_bachelor():
    reqs = [{"requirement_type": "education", "value": "Bachelor degree required", "importance": "MANDATORY"}]
    assert _required_education_level(reqs) == "bachelors"


def test_required_years_experience_parses_number():
    reqs = [{"requirement_type": "experience", "value": "5+ years of experience", "importance": "MANDATORY"}]
    assert _required_years_experience(reqs, []) == 5.0


def test_required_years_experience_falls_back_to_skills():
    reqs = []
    skills = [{"name": "Python", "importance": "MANDATORY", "years_required": 3}]
    assert _required_years_experience(reqs, skills) == 3.0
