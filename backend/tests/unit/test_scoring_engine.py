"""
backend/tests/unit/test_scoring_engine.py

Tests the deterministic scoring engine (ai/matching/scoring_engine.py).
"""
from ai.matching.scoring_engine import ScoringWeights, calculate_score, recommendation_for_score

WEIGHTS = ScoringWeights(
    required_skills=0.30, preferred_skills=0.15, experience=0.15,
    education=0.10, projects=0.10, semantic=0.10, ats_keywords=0.10,
)


def test_weights_sum_to_one():
    assert WEIGHTS.sum() == 1.0


def test_perfect_match_returns_100():
    resume_skills = [{"name": "Python"}, {"name": "SQL"}]
    job_skills = [
        {"name": "Python", "importance": "MANDATORY"},
        {"name": "SQL", "importance": "MANDATORY"},
    ]
    result = calculate_score(
        resume_skills=resume_skills,
        job_skills=job_skills,
        resume_years_experience=5,
        required_years_experience=5,
        resume_education_level="bachelors",
        required_education_level="bachelors",
        resume_project_count=2,
        job_requires_projects=True,
        semantic_score=100,
        ats_keyword_coverage=100,
        weights=WEIGHTS,
    )
    assert result["overall_score"] == 100.0
    assert result["sub_scores"]["required_skills"] == 100.0


def test_zero_match_returns_0():
    resume_skills = [{"name": "Woodworking"}]
    job_skills = [
        {"name": "Python", "importance": "MANDATORY"},
        {"name": "SQL", "importance": "MANDATORY"},
        {"name": "Docker", "importance": "PREFERRED"},
    ]
    result = calculate_score(
        resume_skills=resume_skills,
        job_skills=job_skills,
        resume_years_experience=0,
        required_years_experience=5,
        resume_education_level="none",
        required_education_level="masters",
        resume_project_count=0,
        job_requires_projects=True,
        semantic_score=0,
        ats_keyword_coverage=0,
        weights=WEIGHTS,
    )
    assert result["overall_score"] == 0.0


def test_education_mapping_correct():
    resume_skills, job_skills = [], []
    higher = calculate_score(
        resume_skills=resume_skills, job_skills=job_skills,
        resume_education_level="phd", required_education_level="bachelors",
        weights=WEIGHTS,
    )
    lower = calculate_score(
        resume_skills=resume_skills, job_skills=job_skills,
        resume_education_level="high_school", required_education_level="masters",
        weights=WEIGHTS,
    )
    assert higher["sub_scores"]["education"] == 100.0
    assert lower["sub_scores"]["education"] < 100.0
    assert lower["sub_scores"]["education"] > 0.0


def test_experience_scoring_rules():
    result_meets = calculate_score(
        resume_skills=[], job_skills=[],
        resume_years_experience=6, required_years_experience=5,
        weights=WEIGHTS,
    )
    result_half = calculate_score(
        resume_skills=[], job_skills=[],
        resume_years_experience=2.5, required_years_experience=5,
        weights=WEIGHTS,
    )
    assert result_meets["sub_scores"]["experience"] == 100.0
    assert result_half["sub_scores"]["experience"] == 50.0


def test_llm_cannot_override_score():
    """
    Structural guarantee: calculate_score() takes no LLM-provider
    argument and makes no network/LLM calls — it is a pure function
    of its numeric/list inputs, so nothing downstream can inject a
    different score into it (Golden Rule 3).
    """
    import inspect

    sig = inspect.signature(calculate_score)
    assert "provider" not in sig.parameters
    assert "llm" not in sig.parameters
    # Same inputs -> same output, every time (determinism check).
    kwargs = dict(
        resume_skills=[{"name": "Python"}],
        job_skills=[{"name": "Python", "importance": "MANDATORY"}],
        weights=WEIGHTS,
    )
    assert calculate_score(**kwargs) == calculate_score(**kwargs)


def test_recommendation_mapping():
    assert recommendation_for_score(90, 0) == "STRONGLY_APPLY"
    assert recommendation_for_score(75, 0) == "APPLY"
    assert recommendation_for_score(75, 1) == "APPLY_WITH_CAUTION"
    assert recommendation_for_score(55, 0) == "IMPROVE_FIRST"
    assert recommendation_for_score(20, 0) == "DO_NOT_APPLY"
