"""
backend/tests/unit/test_tailor_and_interview.py

Unit tests for:
1. 95+ Match & ATS Tailored Resume Engine & PyMuPDF PDF generator
2. Interactive AI Mock Interview Simulator
"""
import fitz
import pytest
from app.services.tailor_service import (
    build_95_plus_tailored_resume,
    generate_ats_pdf_bytes,
)
from app.api.v1.mock_interview import (
    EvaluateAnswerRequest,
    MockInterviewSummaryRequest,
    evaluate_interview_answer,
    complete_mock_interview,
)


def test_build_95_plus_tailored_resume():
    resume_data = {
        "candidate": {
            "name": "Jane Doe",
            "email": "jane.doe@example.com",
            "phone": "+1 555 123 4567",
            "location": "San Francisco, CA",
        },
        "skills": [
            {"name": "Python", "category": "Languages"},
            {"name": "SQL", "category": "Database"},
        ],
        "experience": [
            {
                "title": "Software Engineer",
                "company": "Tech Corp",
                "date_range": "2021 - Present",
                "bullets": ["Developed microservices in Python."],
            }
        ],
        "education": [
            {
                "degree": "B.S. in Computer Science",
                "institution": "State University",
                "date_range": "2017 - 2021",
            }
        ],
    }

    job_data = {
        "title": "Senior AI / Machine Learning Engineer",
        "company": "NextGen AI Labs",
        "skills": [
            {"name": "Python"},
            {"name": "PyTorch"},
            {"name": "FastAPI"},
            {"name": "Kubernetes"},
            {"name": "Vector Databases"},
        ],
        "required_experience_years": 3,
        "required_education_level": "bachelors",
    }

    tailored = build_95_plus_tailored_resume(resume_data, job_data)

    # Assert 95+ scores guaranteed
    assert tailored["verified_match_score"] >= 95.0, (
        f"Expected match score >= 95, got {tailored['verified_match_score']}"
    )
    assert tailored["verified_ats_score"] >= 95.0, (
        f"Expected ATS score >= 95, got {tailored['verified_ats_score']}"
    )

    # Assert candidate and sections
    assert tailored["candidate"]["name"] == "Jane Doe"
    assert "Machine Learning" in tailored["job_title"]
    assert len(tailored["skills"]) >= 5
    # Check all job skills are incorporated
    skill_names = [s["name"] for s in tailored["skills"]]
    assert "PyTorch" in skill_names
    assert "Kubernetes" in skill_names

    # Check STAR experience bullets
    assert len(tailored["experience"]) >= 1
    exp_bullets = tailored["experience"][0]["bullets"]
    assert len(exp_bullets) >= 3
    # Check metrics are present in bullets
    assert any("%" in b or "ms" in b for b in exp_bullets)

    # Check raw_text and markdown_text
    assert "SUMMARY" in tailored["raw_text"]
    assert "TECHNICAL SKILLS" in tailored["raw_text"]
    assert "WORK EXPERIENCE" in tailored["raw_text"]
    assert "# Jane Doe" in tailored["markdown_text"]


def test_generate_ats_pdf_bytes():
    tailored_data = {
        "candidate": {
            "name": "Jane Doe",
            "email": "jane.doe@example.com",
            "phone": "+1 555 123 4567",
            "location": "San Francisco, CA",
        },
        "summary": "Accomplished Senior AI / Machine Learning Engineer with deep expertise in PyTorch and distributed systems.",
        "skills": [
            {"name": "Python"},
            {"name": "PyTorch"},
            {"name": "FastAPI"},
            {"name": "Docker"},
            {"name": "Kubernetes"},
        ],
        "experience": [
            {
                "title": "Senior AI Engineer",
                "company": "Tech Corp",
                "date_range": "2021 - Present",
                "bullets": [
                    "Architected high-throughput inference microservices using FastAPI and Docker, reducing latency by 45%.",
                    "Orchestrated distributed model training pipelines on Kubernetes, improving throughput by 3.2x.",
                ],
            }
        ],
        "projects": [
            {
                "name": "Distributed Vector Search Engine",
                "description": "High-concurrency semantic search engine handling 25M+ vector embeddings.",
                "technologies": ["PyTorch", "FastAPI", "Docker"],
                "bullets": ["Achieved sub-15ms p99 latency under 8,000 req/sec."],
            }
        ],
        "education": [
            {
                "degree": "B.S. in Computer Science",
                "institution": "State University",
                "date_range": "2017 - 2021",
                "achievements": ["Dean's List"],
            }
        ],
    }

    pdf_bytes = generate_ats_pdf_bytes(tailored_data)

    # Verify it starts with standard PDF magic number
    assert pdf_bytes.startswith(b"%PDF-")

    # Verify PyMuPDF can load and render the PDF document
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    assert doc.page_count >= 1
    page = doc[0]
    text = page.get_text()
    assert "JANE DOE" in text
    assert "PROFESSIONAL SUMMARY" in text
    assert "TECHNICAL SKILLS" in text
    assert "PROFESSIONAL EXPERIENCE" in text
    doc.close()


@pytest.mark.asyncio
async def test_mock_interview_evaluation_and_completion():
    class DummyProvider:
        async def generate(self, prompt: str) -> str:
            return """
            {
                "score": 92,
                "star_breakdown": {
                    "situation": "Strong context in distributed inference.",
                    "task": "Clear goal to cut model latency.",
                    "action": "Implemented model quantization and Redis caching.",
                    "result": "Latency dropped 65% with 99.99% uptime."
                },
                "strengths": ["Clear metrics", "Strong technical action verbs"],
                "improvements": ["Mention hardware specifications"],
                "model_answer": "In my previous role, I benchmarked inference throughput and optimized pipelines with ONNX Runtime."
            }
            """

    req = EvaluateAnswerRequest(
        job_title="Senior AI Engineer",
        company="NextGen AI Labs",
        question_id=2,
        question="How do you handle production model latency?",
        category="Core Technical Deep-Dive",
        answer="In our production cluster, we noticed inference spikes during peak traffic. I migrated our PyTorch models to TensorRT and added caching, reducing p99 latency by 65%.",
    )

    eval_result = await evaluate_interview_answer(req, provider=DummyProvider())
    assert eval_result["score"] == 92
    assert "situation" in eval_result["star_breakdown"]
    assert "result" in eval_result["star_breakdown"]
    assert len(eval_result["strengths"]) >= 1

    # Test complete scorecard
    answers = [
        {"score": 92},
        {"score": 88},
        {"score": 95},
        {"score": 90},
    ]
    summary_req = MockInterviewSummaryRequest(
        job_title="Senior AI Engineer",
        company="NextGen AI Labs",
        answers=answers,
    )
    scorecard = await complete_mock_interview(summary_req)
    assert scorecard["overall_readiness_score"] == 91.2
    assert scorecard["recommendation"] == "Strong Hire Candidate"
    assert scorecard["total_questions_answered"] == 4
    assert len(scorecard["final_coaching_notes"]) >= 2
