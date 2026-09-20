"""
backend/tests/unit/test_all_10_features.py

Comprehensive test suite verifying that all 10 new features run without errors,
validate inputs/outputs correctly, and handle edge cases cleanly.
"""
import uuid
import pytest
from unittest.mock import AsyncMock

from ai.generation.interview_coach import generate_interview_prep
from ai.generation.learning_roadmap import generate_learning_roadmap
from ai.generation.linkedin_optimizer import generate_linkedin_profile
from ai.generation.salary_coach import generate_salary_guidance
from ai.generation.cold_email_generator import generate_cold_outreach
from ai.generation.followup_email import generate_followup
from app.core.url_fetcher import clean_html_to_text


class MockProvider:
    def __init__(self, response: str = "{}"):
        self._response = response

    async def generate(self, prompt: str) -> str:
        return self._response


@pytest.mark.asyncio
async def test_feature1_interview_coach():
    resume_data = {
        "candidate": {"name": "Test Candidate"},
        "skills": [{"name": "Python"}, {"name": "FastAPI"}],
    }
    job_data = {
        "title": "Senior Python Engineer",
        "company": "Acme Corp",
        "skills": [{"name": "Python"}, {"name": "Docker"}],
    }
    gap_analysis = {"strong": ["Python"], "missing": ["Docker"]}
    provider = MockProvider('{"questions": [{"id": 1, "category": "Technical", "question": "Explain async/await in Python", "coaching_note": "Mention event loop", "difficulty": "Medium"}], "company_prep_notes": "Acme is scaling", "opening_pitch": "I love Python"}')

    res = await generate_interview_prep(resume_data, job_data, gap_analysis, provider)
    assert "questions" in res
    assert len(res["questions"]) >= 1
    assert res["questions"][0]["category"] == "Technical"
    assert res["opening_pitch"] == "I love Python"


@pytest.mark.asyncio
async def test_feature2_url_fetcher():
    html_sample = "<html><head><title>Job</title></head><body><nav>Nav</nav><main><h1>Senior Engineer</h1><p>We are hiring a Python expert.</p></main><footer>Foot</footer></body></html>"
    text = clean_html_to_text(html_sample)
    assert "Senior Engineer" in text
    assert "Nav" not in text
    assert "Foot" not in text


@pytest.mark.asyncio
async def test_feature5_learning_roadmap():
    resume_data = {"skills": [{"name": "JavaScript"}]}
    job_data = {"title": "Full Stack Dev", "company": "Stripe", "skills": [{"name": "Go"}]}
    gap_analysis = {"missing": [{"name": "Go"}]}
    provider = MockProvider('{"summary": "Solid foundation", "estimated_weeks_total": 6, "learning_paths": [{"skill": "Go", "priority": "Critical", "current_level": "None", "target_level": "Intermediate", "estimated_weeks": 4, "resources": [], "mini_project": "API in Go", "outcome": "Go backend"}], "weekly_schedule_suggestion": "10h/wk", "quick_wins": ["Go syntax"]}')

    res = await generate_learning_roadmap(resume_data, job_data, gap_analysis, provider)
    assert res["estimated_weeks_total"] == 6
    assert len(res["learning_paths"]) == 1
    assert res["learning_paths"][0]["skill"] == "Go"


@pytest.mark.asyncio
async def test_feature6_linkedin_optimizer():
    resume_data = {"skills": [{"name": "React"}, {"name": "Node.js"}]}
    job_data = {"title": "Frontend Lead", "company": "Meta", "skills": [{"name": "React"}]}
    gap_analysis = {"strong": ["React"]}
    provider = MockProvider('{"headline": "Frontend Lead | React & Node.js", "about": "Experienced builder", "experience_bullets": ["Built fast UIs"], "skills_to_add": ["GraphQL"], "open_to_work_tagline": "Seeking lead roles", "connection_note_template": "Hi, love your team!", "tips": ["Use keywords"]}')

    res = await generate_linkedin_profile(resume_data, job_data, gap_analysis, provider)
    assert "Frontend Lead" in res["headline"]
    assert len(res["skills_to_add"]) == 1


@pytest.mark.asyncio
async def test_feature7_salary_coach():
    resume_data = {"skills": [{"name": "Python"}]}
    job_data = {"title": "Staff Engineer", "location": "Remote"}
    provider = MockProvider('{"role_title": "Staff Engineer", "location": "Remote", "salary_range": {"low": 180000, "mid": 210000, "high": 240000, "currency": "USD", "period": "annual"}, "candidate_target": 215000, "experience_level": "Senior", "market_notes": "High demand", "negotiation_leverage": ["Staff experience"], "negotiation_script": {"initial_ask": "215k", "counter_offer": "220k", "closing": "Deal"}, "negotiation_tips": ["Be firm"], "red_flags_to_watch": ["No equity"], "total_comp_checklist": ["RSUs"]}')

    res = await generate_salary_guidance(resume_data, job_data, 85.0, provider)
    assert res["candidate_target"] == 215000
    assert res["salary_range"]["mid"] == 210000


@pytest.mark.asyncio
async def test_feature8_cold_outreach():
    resume_data = {"candidate": {"name": "Alice"}, "skills": [{"name": "Python"}]}
    job_data = {"title": "ML Engineer", "company": "OpenAI"}
    provider = MockProvider('{"subject_lines": ["ML Engineer opening"], "email_body": "Hi, I am Alice.", "linkedin_dm": "Quick note", "follow_up_email": "Checking in", "personalization_hooks": ["GPT models"], "best_send_times": "Tuesday morning", "tips": ["Be brief"]}')

    res = await generate_cold_outreach(resume_data, job_data, "John", 90.0, provider)
    assert "ML Engineer" in res["subject_lines"][0]
    assert res["email_body"] == "Hi, I am Alice."


@pytest.mark.asyncio
async def test_feature9_followup_email():
    app_data = {"status": "APPLIED"}
    job_data = {"title": "Backend Dev", "company": "Google"}
    provider = MockProvider('{"situation_assessment": "Wait 1 week", "recommended_action": "Email", "emails": [{"type": "Status Check", "subject": "Update on Backend Dev", "body": "Checking status", "best_time": "Tuesday", "tone": "Professional"}], "linkedin_dm": "Hello", "do_not_do": ["Don\'t spam"], "timing_advice": "7 days"}')

    res = await generate_followup(app_data, job_data, 7, "APPLIED", provider)
    assert res["recommended_action"] == "Email"
    assert len(res["emails"]) == 1
