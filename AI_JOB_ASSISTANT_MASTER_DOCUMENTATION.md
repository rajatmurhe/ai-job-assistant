# AI JOB ASSISTANT — MASTER DOCUMENTATION
# Complete Architecture, Stack, Modules, Folder Structure, and Development Roadmap
# Last updated: August 2026
# Author: Vasu Desai

---

## TABLE OF CONTENTS

1.  System Overview
2.  Core Objectives (All 20)
3.  Architecture Decision
4.  Technology Selection — Component-by-Component Analysis
5.  Stack Combinations (A through E)
6.  Final Recommended Stack (Stack B)
7.  Complete Folder Structure (Frontend + Backend + AI + Automation)
8.  Database Schema (All Tables)
9.  Module-by-Module Development Roadmap
10. Module Detail Sheets (Module 1–18)
11. API Endpoint Design
12. LLM Provider Abstraction
13. Prompt Files Reference
14. Scoring Engine Logic
15. ATS Analysis Logic
16. Document Generation Rules (Truthfulness Contract)
17. Application Tracker FSM
18. n8n Workflow Reference
19. Environment Variables (.env.example)
20. Docker Compose Reference
21. Testing Strategy
22. Security & Privacy Rules
23. Observability & Logging
24. Future Extensions
25. Golden Rules (Never Violate)

---

## 1. SYSTEM OVERVIEW

The AI Job Assistant is a production-quality, AI-powered job application copilot.

It accepts a user's resume and a job description, performs deep analysis using a combination of
deterministic algorithms and LLM reasoning, produces ATS-optimized documents, tracks all
applications, and automates outreach.

It is NOT a resume faker. It is NOT a fabrication engine. It restructures, optimizes, and
articulates what the candidate already has — and honestly identifies what they lack.

Final user experience:

    Upload Resume
          ↓
    Paste Job Description
          ↓
    Analyze Job
          ↓
    Analyze Resume
          ↓
    Compare Resume ↔ JD
          ↓
    Calculate Match Score (deterministic + semantic)
          ↓
    Identify Skill Gaps
          ↓
    ATS Compatibility Analysis
          ↓
    Generate Tailored Resume (truthful only)
          ↓
    Generate Cover Letter
          ↓
    Generate Application Email
          ↓
    Generate Full Report
          ↓
    Human Reviews & Approves
          ↓
    Send Email
          ↓
    Track Application in DB + Google Sheets
          ↓
    Schedule Follow-up

---

## 2. CORE OBJECTIVES (ALL 20)

01. Accept user's resume (PDF, DOCX, TXT)
02. Accept or retrieve a Job Description (pasted text or URL)
03. Extract and clean the JD
04. Analyze the JD using an LLM (structured output)
05. Parse the resume (structured output)
06. Compare resume against JD (deterministic + semantic)
07. Calculate an explainable, weighted job-match score
08. Identify missing skills and experience gaps
09. Identify matching skills and strengths
10. Identify ATS keywords missing from the resume
11. Generate ATS-optimized resume — ONLY from truthful source information
12. Generate personalized cover letter
13. Generate personalized application email
14. Produce detailed analysis report
15. Send report via email (Gmail API)
16. Track application in database AND Google Sheets
17. Maintain application status (FSM with defined states)
18. Store structured resume information for future reuse
19. Allow future applications to reuse previously extracted data
20. Provide logs, error handling, validation, and retry mechanisms

---

## 3. ARCHITECTURE DECISION

Architecture type: MODULAR MONOLITH (single FastAPI backend, internally structured by module)

Reason for modular monolith over microservices:
- Single developer build
- Easier to test end-to-end
- One Docker service for the backend
- No network latency between services
- Can be split later when scale demands it

n8n sits OUTSIDE the backend as the orchestration layer.
It calls backend API endpoints via HTTP nodes.
Backend never knows about n8n internally.

Visual architecture:

    ┌─────────────────────────────┐
    │      Next.js Frontend       │
    │  Dashboard / Upload / UI    │
    └──────────────┬──────────────┘
                   │ REST / WebSocket
                   ▼
    ┌─────────────────────────────┐
    │     FastAPI Backend         │
    │   (Modular Monolith)        │
    │                             │
    │  /api/v1/resume             │
    │  /api/v1/jobs               │
    │  /api/v1/match              │
    │  /api/v1/generate           │
    │  /api/v1/applications       │
    │  /api/v1/reports            │
    └──────┬──────────────┬───────┘
           │              │
    ┌──────▼──────┐  ┌────▼──────────────┐
    │ PostgreSQL  │  │  LLM Provider      │
    │ + pgvector  │  │  Gemini / Ollama   │
    └─────────────┘  └───────────────────┘
           │              │
           └──────┬───────┘
                  ▼
    ┌─────────────────────────────┐
    │    n8n (Self-hosted)        │
    │    Automation Engine        │
    └──────────┬──────────────────┘
               │
    ┌──────────┼──────────┐
    ▼          ▼          ▼
 Gmail API  G. Sheets  Webhooks

---

## 4. TECHNOLOGY SELECTION — COMPONENT-BY-COMPONENT

### BACKEND

| Technology     | OSS?         | Free? | Local? | Notes                                          |
|----------------|--------------|-------|--------|------------------------------------------------|
| FastAPI        | MIT          | Yes   | Yes    | Best AI/ML ecosystem; async; auto OpenAPI docs |
| Node/Express   | MIT          | Yes   | Yes    | Weaker AI/ML library support                   |
| Django         | BSD          | Yes   | Yes    | Heavy; ORM OK but over-structured here         |
| Flask          | BSD          | Yes   | Yes    | Too minimal for production                     |

WINNER: FastAPI (Python 3.11+)

---

### FRONTEND

| Technology | OSS?    | Free? | Local? | Notes                                      |
|------------|---------|-------|--------|--------------------------------------------|
| Next.js    | MIT     | Yes   | Yes    | SSR; file routing; React ecosystem; deploy |
| SvelteKit  | MIT     | Yes   | Yes    | Lighter but smaller ecosystem              |
| Streamlit  | Apache  | Yes   | Yes    | Fastest prototype; not production-quality  |
| Vue/Nuxt   | MIT     | Yes   | Yes    | Fine; smaller ecosystem                    |

WINNER: Next.js 14+ with Tailwind CSS + shadcn/ui

---

### LLM

| Technology              | OSS?         | Free?             | Local? | Notes                               |
|-------------------------|--------------|-------------------|--------|-------------------------------------|
| Gemini 2.0 Flash        | Proprietary  | Yes (1M tok/day)  | No     | Excellent structured output quality |
| Ollama + Qwen2.5-14B    | MIT          | Yes               | Yes    | Fully local; good for privacy       |
| Ollama + Qwen2.5-7B     | MIT          | Yes               | Yes    | Lower RAM; slightly weaker quality  |
| Groq + Llama 3.3        | Source avail | Yes (rate limited)| No     | Fast inference; limited free tier   |
| OpenAI GPT-4o-mini      | Proprietary  | No                | No     | Costs money                         |

WINNER: Gemini 2.0 Flash (primary) + Ollama as local fallback
Provider abstraction handles both — switchable via .env

---

### EMBEDDINGS

| Technology                    | OSS?    | Free? | Local? | Notes                             |
|-------------------------------|---------|-------|--------|-----------------------------------|
| nomic-embed-text (via Ollama) | Apache  | Yes   | Yes    | 768-dim; excellent quality; local |
| sentence-transformers         | Apache  | Yes   | Yes    | Pure Python; no Ollama needed     |
| Gemini text-embedding-004     | Prop.   | Yes (limited) | No | 768-dim; cloud only          |
| OpenAI text-embedding-3-small | Prop.   | No    | No     | Paid                              |

WINNER: nomic-embed-text via Ollama (local, no API calls, no cost)

---

### VECTOR DATABASE

| Technology       | OSS?    | Free? | Local? | Notes                                       |
|------------------|---------|-------|--------|---------------------------------------------|
| pgvector         | MIT     | Yes   | Yes    | Postgres extension; eliminates extra service|
| ChromaDB         | Apache  | Yes   | Yes    | Easy; but extra Docker service              |
| Qdrant           | Apache  | Yes   | Yes    | Production-grade; heavier                  |
| FAISS            | MIT     | Yes   | Yes    | Library only; no server; no persistence    |
| LanceDB          | Apache  | Yes   | Yes    | Good; less mature ecosystem                 |

WINNER: pgvector (same Postgres instance; sufficient for < 1M vectors at this scale)

---

### SQL DATABASE

| Technology  | OSS?               | Free? | Local? | Notes                                 |
|-------------|---------------------|-------|--------|---------------------------------------|
| PostgreSQL  | PostgreSQL License  | Yes   | Yes    | Standard; pgvector support; prod-ready|
| SQLite      | Public Domain       | Yes   | Yes    | Zero-config; no vector support        |
| Supabase    | Apache (self-host)  | Yes   | Yes    | Managed Postgres; adds BaaS overhead  |
| DuckDB      | MIT                 | Yes   | Yes    | Analytical; not ideal for OLTP        |

WINNER: PostgreSQL 16 with pgvector extension

---

### RESUME / DOCUMENT PARSER

| Technology    | OSS?   | Free? | Local? | Notes                              |
|---------------|--------|-------|--------|------------------------------------|
| PyMuPDF       | AGPL   | Yes   | Yes    | Best PDF text extraction quality   |
| pdfplumber    | MIT    | Yes   | Yes    | Good for tables; slightly slower   |
| python-docx   | MIT    | Yes   | Yes    | Standard DOCX parsing              |
| pypdf         | BSD    | Yes   | Yes    | Pure Python; weaker extraction     |
| Unstructured  | Apache | Yes   | Yes    | Handles mixed formats; heavy       |

WINNER: PyMuPDF (PDF) + python-docx (DOCX) — best quality, lightweight

---

### AUTOMATION / ORCHESTRATION

| Technology       | OSS?       | Free?      | Local? | Notes                                 |
|------------------|------------|------------|--------|---------------------------------------|
| n8n              | Fair-code* | Yes (self) | Yes    | Visual; Gmail/Sheets nodes built-in   |
| Prefect          | Apache     | Yes        | Yes    | Python-native; data pipeline focus    |
| Airflow          | Apache     | Yes        | Yes    | Heavy; overkill here                  |
| Celery + Redis   | BSD        | Yes        | Yes    | Python task queue; no visual UI       |
| Pure Python      | N/A        | Yes        | Yes    | Simple; harder to maintain at scale   |

WINNER: n8n (self-hosted)

*n8n License Note:
n8n uses a "Sustainable Use License" (fair-code model).
- Free to self-host for personal and internal business use
- NOT open source by OSI definition
- Commercial redistribution requires enterprise license
- For personal portfolio/job application use: fully free, no restrictions

---

### EMAIL

| Technology      | OSS?      | Free?         | Local? | Notes                          |
|-----------------|-----------|---------------|--------|--------------------------------|
| Gmail API       | Prop.     | Yes (personal)| No     | OAuth 2.0; n8n has native node |
| SMTP (Gmail)    | Protocol  | Yes           | No     | Simpler; less secure than OAuth|
| Mailhog         | MIT       | Yes           | Yes    | Local SMTP trap for dev        |
| SendGrid        | Prop.     | Yes (100/day) | No     | Overkill for personal use      |

WINNER: Gmail API (production) + Mailhog (local development)

---

### STORAGE

| Technology       | OSS?   | Free? | Local? | Notes                         |
|------------------|--------|-------|--------|-------------------------------|
| Local filesystem | N/A    | Yes   | Yes    | Simple; sufficient for 1 user |
| MinIO            | AGPL   | Yes   | Yes    | S3-compatible; extra service  |
| AWS S3           | Prop.  | No    | No     | Overkill; costs money         |

WINNER: Local filesystem (path abstraction allows MinIO swap later)

---

### AUTHENTICATION

| Technology    | OSS?   | Free? | Local? | Notes                            |
|---------------|--------|-------|--------|----------------------------------|
| FastAPI-Users | MIT    | Yes   | Yes    | JWT + refresh; async; Pydantic v2|
| No auth       | N/A    | Yes   | Yes    | Valid for personal/local use     |
| Auth0         | Prop.  | Yes (7500 users) | No | Cloud dependency         |

WINNER: No auth for Phase 1 (personal tool) → FastAPI-Users added in Phase 2

---

### TESTING

| Technology    | OSS?   | Free? | Local? | Notes                         |
|---------------|--------|-------|--------|-------------------------------|
| pytest        | MIT    | Yes   | Yes    | Standard Python testing       |
| httpx         | BSD    | Yes   | Yes    | FastAPI async test client     |
| Playwright    | Apache | Yes   | Yes    | E2E browser testing           |
| factory-boy   | MIT    | Yes   | Yes    | Test data / fixtures          |

WINNER: pytest + httpx + Playwright (E2E)

---

### MONITORING / OBSERVABILITY

| Technology          | OSS?   | Free? | Local? | Notes                          |
|---------------------|--------|-------|--------|--------------------------------|
| structlog           | MIT    | Yes   | Yes    | Structured JSON logs; minimal  |
| loguru              | MIT    | Yes   | Yes    | Simpler; less structured       |
| Prometheus + Grafana| Apache | Yes   | Yes    | Heavy; overkill for this scale |
| OpenTelemetry       | Apache | Yes   | Yes    | Future-proof; moderate setup   |

WINNER: structlog (sufficient; zero operational overhead)

---

### CONTAINERS

| Technology     | OSS?   | Free? | Local? | Notes                  |
|----------------|--------|-------|--------|------------------------|
| Docker Compose | Apache | Yes   | Yes    | Simple multi-service   |
| Kubernetes     | Apache | Yes   | Yes    | Massive overkill here  |
| Podman         | Apache | Yes   | Yes    | Docker alternative     |

WINNER: Docker Compose

---

## 5. STACK COMBINATIONS (A THROUGH E)

### STACK A — Maximum Open Source (Local AI First)

| Component        | Technology                     |
|------------------|--------------------------------|
| Backend          | FastAPI                        |
| Frontend         | Next.js                        |
| LLM              | Ollama + Qwen2.5-14B           |
| Embeddings       | nomic-embed-text (Ollama)      |
| Vector + SQL DB  | PostgreSQL + pgvector          |
| Automation       | n8n (self-hosted)              |
| Email            | SMTP + Mailhog                 |
| Storage          | Local filesystem               |
| Resume Parser    | PyMuPDF + python-docx          |
| Testing          | pytest + httpx                 |
| Monitoring       | structlog                      |
| Container        | Docker Compose                 |

Pros: No API keys; full privacy; works offline; zero running cost
Cons: Requires GPU/RAM for 14B model; Qwen2.5-7B is fallback for weaker hardware

---

### STACK B — Best Free Hybrid (RECOMMENDED)

| Component        | Technology                           |
|------------------|--------------------------------------|
| Backend          | FastAPI                              |
| Frontend         | Next.js + Tailwind + shadcn/ui       |
| LLM (primary)    | Gemini 2.0 Flash                     |
| LLM (fallback)   | Ollama + Qwen2.5-7B                  |
| Embeddings       | nomic-embed-text (Ollama)            |
| Vector + SQL DB  | PostgreSQL + pgvector                |
| Automation       | n8n (self-hosted)                    |
| Email            | Gmail API + Mailhog (dev)            |
| Storage          | Local filesystem                     |
| Resume Parser    | PyMuPDF + python-docx                |
| Testing          | pytest + httpx + Playwright          |
| Monitoring       | structlog                            |
| Container        | Docker Compose                       |

Pros:
- Gemini Flash delivers best structured JSON extraction quality
- Ollama fallback preserves privacy/offline option
- pgvector eliminates separate vector DB service
- Gmail node is native in n8n
- Most balanced between ease of use and quality

Cons:
- Gemini requires Google API key (free)
- Gmail API OAuth setup has initial friction

---

### STACK C — Lightweight / Rapid Start

| Component        | Technology                    |
|------------------|-------------------------------|
| Backend          | FastAPI                       |
| Frontend         | Streamlit                     |
| LLM              | Gemini 2.0 Flash              |
| Embeddings       | sentence-transformers         |
| Vector DB        | ChromaDB                      |
| SQL DB           | SQLite                        |
| Automation       | Python scripts (no n8n)       |
| Email            | SMTP (Gmail SMTP)             |
| Storage          | Local filesystem              |
| Resume Parser    | PyMuPDF + python-docx         |
| Testing          | pytest                        |
| Monitoring       | structlog                     |
| Container        | None (venv only)              |

Pros: Fastest to run; fewest dependencies
Cons: Streamlit not production-quality UI; SQLite no native vectors; hard to extend

---

### STACK D — Production-Oriented

| Component        | Technology                           |
|------------------|--------------------------------------|
| Backend          | FastAPI                              |
| Frontend         | Next.js + Tailwind                   |
| LLM              | Gemini 2.0 Flash + Ollama            |
| Embeddings       | nomic-embed-text                     |
| Vector + SQL DB  | PostgreSQL + pgvector                |
| Automation       | n8n                                  |
| Auth             | FastAPI-Users + JWT                  |
| Email            | Gmail API                            |
| Storage          | MinIO (S3-compatible)                |
| Resume Parser    | PyMuPDF + python-docx                |
| Testing          | pytest + httpx + Playwright          |
| Monitoring       | structlog + request tracing          |
| Container        | Docker Compose                       |

Pros: Multi-user ready; S3-compatible storage; full auth; portfolio-grade
Cons: Most complex; MinIO adds Docker service; auth overhead for single user

---

### STACK E — n8n First (Low-Code)

| Component        | Technology                    |
|------------------|-------------------------------|
| Orchestration    | n8n (primary)                 |
| Backend          | Minimal FastAPI               |
| LLM              | Gemini via n8n HTTP node      |
| DB               | n8n built-in SQLite           |
| Frontend         | n8n UI                        |
| Email            | n8n Gmail node                |
| Sheets           | n8n Google Sheets node        |

Pros: Fastest visible workflows; non-technical friendly
Cons: Logic in n8n is hard to test and version-control; loses Python AI ecosystem

---

## 6. FINAL RECOMMENDED STACK (STACK B)

Stack B with the following clarifications:

1. Skip authentication in Phase 1 (personal use)
2. Use local filesystem (not MinIO) for Phase 1
3. Add authentication (FastAPI-Users) in Phase 2 if needed

Docker services in scope:

    postgres     — PostgreSQL 16 with pgvector extension
    ollama       — Local LLM and embedding server
    n8n          — Self-hosted automation engine
    backend      — FastAPI application
    frontend     — Next.js application
    mailhog      — Local SMTP trap (dev only)

Why this stack specifically for this project:

1. Gemini 2.0 Flash produces reliably structured JSON output — the most failure-prone
   part of this system is resume and JD extraction. Cloud LLM here reduces errors.

2. pgvector eliminates ChromaDB/Qdrant as a separate service. At hundreds-of-jobs scale
   pgvector is identical in performance to a dedicated vector DB.

3. n8n maps directly to this system's pipeline. Building orchestration in pure Python
   duplicates what n8n does with worse visibility and debuggability.

4. FastAPI + Python is the natural home for AI/ML. Every needed library is Python-native.

5. Next.js produces portfolio-quality frontend. Streamlit would be a dead-end for UI quality.

6. This stack directly matches skills relevant to AI/ML engineering roles and graduate programs.

---

## 7. COMPLETE FOLDER STRUCTURE

```
ai-job-assistant/
│
├── README.md                          # Project overview and quick start
├── LICENSE                            # MIT License
├── .gitignore                         # Python, Node, env files, uploads
├── .env.example                       # All environment variables documented
├── docker-compose.yml                 # Production compose file
├── docker-compose.dev.yml             # Dev overrides (mailhog, volume mounts)
├── Makefile                           # make dev, make test, make migrate, etc.
│
├── docs/
│   ├── architecture.md                # System architecture with diagrams
│   ├── setup.md                       # Step-by-step installation guide
│   ├── api.md                         # All API endpoints documented
│   ├── workflows.md                   # n8n workflow documentation
│   ├── prompts.md                     # Prompt engineering documentation
│   ├── scoring.md                     # Match scoring algorithm explained
│   └── troubleshooting.md             # Common errors and fixes
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt               # Production dependencies
│   ├── requirements-dev.txt           # Dev/test dependencies
│   ├── alembic.ini                    # Alembic migration config
│   ├── pytest.ini                     # pytest config
│   │
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI app factory; lifespan events
│   │   ├── dependencies.py            # DI: DB sessions, LLM client, storage
│   │   │
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── router.py          # All v1 routes registered here
│   │   │       ├── resume.py          # POST /resume, GET /resume/{id}
│   │   │       ├── jobs.py            # POST /jobs/analyze, GET /jobs/{id}
│   │   │       ├── match.py           # POST /match, GET /match/{id}
│   │   │       ├── generate.py        # POST /generate/resume, /cover-letter, etc.
│   │   │       ├── applications.py    # CRUD for application tracker
│   │   │       ├── reports.py         # GET /reports/{id}, POST /reports/send
│   │   │       └── health.py          # GET /health
│   │   │
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py              # pydantic-settings; reads .env
│   │   │   ├── logging.py             # structlog setup; JSON output
│   │   │   ├── exceptions.py          # Custom exception hierarchy
│   │   │   └── security.py            # File validation, sanitization helpers
│   │   │
│   │   ├── models/                    # SQLAlchemy ORM models (mapped to tables)
│   │   │   ├── __init__.py
│   │   │   ├── base.py                # DeclarativeBase; TimestampMixin
│   │   │   ├── user.py                # users table
│   │   │   ├── resume.py              # resumes, resume_versions tables
│   │   │   ├── job.py                 # jobs, job_requirements, job_skills
│   │   │   ├── skill.py               # skills, resume_skills tables
│   │   │   ├── application.py         # applications, application_events
│   │   │   ├── document.py            # generated_documents table
│   │   │   └── analysis.py            # analysis_reports table
│   │   │
│   │   ├── schemas/                   # Pydantic v2 request/response schemas
│   │   │   ├── __init__.py
│   │   │   ├── resume.py              # ResumeUpload, ResumeData, ResumeResponse
│   │   │   ├── job.py                 # JobInput, JobData, JobResponse
│   │   │   ├── match.py               # MatchRequest, MatchResult, ScoreBreakdown
│   │   │   ├── generation.py          # GenerateRequest, GeneratedDocuments
│   │   │   ├── application.py         # ApplicationCreate, ApplicationUpdate
│   │   │   └── common.py              # Pagination, ErrorResponse, etc.
│   │   │
│   │   ├── services/                  # Business logic layer (called by API routers)
│   │   │   ├── __init__.py
│   │   │   ├── resume_service.py      # Upload, parse, extract, store
│   │   │   ├── job_service.py         # Receive JD, clean, extract, store
│   │   │   ├── matching_service.py    # Orchestrate scoring engine + semantic
│   │   │   ├── generation_service.py  # Orchestrate all document generators
│   │   │   ├── tracking_service.py    # Application CRUD + status transitions
│   │   │   └── email_service.py       # Gmail API send + template rendering
│   │   │
│   │   └── db/
│   │       ├── __init__.py
│   │       ├── session.py             # Async SQLAlchemy session factory
│   │       ├── seed.py                # Seed scripts for dev data
│   │       └── migrations/            # Alembic auto-generated migrations
│   │           ├── env.py
│   │           └── versions/
│   │               └── (migration files)
│   │
│   └── tests/
│       ├── conftest.py                # pytest fixtures; test DB; test client
│       ├── unit/
│       │   ├── test_resume_parser.py
│       │   ├── test_jd_extractor.py
│       │   ├── test_scoring_engine.py
│       │   ├── test_skill_matcher.py
│       │   ├── test_gap_analyzer.py
│       │   ├── test_ats_analyzer.py
│       │   └── test_document_generator.py
│       ├── integration/
│       │   ├── test_resume_api.py
│       │   ├── test_match_api.py
│       │   ├── test_generate_api.py
│       │   └── test_application_api.py
│       └── fixtures/
│           ├── sample_resume.pdf
│           ├── sample_resume.docx
│           ├── sample_resume.txt
│           ├── sample_jd.txt
│           └── expected_outputs/
│               ├── parsed_resume.json
│               └── parsed_jd.json
│
├── ai/
│   ├── __init__.py
│   │
│   ├── providers/
│   │   ├── __init__.py
│   │   ├── base.py                    # LLMProvider ABC (abstract base class)
│   │   ├── gemini.py                  # GeminiProvider implementation
│   │   ├── ollama.py                  # OllamaProvider implementation
│   │   └── factory.py                 # get_llm_provider() factory function
│   │
│   ├── prompts/
│   │   ├── resume_extraction.txt      # Extract structured data from resume text
│   │   ├── jd_extraction.txt          # Extract structured data from JD text
│   │   ├── skill_matching.txt         # Classify skill matches (strong/partial/missing)
│   │   ├── gap_analysis.txt           # Detailed gap + transferable skills analysis
│   │   ├── ats_analysis.txt           # ATS compatibility analysis prompt
│   │   ├── resume_optimization.txt    # ATS resume rewrite (truthfulness enforced)
│   │   ├── cover_letter.txt           # Personalized cover letter generation
│   │   ├── application_email.txt      # Professional application email
│   │   └── report_generation.txt      # Full analysis report narrative
│   │
│   ├── parsers/
│   │   ├── __init__.py
│   │   ├── resume_parser.py           # PDF/DOCX/TXT → raw text extraction
│   │   ├── jd_parser.py               # URL/paste → cleaned JD text
│   │   └── text_cleaner.py            # Normalize whitespace, remove artifacts
│   │
│   ├── extractors/
│   │   ├── __init__.py
│   │   ├── resume_extractor.py        # raw text → structured ResumeData JSON via LLM
│   │   └── jd_extractor.py            # raw JD text → structured JobData JSON via LLM
│   │
│   ├── matching/
│   │   ├── __init__.py
│   │   ├── skill_matcher.py           # Deterministic skill overlap calculation
│   │   ├── semantic_matcher.py        # pgvector cosine similarity scoring
│   │   ├── scoring_engine.py          # Weighted score calculator (configurable)
│   │   └── gap_analyzer.py            # Classify skills: strong/partial/missing/transferable
│   │
│   ├── ats/
│   │   ├── __init__.py
│   │   ├── ats_analyzer.py            # ATS keyword coverage + formatting check
│   │   └── keyword_extractor.py       # Extract ATS keywords from JD
│   │
│   ├── generation/
│   │   ├── __init__.py
│   │   ├── resume_optimizer.py        # ATS-optimized resume (truthful only)
│   │   ├── cover_letter_generator.py  # Personalized cover letter
│   │   ├── email_generator.py         # Application email
│   │   └── report_generator.py        # Full analysis report
│   │
│   ├── validation/
│   │   ├── __init__.py
│   │   ├── schemas/                   # JSON schemas for LLM output validation
│   │   │   ├── resume_data.json
│   │   │   ├── job_data.json
│   │   │   ├── match_result.json
│   │   │   └── generated_documents.json
│   │   └── validator.py               # Validate → retry → repair → log failure
│   │
│   └── embeddings/
│       ├── __init__.py
│       └── embedder.py                # nomic-embed-text via Ollama API
│
├── automation/
│   └── n8n/
│       ├── README.md                  # n8n setup + import instructions
│       └── workflows/
│           ├── 01_resume_ingestion.json
│           ├── 02_jd_analysis.json
│           ├── 03_resume_matching.json
│           ├── 04_gap_analysis.json
│           ├── 05_ats_analysis.json
│           ├── 06_resume_generation.json
│           ├── 07_cover_letter_generation.json
│           ├── 08_email_generation.json
│           ├── 09_report_generation.json
│           ├── 10_application_tracking.json
│           └── 11_followup_reminder.json
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── .env.local.example
│   │
│   └── src/
│       ├── app/                       # Next.js 14 App Router
│       │   ├── layout.tsx             # Root layout; providers; nav
│       │   ├── page.tsx               # Dashboard (/)
│       │   ├── resume/
│       │   │   ├── page.tsx           # Resume upload and management
│       │   │   └── [id]/page.tsx      # Single resume detail view
│       │   ├── jobs/
│       │   │   ├── page.tsx           # Job analysis input
│       │   │   └── [id]/page.tsx      # Single JD detail view
│       │   ├── match/
│       │   │   └── [id]/page.tsx      # Match results detail
│       │   ├── generate/
│       │   │   └── [id]/page.tsx      # Generated documents + approve/edit
│       │   └── applications/
│       │       ├── page.tsx           # Application tracker list
│       │       └── [id]/page.tsx      # Single application detail
│       │
│       ├── components/
│       │   ├── ui/                    # shadcn/ui components (Button, Card, etc.)
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx
│       │   │   ├── TopNav.tsx
│       │   │   └── PageHeader.tsx
│       │   ├── resume/
│       │   │   ├── ResumeUploader.tsx
│       │   │   ├── ResumePreview.tsx
│       │   │   └── SkillList.tsx
│       │   ├── jobs/
│       │   │   ├── JDInput.tsx
│       │   │   └── JDDetail.tsx
│       │   ├── match/
│       │   │   ├── ScoreCard.tsx
│       │   │   ├── SkillGapChart.tsx
│       │   │   └── MatchBreakdown.tsx
│       │   ├── generate/
│       │   │   ├── DocumentViewer.tsx
│       │   │   └── GenerateButtons.tsx
│       │   ├── applications/
│       │   │   ├── ApplicationCard.tsx
│       │   │   ├── StatusBadge.tsx
│       │   │   └── ApplicationTable.tsx
│       │   └── shared/
│       │       ├── LoadingSpinner.tsx
│       │       ├── ErrorBoundary.tsx
│       │       └── ToastProvider.tsx
│       │
│       ├── lib/
│       │   ├── api.ts                 # Type-safe API client (wraps fetch)
│       │   ├── utils.ts               # Common utilities
│       │   └── constants.ts           # App-level constants
│       │
│       └── types/
│           ├── resume.ts              # TypeScript types mirroring backend schemas
│           ├── job.ts
│           ├── match.ts
│           ├── generation.ts
│           └── application.ts
│
├── storage/
│   ├── resumes/                       # Uploaded raw resume files
│   ├── generated/                     # Generated documents (resume, CL, email)
│   └── reports/                       # Generated analysis reports
│
└── tests/
    ├── unit/                          # Unit tests (no external dependencies)
    ├── integration/                   # Integration tests (with test DB)
    └── e2e/                           # Playwright end-to-end tests
        ├── playwright.config.ts
        └── specs/
            ├── resume_upload.spec.ts
            ├── job_analysis.spec.ts
            └── full_workflow.spec.ts
```

---

## 8. DATABASE SCHEMA (ALL TABLES)

### Table: users

    id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
    email         VARCHAR(255) UNIQUE NOT NULL
    full_name     VARCHAR(255)
    created_at    TIMESTAMPTZ DEFAULT now()
    updated_at    TIMESTAMPTZ DEFAULT now()

---

### Table: resumes

    id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
    user_id         UUID REFERENCES users(id) ON DELETE CASCADE
    file_name       VARCHAR(500) NOT NULL
    file_path       VARCHAR(1000) NOT NULL
    file_type       VARCHAR(10) NOT NULL         -- pdf | docx | txt
    file_size_bytes INTEGER NOT NULL
    raw_text        TEXT                          -- extracted plain text
    parsed_data     JSONB                         -- structured resume JSON
    embedding       vector(768)                   -- pgvector for semantic search
    is_active       BOOLEAN DEFAULT TRUE
    created_at      TIMESTAMPTZ DEFAULT now()
    updated_at      TIMESTAMPTZ DEFAULT now()

---

### Table: resume_versions

    id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
    resume_id       UUID REFERENCES resumes(id) ON DELETE CASCADE
    version_number  INTEGER NOT NULL
    version_label   VARCHAR(100)                  -- "Google SWE v2", "ML focused"
    file_path       VARCHAR(1000)                 -- generated ATS-optimized file
    generated_for   UUID REFERENCES jobs(id)
    changes_made    TEXT[]                        -- list of changes applied
    created_at      TIMESTAMPTZ DEFAULT now()

---

### Table: skills

    id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
    name          VARCHAR(255) UNIQUE NOT NULL    -- normalized skill name
    category      VARCHAR(100)                    -- language | framework | tool | soft | domain
    aliases       TEXT[]                          -- alt names for matching
    created_at    TIMESTAMPTZ DEFAULT now()

---

### Table: resume_skills

    id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
    resume_id    UUID REFERENCES resumes(id) ON DELETE CASCADE
    skill_id     UUID REFERENCES skills(id)
    proficiency  VARCHAR(50)                      -- expert | intermediate | beginner
    years        DECIMAL(4,1)
    context      TEXT                             -- where/how demonstrated in resume
    created_at   TIMESTAMPTZ DEFAULT now()

---

### Table: jobs

    id               UUID PRIMARY KEY DEFAULT gen_random_uuid()
    user_id          UUID REFERENCES users(id) ON DELETE CASCADE
    title            VARCHAR(500) NOT NULL
    company          VARCHAR(500) NOT NULL
    location         VARCHAR(500)
    work_arrangement VARCHAR(50)                  -- remote | hybrid | onsite
    seniority        VARCHAR(100)                 -- junior | mid | senior | staff | lead
    salary_min       INTEGER
    salary_max       INTEGER
    salary_currency  VARCHAR(10)
    raw_jd_text      TEXT NOT NULL
    parsed_data      JSONB                        -- structured JD JSON
    source_url       VARCHAR(2000)
    embedding        vector(768)                  -- pgvector for semantic search
    found_at         TIMESTAMPTZ DEFAULT now()
    created_at       TIMESTAMPTZ DEFAULT now()
    updated_at       TIMESTAMPTZ DEFAULT now()

---

### Table: job_requirements

    id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
    job_id          UUID REFERENCES jobs(id) ON DELETE CASCADE
    requirement_type VARCHAR(50)                  -- skill | education | experience | certification
    value           TEXT NOT NULL
    importance      VARCHAR(20)                   -- MANDATORY | PREFERRED | NICE_TO_HAVE
    created_at      TIMESTAMPTZ DEFAULT now()

---

### Table: job_skills

    id           UUID PRIMARY KEY DEFAULT gen_random_uuid()
    job_id       UUID REFERENCES jobs(id) ON DELETE CASCADE
    skill_id     UUID REFERENCES skills(id)
    importance   VARCHAR(20)                      -- MANDATORY | PREFERRED | NICE_TO_HAVE
    created_at   TIMESTAMPTZ DEFAULT now()

---

### Table: applications

    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
    user_id             UUID REFERENCES users(id) ON DELETE CASCADE
    resume_id           UUID REFERENCES resumes(id)
    resume_version_id   UUID REFERENCES resume_versions(id)
    job_id              UUID REFERENCES jobs(id)
    status              VARCHAR(50) NOT NULL DEFAULT 'SAVED'
    match_score         DECIMAL(5,2)
    ats_score           DECIMAL(5,2)
    recommendation      VARCHAR(50)              -- STRONGLY_APPLY | APPLY | etc.
    recruiter_name      VARCHAR(255)
    recruiter_email     VARCHAR(255)
    date_found          TIMESTAMPTZ
    date_applied        TIMESTAMPTZ
    follow_up_date      TIMESTAMPTZ
    interview_date      TIMESTAMPTZ
    notes               TEXT
    created_at          TIMESTAMPTZ DEFAULT now()
    updated_at          TIMESTAMPTZ DEFAULT now()

Status values (FSM):
SAVED → ANALYZED → READY_TO_APPLY → APPLIED → FOLLOW_UP → INTERVIEW → OFFER
SAVED → WITHDRAWN
APPLIED → REJECTED

---

### Table: application_events

    id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
    application_id  UUID REFERENCES applications(id) ON DELETE CASCADE
    event_type      VARCHAR(100) NOT NULL          -- STATUS_CHANGE | EMAIL_SENT | NOTE_ADDED | etc.
    from_status     VARCHAR(50)
    to_status       VARCHAR(50)
    description     TEXT
    metadata        JSONB
    created_at      TIMESTAMPTZ DEFAULT now()

---

### Table: generated_documents

    id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
    application_id  UUID REFERENCES applications(id) ON DELETE CASCADE
    document_type   VARCHAR(50) NOT NULL           -- RESUME | COVER_LETTER | EMAIL | REPORT
    content         TEXT NOT NULL
    file_path       VARCHAR(1000)
    version         INTEGER DEFAULT 1
    is_approved     BOOLEAN DEFAULT FALSE
    approved_at     TIMESTAMPTZ
    created_at      TIMESTAMPTZ DEFAULT now()

---

### Table: analysis_reports

    id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
    application_id  UUID REFERENCES applications(id) ON DELETE CASCADE
    match_score     DECIMAL(5,2)
    ats_score       DECIMAL(5,2)
    score_breakdown JSONB                          -- all sub-scores
    strong_matches  JSONB                          -- list of strong skill matches
    partial_matches JSONB                          -- list of partial matches
    missing_skills  JSONB                          -- list of missing skills
    missing_keywords JSONB                         -- ATS keywords not in resume
    recommendations TEXT[]                         -- list of improvement actions
    overall_recommendation VARCHAR(50)
    raw_report_md   TEXT                           -- Markdown version of full report
    created_at      TIMESTAMPTZ DEFAULT now()

---

## 9. MODULE-BY-MODULE DEVELOPMENT ROADMAP

| Module | Name                          | Purpose                                               |
|--------|-------------------------------|-------------------------------------------------------|
| 1      | Architecture & Tech Selection | Choose stack; define structure — COMPLETE              |
| 2      | Project Foundation            | Docker, FastAPI skeleton, config, logging, DB, health  |
| 3      | Resume Parser                 | PDF/DOCX/TXT → raw text → structured JSON              |
| 4      | JD Parser & Extractor         | JD text/URL → structured JSON with skill classification|
| 5      | LLM Provider Layer            | GeminiProvider + OllamaProvider + retry + validation  |
| 6      | Matching Engine               | Deterministic scoring + semantic similarity + weights  |
| 7      | Skill Gap & ATS Analysis      | Gap classification + ATS keyword report               |
| 8      | Document Generator            | ATS resume + cover letter + email (truthful only)     |
| 9      | Report Generator              | Full analysis report (JSON + Markdown + optional PDF) |
| 10     | Database Layer                | Full schema, Alembic migrations, all CRUD services    |
| 11     | Application Tracker           | Status FSM, application CRUD, history events          |
| 12     | Email Integration             | Gmail API + Mailhog dev; template system              |
| 13     | n8n Workflows                 | All 11 workflow JSON files; end-to-end tested         |
| 14     | Frontend — Core               | Dashboard, resume upload, job analysis, match results  |
| 15     | Frontend — Generation         | Document UI, report viewer, tracker UI                |
| 16     | Testing Suite                 | Unit + integration + E2E; sample fixtures; CI-ready   |
| 17     | Docker & Deployment           | Final docker-compose; environment docs; prod notes    |
| 18     | Documentation                 | README, architecture, setup, API, troubleshooting     |

---

## 10. MODULE DETAIL SHEETS

### MODULE 2 — Project Foundation

What: Skeleton that all other modules build on.

Deliverables:
- docker-compose.yml (postgres, ollama, n8n, backend, frontend, mailhog)
- backend/app/main.py (FastAPI app with lifespan)
- backend/app/core/config.py (pydantic-settings; reads .env)
- backend/app/core/logging.py (structlog JSON setup)
- backend/app/core/exceptions.py (BaseAppException hierarchy)
- backend/app/api/v1/health.py (GET /health → {status, db, llm, version})
- backend/app/db/session.py (async SQLAlchemy session)
- alembic.ini + migrations/env.py (migration config)
- .env.example (all variables documented)
- Makefile (dev, test, migrate, format, lint commands)
- README.md (installation instructions)

Environment Variables Required:
    DATABASE_URL
    GEMINI_API_KEY
    OLLAMA_BASE_URL
    LLM_PROVIDER
    LOG_LEVEL

---

### MODULE 3 — Resume Parser

What: Accept raw resume file; extract clean text; extract structured data via LLM.

Inputs: PDF / DOCX / TXT file (max 10MB)

Outputs:
    {
      "candidate": {
        "name": "string",
        "email": "string",
        "phone": "string",
        "location": "string",
        "linkedin": "string",
        "github": "string",
        "portfolio": "string"
      },
      "summary": "string",
      "education": [
        {
          "institution": "string",
          "degree": "string",
          "field": "string",
          "gpa": "string",
          "start_date": "string",
          "end_date": "string",
          "achievements": ["string"]
        }
      ],
      "experience": [
        {
          "company": "string",
          "title": "string",
          "location": "string",
          "start_date": "string",
          "end_date": "string",
          "is_current": false,
          "bullets": ["string"],
          "technologies": ["string"]
        }
      ],
      "internships": [...],
      "projects": [
        {
          "name": "string",
          "description": "string",
          "technologies": ["string"],
          "links": ["string"],
          "impact": "string"
        }
      ],
      "skills": {
        "programming_languages": ["string"],
        "frameworks": ["string"],
        "tools": ["string"],
        "databases": ["string"],
        "cloud": ["string"],
        "other": ["string"]
      },
      "certifications": [
        {
          "name": "string",
          "issuer": "string",
          "date": "string",
          "credential_id": "string"
        }
      ],
      "achievements": ["string"],
      "publications": ["string"],
      "links": ["string"]
    }

Key Rules:
- NEVER hallucinate resume information
- If a field is not present in the source, return null or empty array
- Preserve original text as closely as possible
- Do not infer seniority or experience level unless explicitly stated

Libraries:
- PyMuPDF (fitz) for PDF text extraction
- python-docx for DOCX extraction
- LLM call via provider abstraction for JSON extraction
- jsonschema for output validation
- Retry up to 3 times on malformed LLM output

---

### MODULE 4 — JD Parser & Extractor

What: Accept raw JD text or URL; clean it; extract structured data via LLM.

Inputs: Raw JD text (pasted) OR URL to job posting

Outputs:
    {
      "title": "string",
      "company": "string",
      "location": "string",
      "work_arrangement": "remote | hybrid | onsite",
      "seniority": "junior | mid | senior | staff | lead | not_specified",
      "experience_years_min": 0,
      "experience_years_max": 0,
      "education_requirements": ["string"],
      "required_skills": ["string"],
      "preferred_skills": ["string"],
      "nice_to_have_skills": ["string"],
      "programming_languages": ["string"],
      "frameworks": ["string"],
      "tools": ["string"],
      "certifications": ["string"],
      "responsibilities": ["string"],
      "soft_skills": ["string"],
      "domain_knowledge": ["string"],
      "ats_keywords": ["string"],
      "salary_min": null,
      "salary_max": null,
      "salary_currency": null,
      "skill_classification": {
        "MANDATORY": ["string"],
        "PREFERRED": ["string"],
        "NICE_TO_HAVE": ["string"]
      }
    }

URL Parsing Notes:
- Use httpx to fetch URL content
- Strip HTML using beautifulsoup4
- Remove navigation, headers, footers, cookie banners
- Keep only the job description body text

---

### MODULE 5 — LLM Provider Layer

What: Abstract interface for all LLM calls. Swap Gemini ↔ Ollama ↔ others via config.

Architecture:

    class LLMProvider(ABC):
        async def complete(
            self,
            prompt: str,
            system: str | None = None,
            temperature: float = 0.1,
            max_tokens: int = 4096,
            response_format: str = "json"
        ) -> str: ...

        async def embed(self, text: str) -> list[float]: ...

        async def health_check(self) -> bool: ...

    class GeminiProvider(LLMProvider):
        # Uses google-generativeai SDK
        # Model: gemini-2.0-flash
        # Structured output via response_mime_type="application/json"

    class OllamaProvider(LLMProvider):
        # Uses ollama Python SDK
        # Model: configurable via OLLAMA_MODEL env var
        # Default: qwen2.5:7b for text, nomic-embed-text for embeddings

    def get_llm_provider() -> LLMProvider:
        # Reads LLM_PROVIDER from config
        # Returns appropriate provider instance

Retry + Validation Flow:

    LLM Call
       ↓
    Response received
       ↓
    JSON parse attempt
       ↓ (fail → retry)
    Schema validation (jsonschema)
       ↓ (fail → attempt repair → retry)
    Business rules check
       ↓ (fail → log + raise ProviderOutputError)
    Return validated dict

Max retries: 3
On all retries exhausted: log failure with full prompt/response; raise error; do not silently return bad data

---

### MODULE 6 — Matching Engine

What: Calculate a transparent, explainable, deterministic + semantic match score.

Scoring Formula (configurable weights):

    Overall Score =
        (required_skill_score × MATCH_REQUIRED_SKILL_WEIGHT)    default 0.30
      + (preferred_skill_score × MATCH_PREFERRED_SKILL_WEIGHT)  default 0.15
      + (experience_score × MATCH_EXPERIENCE_WEIGHT)            default 0.15
      + (education_score × MATCH_EDUCATION_WEIGHT)              default 0.10
      + (project_score × MATCH_PROJECT_WEIGHT)                  default 0.10
      + (semantic_score × MATCH_SEMANTIC_WEIGHT)                default 0.10
      + (ats_keyword_score × MATCH_ATS_KEYWORD_WEIGHT)          default 0.10

All weights must sum to 1.0. Validated at startup.

Sub-score calculation methods:

required_skill_score:
    matched = count(required_skills ∩ resume_skills)
    score = (matched / total_required_skills) × 100

preferred_skill_score:
    matched = count(preferred_skills ∩ resume_skills)
    score = (matched / total_preferred_skills) × 100

experience_score:
    if resume_years >= jd_required_years: score = 100
    elif resume_years >= jd_required_years × 0.75: score = 80
    elif resume_years >= jd_required_years × 0.5: score = 60
    else: score = (resume_years / jd_required_years) × 60

education_score:
    Degree level mapping:
    PhD=5, Master's=4, Bachelor's=3, Associate's=2, Diploma=1, None=0
    if resume_level >= required_level: score = 100
    elif resume_level == required_level - 1: score = 80
    else: score proportional

semantic_score:
    embed(resume_text) → vector A
    embed(jd_text) → vector B
    cosine_similarity(A, B) → 0.0 to 1.0
    score = cosine_similarity × 100

ats_keyword_score:
    jd_keywords = extract_ats_keywords(jd_text)
    resume_keywords = extract_all_text(resume)
    matched = count(kw for kw in jd_keywords if kw in resume_keywords)
    score = (matched / total_jd_keywords) × 100

LLM is NOT used to produce the final score.
LLM is used only to provide explanatory commentary after the score is calculated.

Output:
    {
      "overall_score": 87.3,
      "required_skill_score": 91.0,
      "preferred_skill_score": 78.0,
      "experience_score": 85.0,
      "education_score": 100.0,
      "project_score": 80.0,
      "semantic_score": 88.0,
      "ats_keyword_score": 82.0,
      "weight_config": {...},
      "explanation": "string — LLM-generated narrative explaining the score"
    }

---

### MODULE 7 — Skill Gap & ATS Analysis

SKILL GAP ANALYSIS:

Classifications:

STRONG_MATCH:
    Skill explicitly present in resume AND demonstrated in experience/projects.
    Confidence: HIGH.

PARTIAL_MATCH:
    Skill mentioned in resume but with limited depth or only in skills list,
    not demonstrated in experience or projects.
    Confidence: MEDIUM.

MISSING_SKILL:
    Skill required by JD; not present in resume in any form.
    Never reclassified as anything else.
    Confidence: N/A — the skill is absent.

TRANSFERABLE_SKILL:
    Skill not explicitly named but where a demonstrably related skill exists.
    Example: Resume has Flask; JD requires FastAPI.
    Must be clearly justified. Never fabricated.
    Confidence: LOW–MEDIUM with explicit justification.

Output:
    {
      "strong_matches": [
        {"skill": "Python", "evidence": "3+ years; used in 4 projects", "confidence": "HIGH"}
      ],
      "partial_matches": [
        {"skill": "Docker", "evidence": "Listed in skills; no project evidence", "confidence": "MEDIUM"}
      ],
      "missing_skills": [
        {"skill": "Kubernetes", "importance": "PREFERRED", "note": "Not present in resume"}
      ],
      "transferable_skills": [
        {"jd_skill": "FastAPI", "resume_skill": "Flask", "justification": "Both Python async/sync REST frameworks"}
      ]
    }

ATS ANALYSIS:

What it checks:
- Keyword coverage (JD keywords present in resume)
- Section presence (Experience, Education, Skills, etc.)
- Date formats (consistent; parseable)
- Bullet point structure (action verb + impact)
- Quantification (numbers present where expected)
- Contact information completeness
- File format suitability
- Potential ATS parsing problems (tables, headers, footers, graphics)
- Job title alignment with target role

Score:
    ATS Compatibility: [0-100] / 100

Explanation must list:
- What passed
- What failed and why
- Specific improvements needed

---

### MODULE 8 — Document Generator

CRITICAL TRUTHFULNESS CONTRACT — NEVER VIOLATE:

The generator MUST NOT:
    × Invent any skill
    × Invent any experience
    × Invent any project
    × Invent any metric or number
    × Invent any company or title
    × Invent any education or certification
    × Invent any achievement
    × Imply the candidate has a skill they do not have

The generator MAY:
    ✓ Reorder bullets for relevance to the target JD
    ✓ Reword bullets for clarity and impact
    ✓ Add missing action verbs to existing bullets
    ✓ Highlight existing metrics more prominently
    ✓ Align section order with target JD priorities
    ✓ Add JD keywords where they accurately describe existing work
    ✓ Combine related bullets for conciseness
    ✓ Remove bullets not relevant to the target role

ATS-OPTIMIZED RESUME:
- One-column layout (no tables for main content)
- No text boxes, no headers/footers with key info
- Standard section headings (Experience, Education, Skills, Projects)
- Job title in header aligned with target role title (if accurate)
- Bullet points with strong action verbs
- Quantified achievements where numbers already exist in source resume
- Keywords from JD woven into bullets where they accurately describe the work

COVER LETTER:
Structure:
    Opening: Hook + position + company name
    Paragraph 1: Most relevant experience + specific achievement
    Paragraph 2: Most relevant project + technical connection to JD
    Paragraph 3: Why this company specifically (based on JD context)
    Closing: Call to action + professional close

Rules:
    - Maximum 400 words
    - No generic AI phrases ("I am excited to apply", "passionate about")
    - Every claim must be traceable to resume content
    - Company-specific details from JD

APPLICATION EMAIL:
Structure:
    Subject: Application for [Job Title] — [Candidate Name]
    Body:
        Greeting
        1-sentence position reference
        2-3 sentence value proposition (from resume)
        Resume attachment reference
        Call to action
        Professional close

Rules:
    - Maximum 150 words body
    - No attachments generated; reference only
    - Professional tone

---

### MODULE 9 — Report Generator

Full report structure:

    ═══════════════════════════════════════
    JOB APPLICATION ANALYSIS REPORT
    Generated: [timestamp]
    ═══════════════════════════════════════

    JOB INFORMATION
    ───────────────
    Title:           [string]
    Company:         [string]
    Location:        [string]
    Work Arrangement:[string]
    Seniority:       [string]

    MATCH SCORE
    ───────────
    Overall Score:          [XX.X/100]
    Required Skills:        [XX.X/100]
    Preferred Skills:       [XX.X/100]
    Experience:             [XX.X/100]
    Education:              [XX.X/100]
    Project Relevance:      [XX.X/100]
    Semantic Similarity:    [XX.X/100]
    ATS Keyword Coverage:   [XX.X/100]

    OVERALL RECOMMENDATION
    ──────────────────────
    [STRONGLY APPLY | APPLY | APPLY WITH RESUME CHANGES | LOW PRIORITY | NOT RECOMMENDED]
    [Reasoning]

    ATS COMPATIBILITY: [XX/100]
    ──────────────────
    [Detailed ATS findings]

    STRONG MATCHES
    ──────────────
    [List with evidence]

    PARTIAL MATCHES
    ───────────────
    [List with context]

    SKILL GAPS (MANDATORY)
    ──────────────────────
    [List of missing mandatory skills]

    SKILL GAPS (PREFERRED)
    ──────────────────────
    [List of missing preferred skills]

    MISSING ATS KEYWORDS
    ────────────────────
    [Keywords in JD not in current resume]

    RESUME IMPROVEMENT RECOMMENDATIONS
    ───────────────────────────────────
    [Ordered list of specific improvements]

    RECOMMENDED SKILLS TO LEARN
    ────────────────────────────
    [Skills that would strengthen future applications for this role type]

    TAILORED RESUME
    ───────────────
    [Full ATS-optimized resume text]

    COVER LETTER
    ────────────
    [Full cover letter text]

    APPLICATION EMAIL
    ─────────────────
    Subject: [string]
    [Full email body]

Recommendation criteria:

    STRONGLY APPLY:  overall_score >= 85 AND required_skill_score >= 90
    APPLY:           overall_score >= 75 AND required_skill_score >= 75
    APPLY WITH CHANGES: overall_score >= 60 OR required_skill_score >= 60
    LOW PRIORITY:    overall_score >= 45
    NOT RECOMMENDED: overall_score < 45

---

### MODULE 10 — Database Layer

What: Full PostgreSQL schema, Alembic migrations, async CRUD operations.

Key design decisions:
- All IDs are UUIDs (not serial integers)
- All tables have created_at and updated_at timestamps
- pgvector columns for resumes and jobs (semantic search)
- JSONB columns for flexible structured data (parsed_data, score_breakdown)
- Foreign key constraints with appropriate CASCADE rules
- Indexes on: user_id, job_id, resume_id, status, created_at

ORM: SQLAlchemy 2.x (async with asyncpg driver)
Migrations: Alembic (auto-generate from models)

CRUD pattern:

    class ResumeRepository:
        async def create(self, db: AsyncSession, data: ResumeCreate) -> Resume
        async def get_by_id(self, db: AsyncSession, id: UUID) -> Resume | None
        async def get_by_user(self, db: AsyncSession, user_id: UUID) -> list[Resume]
        async def update(self, db: AsyncSession, id: UUID, data: ResumeUpdate) -> Resume
        async def delete(self, db: AsyncSession, id: UUID) -> bool
        async def find_similar(self, db: AsyncSession, embedding: list[float], limit: int) -> list[Resume]

---

### MODULE 11 — Application Tracker

What: Track every job application through its full lifecycle.

Status FSM (Finite State Machine):

    SAVED ──────────────────────────────────→ WITHDRAWN
      │
      ▼
    ANALYZED
      │
      ▼
    READY_TO_APPLY
      │
      ▼
    APPLIED ────────────────────────────────→ REJECTED
      │
      ▼
    FOLLOW_UP
      │
      ▼
    INTERVIEW
      │
      ├──────────────────────────────────────→ REJECTED
      │
      ▼
    OFFER
      │
      ├──────────────────────────────────────→ WITHDRAWN (declined offer)
      │
      ▼
    ACCEPTED

Valid transitions enforced at service layer.
Invalid transitions raise ApplicationStatusError.
Every transition logged in application_events.

Google Sheets sync:
When an application status changes, n8n workflow 10 fires a webhook that:
1. Reads the application from the backend API
2. Upserts the row in Google Sheets using company+title as unique key
3. Updates all tracking columns

Google Sheets columns:
    A: Company
    B: Job Title
    C: Job URL
    D: Match Score
    E: ATS Score
    F: Status
    G: Date Found
    H: Date Applied
    I: Recruiter
    J: Recruiter Email
    K: Resume Version
    L: Follow-up Date
    M: Notes
    N: Last Updated

---

### MODULE 12 — Email Integration

What: Send application emails and report delivery via Gmail API.

Gmail API setup:
1. Create Google Cloud project
2. Enable Gmail API
3. Create OAuth 2.0 credentials
4. Download credentials.json
5. Run OAuth flow once to get token.json
6. Store token.json securely (never commit to git)

Local dev alternative:
    GMAIL_ENABLED=false
    MAILHOG_URL=http://localhost:8025
    All emails captured by Mailhog SMTP server
    View at http://localhost:8025 in browser

Email templates stored in:
    backend/app/services/email_templates/
    ├── report_delivery.html
    ├── report_delivery.txt
    └── follow_up_reminder.html

Security rules:
- Never put email credentials in code
- Never commit token.json or credentials.json
- Both files added to .gitignore
- Use environment variables for all config

---

### MODULE 13 — n8n Workflows

Workflow 01: Resume Ingestion
    Trigger: Webhook (POST /webhook/resume-ingested)
    Steps: Validate payload → Call backend /api/v1/resume/{id}/parse → Log result
    Output: Resume parsed event

Workflow 02: JD Analysis
    Trigger: Webhook (POST /webhook/jd-submitted)
    Steps: Call backend /api/v1/jobs/analyze → Store result → Trigger match workflow
    Output: JD analyzed event

Workflow 03: Resume Matching
    Trigger: Webhook from Workflow 02
    Steps: Call backend /api/v1/match → Store scores → Log
    Output: Match scores calculated

Workflow 04: Gap Analysis
    Trigger: After Workflow 03 completes
    Steps: Call backend /api/v1/match/{id}/gaps → Store gap data
    Output: Gap analysis complete

Workflow 05: ATS Analysis
    Trigger: After Workflow 03 completes (parallel with 04)
    Steps: Call backend /api/v1/match/{id}/ats → Store ATS data
    Output: ATS report generated

Workflow 06-08: Document Generation
    Trigger: Manual (user clicks generate in UI)
    Steps: Call respective generate endpoints → Store documents
    Outputs: Resume, cover letter, email generated

Workflow 09: Report Generation
    Trigger: After workflows 06-08 complete
    Steps: Aggregate all data → Call report endpoint → Store report
    Output: Full report generated

Workflow 10: Application Tracking
    Trigger: Application status change webhook
    Steps: Read application → Upsert Google Sheets row
    Output: Google Sheets updated

Workflow 11: Follow-up Reminder
    Trigger: Scheduled (daily at 9:00 AM)
    Steps: Query applications WHERE follow_up_date = today AND status = APPLIED
    → Send Gmail reminder with application details
    Output: Reminder email sent

Every workflow has:
- Input validation node
- Error handling (set error → send to error log)
- Retry configuration (3 attempts, exponential backoff)
- Execution logging node
- Success/failure notification

---

### MODULE 14 & 15 — Frontend

Pages:

DASHBOARD (/)
    Metrics cards:
    - Total applications
    - Average match score
    - Applications this week
    - Interviews scheduled
    - Offers received
    - Pending follow-ups
    Recent applications table (last 5)
    Quick action: Upload Resume | Analyze Job

RESUME (/resume)
    Upload zone (drag and drop or click)
    Accepted formats: PDF, DOCX, TXT
    Max size: 10MB
    After upload: parsed data preview
    Skills list with proficiency badges
    Edit/correct any extracted field
    View past resumes

JOB ANALYSIS (/jobs)
    Tab 1: Paste JD text
    Tab 2: Enter job URL
    Submit button → polling for analysis result
    After analysis: JD structured data preview
    Required/preferred/nice-to-have skill breakdown

MATCH RESULTS (/match/[id])
    Score card (large number, color-coded)
    Score breakdown (radar chart or bar chart)
    Strong matches (green badges)
    Partial matches (yellow badges)
    Missing mandatory skills (red badges)
    Missing preferred skills (orange badges)
    ATS score with detailed findings
    One-click buttons:
        "Generate ATS Resume"
        "Generate Cover Letter"
        "Generate Email"
        "Generate Full Report"

GENERATE (/generate/[id])
    Side-by-side view:
        Left: Original resume
        Right: Generated optimized resume
    Document tabs: Resume | Cover Letter | Email | Report
    Edit mode (inline editing of generated content)
    Approve button (marks document as approved)
    Download button (PDF or DOCX)

APPLICATIONS (/applications)
    Table view with search + filter + sort
    Filter by: status, score range, date, company
    Status badge (color-coded)
    Row click → application detail
    Bulk actions: mark follow-up, change status

APPLICATION DETAIL (/applications/[id])
    All application data
    Status timeline (visual FSM history)
    Generated documents (view/download)
    Notes section
    Status change buttons
    Follow-up date picker
    Recruiter contact info

---

## 11. API ENDPOINT DESIGN

Base URL: /api/v1

### Health
    GET  /health                        → {status, db, llm, version, timestamp}

### Resume
    POST /resume/upload                 → {id, status, parsing_job_id}
    GET  /resume/{id}                   → ResumeResponse (full parsed data)
    GET  /resume                        → list[ResumeResponse] (paginated)
    PUT  /resume/{id}                   → ResumeResponse (update corrections)
    DELETE /resume/{id}                 → {success: true}

### Jobs
    POST /jobs/analyze                  → {id, status, extraction_job_id}
    GET  /jobs/{id}                     → JobResponse (full structured data)
    GET  /jobs                          → list[JobResponse] (paginated)
    DELETE /jobs/{id}                   → {success: true}

### Match
    POST /match                         → {id, scores, gaps, ats_analysis}
        body: {resume_id: UUID, job_id: UUID}
    GET  /match/{id}                    → MatchResult (full)
    GET  /match/{id}/gaps               → GapAnalysis
    GET  /match/{id}/ats                → ATSAnalysis

### Generate
    POST /generate/resume               → {id, content, file_path}
        body: {match_id: UUID}
    POST /generate/cover-letter         → {id, content}
        body: {match_id: UUID}
    POST /generate/email                → {id, subject, body}
        body: {match_id: UUID}
    POST /generate/report               → {id, content, file_path}
        body: {match_id: UUID}
    PUT  /generate/{id}/approve         → {id, is_approved: true, approved_at}

### Applications
    POST /applications                  → ApplicationResponse
    GET  /applications                  → list[ApplicationResponse] (paginated)
    GET  /applications/{id}             → ApplicationResponse (full)
    PUT  /applications/{id}             → ApplicationResponse
    PUT  /applications/{id}/status      → ApplicationResponse
        body: {status: string, note: string}
    GET  /applications/{id}/events      → list[ApplicationEvent]
    DELETE /applications/{id}           → {success: true}

### Reports
    GET  /reports/{application_id}      → AnalysisReport
    POST /reports/{id}/send             → {sent: true, to: email}

All endpoints:
- Return 200 on success
- Return 400 on validation error
- Return 404 on not found
- Return 422 on schema error
- Return 500 on internal error
- All errors follow: {error: string, detail: string, request_id: UUID}
- All list endpoints support: ?page=1&size=20&sort=created_at&order=desc

---

## 12. LLM PROVIDER ABSTRACTION

Usage pattern throughout codebase:

    from ai.providers.factory import get_llm_provider

    llm = get_llm_provider()

    result = await llm.complete(
        prompt=rendered_prompt,
        system="You are a professional resume analyzer...",
        temperature=0.1,
        max_tokens=4096,
        response_format="json"
    )

    embedding = await llm.embed(text=resume_text)

Provider selection:

    LLM_PROVIDER=gemini   → GeminiProvider
    LLM_PROVIDER=ollama   → OllamaProvider
    LLM_PROVIDER=auto     → Try Gemini first; fall back to Ollama on error

Temperature guidelines:
- Extraction tasks (resume, JD): 0.0 – 0.1 (deterministic)
- Analysis tasks (scoring, gaps): 0.1 – 0.2 (consistent)
- Generation tasks (resume, CL, email): 0.3 – 0.5 (creative but grounded)
- Report narrative: 0.2 – 0.3 (professional tone)

---

## 13. PROMPT FILES REFERENCE

All prompts live in: ai/prompts/

Each prompt file format:

    [SYSTEM SECTION]
    <system>
    You are a [role].
    [constraints]
    </system>

    [USER SECTION]
    <user>
    [context variables]
    [instructions]
    [output format specification]
    </user>

    [OUTPUT SCHEMA]
    Return ONLY valid JSON matching this schema:
    {
      ...schema...
    }

Prompt variables injected at runtime:

    resume_extraction.txt:
        {{raw_resume_text}}

    jd_extraction.txt:
        {{raw_jd_text}}

    skill_matching.txt:
        {{resume_skills_json}}
        {{jd_skills_json}}

    gap_analysis.txt:
        {{resume_data_json}}
        {{jd_data_json}}
        {{match_scores_json}}

    ats_analysis.txt:
        {{resume_text}}
        {{jd_keywords_list}}

    resume_optimization.txt:
        {{original_resume_json}}
        {{jd_data_json}}
        {{gap_analysis_json}}
        {{ats_analysis_json}}
        TRUTHFULNESS CONSTRAINT: All output must be derivable from original_resume_json.

    cover_letter.txt:
        {{resume_data_json}}
        {{jd_data_json}}
        {{company_name}}
        {{job_title}}

    application_email.txt:
        {{candidate_name}}
        {{job_title}}
        {{company_name}}
        {{top_skills_list}}

    report_generation.txt:
        {{all_analysis_data_json}}

---

## 14. SCORING ENGINE LOGIC

File: ai/matching/scoring_engine.py

Class: ScoringEngine

Constructor: Takes config (weights dict) from environment
             Validates weights sum to 1.0 on init

Method: calculate(resume_data, jd_data, embeddings_pair) → ScoreResult

Internal calculation order:
    1. required_skill_score    (deterministic)
    2. preferred_skill_score   (deterministic)
    3. experience_score        (deterministic with rules)
    4. education_score         (deterministic with mapping)
    5. project_score           (LLM-assisted; deterministic fallback)
    6. semantic_score          (pgvector cosine similarity)
    7. ats_keyword_score       (deterministic)
    8. weighted_sum            (formula)
    9. explanation             (LLM-generated narrative; NOT affecting score)

LLM is only called for:
    - project_score (to evaluate relevance of projects to JD)
    - explanation (narrative commentary after score is fixed)

LLM output never overrides any numerically calculated sub-score.

---

## 15. ATS ANALYSIS LOGIC

File: ai/ats/ats_analyzer.py

Checks performed:

FORMATTING CHECKS (pass/fail):
    - No tables used as resume layout structure
    - No text boxes
    - No images containing text
    - No fancy fonts (non-standard)
    - No headers/footers containing critical information
    - File is text-extractable (not scanned image)
    - Consistent date format

CONTENT CHECKS (scored):
    - Contact info present (name, email, phone)
    - Standard sections present (Experience, Education, Skills)
    - Each bullet starts with strong action verb
    - Quantified achievements present (contains numbers)
    - Job title in resume header matches/aligns with target role

KEYWORD CHECKS (scored):
    - JD required skills present in resume text
    - JD preferred skills present in resume text
    - Job title keywords present
    - Domain keywords present
    - Certification keywords present (if required)

Scoring:
    formatting_score (weight: 30%) — pass/fail checks
    content_score    (weight: 30%) — content completeness
    keyword_score    (weight: 40%) — keyword coverage

ATS score = weighted average of three sub-scores

---

## 16. DOCUMENT GENERATION RULES (TRUTHFULNESS CONTRACT)

This is the most important constraint in the entire system.

VERIFICATION STEP before any generation:
    The generation prompt explicitly receives:
        1. original_resume_json (source of truth)
        2. generated_draft (LLM output)

    A post-generation verification pass checks:
        - Every skill mentioned in draft exists in original_resume_json.skills
        - Every company/role mentioned in draft exists in original_resume_json.experience
        - Every project mentioned in draft exists in original_resume_json.projects
        - Every education mentioned in draft exists in original_resume_json.education
        - Every metric mentioned in draft exists in original_resume_json text
        - Every certification mentioned exists in original_resume_json.certifications

    If any check fails:
        - Log the violation with specifics
        - Remove the fabricated content
        - Do NOT silently pass fabricated output to the user

Implementation:

    class TruthfulnessVerifier:
        def verify(self, original: ResumeData, generated: str) -> VerificationResult:
            # Returns: {passed: bool, violations: list[str], cleaned_text: str}

---

## 17. APPLICATION TRACKER FSM

States:

    SAVED           — Job saved for review; no analysis done yet
    ANALYZED        — Match score and gap analysis complete
    READY_TO_APPLY  — Documents generated and approved by user
    APPLIED         — Application submitted
    FOLLOW_UP       — Follow-up scheduled or sent
    INTERVIEW       — Interview scheduled or completed
    OFFER           — Job offer received
    ACCEPTED        — Offer accepted
    REJECTED        — Application rejected (at any stage)
    WITHDRAWN       — Candidate withdrew application

Valid transitions:

    SAVED → ANALYZED
    SAVED → WITHDRAWN
    ANALYZED → READY_TO_APPLY
    ANALYZED → WITHDRAWN
    READY_TO_APPLY → APPLIED
    READY_TO_APPLY → WITHDRAWN
    APPLIED → FOLLOW_UP
    APPLIED → INTERVIEW
    APPLIED → REJECTED
    APPLIED → WITHDRAWN
    FOLLOW_UP → INTERVIEW
    FOLLOW_UP → REJECTED
    FOLLOW_UP → WITHDRAWN
    INTERVIEW → OFFER
    INTERVIEW → REJECTED
    INTERVIEW → WITHDRAWN
    OFFER → ACCEPTED
    OFFER → WITHDRAWN
    OFFER → REJECTED

Every transition:
    - Logs an application_event record
    - Updates applications.updated_at
    - Triggers n8n webhook (workflow 10) for Google Sheets sync
    - May trigger follow-up email if transition = APPLIED

---

## 18. n8n WORKFLOW REFERENCE

n8n Self-hosted URL: http://localhost:5678 (default)

Import workflows:
1. Open n8n UI at http://localhost:5678
2. Go to Workflows → Import from File
3. Import each JSON file from automation/n8n/workflows/

Required n8n credentials:
    Google OAuth 2.0 (for Gmail + Sheets)
        → Set up in n8n Credentials panel
        → Scope: gmail.send + spreadsheets
    Backend API base URL
        → Set as n8n environment variable: BACKEND_URL=http://backend:8000

Every workflow node has:
    On Error: Continue to Error Handler node
    Error Handler: Sets error details → Sends to error log endpoint
    Retry: 3 attempts, 5 second delay, exponential backoff

---

## 19. ENVIRONMENT VARIABLES (.env.example)

# ─── Application ───────────────────────────────────────────────────────
APP_NAME=ai-job-assistant
APP_ENV=development                         # development | staging | production
APP_VERSION=0.1.0
SECRET_KEY=CHANGE_THIS_TO_RANDOM_32_CHARS

# ─── Database ──────────────────────────────────────────────────────────
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/ai_job_assistant
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ai_job_assistant

# ─── LLM ───────────────────────────────────────────────────────────────
LLM_PROVIDER=gemini                         # gemini | ollama | auto
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
OLLAMA_EMBED_MODEL=nomic-embed-text
LLM_MAX_RETRIES=3
LLM_TIMEOUT_SECONDS=60

# ─── Scoring Weights (must sum to 1.0) ─────────────────────────────────
MATCH_REQUIRED_SKILL_WEIGHT=0.30
MATCH_PREFERRED_SKILL_WEIGHT=0.15
MATCH_EXPERIENCE_WEIGHT=0.15
MATCH_EDUCATION_WEIGHT=0.10
MATCH_PROJECT_WEIGHT=0.10
MATCH_SEMANTIC_WEIGHT=0.10
MATCH_ATS_KEYWORD_WEIGHT=0.10

# ─── Email ─────────────────────────────────────────────────────────────
GMAIL_ENABLED=false                         # true in production
GMAIL_CREDENTIALS_PATH=./credentials.json
GMAIL_TOKEN_PATH=./token.json
GMAIL_SENDER_EMAIL=your_email@gmail.com
MAILHOG_SMTP_HOST=localhost
MAILHOG_SMTP_PORT=1025

# ─── Storage ───────────────────────────────────────────────────────────
STORAGE_BACKEND=local                       # local | minio (future)
STORAGE_LOCAL_PATH=./storage
MAX_FILE_SIZE_MB=10

# ─── n8n ───────────────────────────────────────────────────────────────
N8N_URL=http://localhost:5678
N8N_WEBHOOK_SECRET=CHANGE_THIS_TO_RANDOM

# ─── Google Sheets ─────────────────────────────────────────────────────
GOOGLE_SHEETS_ENABLED=false
GOOGLE_SHEETS_ID=your_sheet_id_here

# ─── Logging ───────────────────────────────────────────────────────────
LOG_LEVEL=INFO                              # DEBUG | INFO | WARNING | ERROR
LOG_FORMAT=json                             # json | text

# ─── Authentication (Phase 2) ──────────────────────────────────────────
AUTH_ENABLED=false
JWT_SECRET=CHANGE_THIS_TO_RANDOM_64_CHARS
JWT_EXPIRE_MINUTES=60
JWT_REFRESH_EXPIRE_DAYS=30

---

## 20. DOCKER COMPOSE REFERENCE

Services:

postgres:
    image: pgvector/pgvector:pg16
    ports: 5432:5432
    volumes: postgres_data:/var/lib/postgresql/data
    environment: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB
    healthcheck: pg_isready

ollama:
    image: ollama/ollama:latest
    ports: 11434:11434
    volumes: ollama_data:/root/.ollama
    deploy.resources.reservations.devices: gpu (if available)
    # After startup: docker exec ollama ollama pull qwen2.5:7b
    # After startup: docker exec ollama ollama pull nomic-embed-text

n8n:
    image: n8nio/n8n:latest
    ports: 5678:5678
    volumes: n8n_data:/home/node/.n8n
    environment: DB_TYPE=postgresdb (use same postgres instance)
    depends_on: postgres

backend:
    build: ./backend
    ports: 8000:8000
    volumes: ./storage:/app/storage
    environment: (all backend env vars)
    depends_on: postgres, ollama
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

frontend:
    build: ./frontend
    ports: 3000:3000
    environment: NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on: backend

mailhog:
    image: mailhog/mailhog
    ports: 1025:1025 (SMTP), 8025:8025 (Web UI)
    profiles: [dev]                         # Only in dev; exclude from prod

volumes:
    postgres_data:
    ollama_data:
    n8n_data:

---

## 21. TESTING STRATEGY

### Unit Tests (no external dependencies)

    tests/unit/test_resume_parser.py
        - test_pdf_extraction_returns_text
        - test_docx_extraction_returns_text
        - test_empty_pdf_raises_error
        - test_oversized_file_raises_error
        - test_text_cleaned_correctly

    tests/unit/test_jd_extractor.py
        - test_mandatory_skills_extracted
        - test_preferred_skills_classified
        - test_missing_fields_return_null

    tests/unit/test_scoring_engine.py
        - test_weights_sum_to_one
        - test_perfect_match_returns_100
        - test_zero_match_returns_0
        - test_education_mapping_correct
        - test_experience_scoring_rules
        - test_llm_cannot_override_score

    tests/unit/test_skill_matcher.py
        - test_exact_skill_match
        - test_case_insensitive_match
        - test_alias_skill_match
        - test_no_match_returns_empty

    tests/unit/test_gap_analyzer.py
        - test_missing_skill_classified_correctly
        - test_partial_skill_classified_correctly
        - test_transferable_skill_identified
        - test_no_fabrication_in_output

    tests/unit/test_ats_analyzer.py
        - test_keyword_coverage_calculation
        - test_formatting_flags_tables
        - test_score_breakdown_correct

    tests/unit/test_document_generator.py
        - test_no_skills_invented
        - test_no_companies_invented
        - test_no_metrics_invented
        - test_keywords_added_only_if_present_in_source

### Integration Tests (with test database)

    tests/integration/test_resume_api.py
        - test_upload_pdf_succeeds
        - test_upload_invalid_type_fails
        - test_get_resume_by_id
        - test_delete_resume

    tests/integration/test_match_api.py
        - test_match_returns_all_scores
        - test_match_gap_analysis_complete
        - test_match_ats_analysis_complete

    tests/integration/test_generate_api.py
        - test_generate_resume_truthful
        - test_generate_cover_letter
        - test_generate_email
        - test_generate_report

    tests/integration/test_application_api.py
        - test_create_application
        - test_valid_status_transition
        - test_invalid_status_transition_rejected
        - test_event_logged_on_transition

### E2E Tests (Playwright)

    tests/e2e/specs/resume_upload.spec.ts
        - Upload PDF → parsed data visible in UI

    tests/e2e/specs/job_analysis.spec.ts
        - Paste JD → structured JD visible in UI

    tests/e2e/specs/full_workflow.spec.ts
        - Upload resume → paste JD → view match → generate documents → approve

---

## 22. SECURITY & PRIVACY RULES

File validation:
    - Accept only: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain
    - Max size: 10MB (configurable)
    - Virus scan hook (optional; ClamAV integration documented but optional)
    - Files saved with UUID name (not original filename) to prevent path traversal
    - Original filename stored in DB only

API security:
    - All API endpoints validate Content-Type
    - File uploads validate MIME type server-side (not just extension)
    - Request size limits enforced at FastAPI middleware level
    - SQL injection prevented by SQLAlchemy ORM (parameterized queries only)
    - No raw SQL strings anywhere

Secret management:
    - All secrets in .env only
    - .env added to .gitignore
    - .env.example has no real values; only placeholder text
    - Gmail credentials.json and token.json never committed
    - Secret key rotation documented

Logging:
    - Never log raw resume content
    - Never log email addresses in debug logs (mask to first 3 chars + ***)
    - Never log API keys or secrets
    - Structured logs with request_id for tracing without exposing PII

Data retention:
    - DELETE /resume/{id} removes: file from storage + all derived data
    - Application deletion cascades to all generated documents and reports
    - No data sent to third parties except:
        a. Gemini (if LLM_PROVIDER=gemini) — clearly documented
        b. Gmail API — only when email send is triggered by user
        c. Google Sheets — only when GOOGLE_SHEETS_ENABLED=true

Privacy-by-design:
    - Default: LLM_PROVIDER=ollama (fully local)
    - Gemini requires explicit opt-in via config
    - All cloud provider usage documented in README

---

## 23. OBSERVABILITY & LOGGING

Log format (JSON):

    {
      "timestamp": "2026-08-25T10:23:45.123Z",
      "level": "INFO",
      "request_id": "uuid",
      "module": "ai.matching.scoring_engine",
      "event": "score_calculated",
      "resume_id": "uuid",
      "job_id": "uuid",
      "overall_score": 87.3,
      "duration_ms": 234
    }

Key events logged:

    resume.upload.started          {file_name, file_size, file_type}
    resume.upload.completed        {resume_id, duration_ms}
    resume.parse.started           {resume_id}
    resume.parse.completed         {resume_id, fields_extracted, duration_ms}
    resume.parse.failed            {resume_id, error, duration_ms}

    jd.analyze.started             {job_id}
    jd.analyze.completed           {job_id, skills_extracted, duration_ms}

    llm.call.started               {provider, model, prompt_hash}
    llm.call.completed             {provider, tokens_used, duration_ms}
    llm.call.retry                 {provider, attempt, error}
    llm.call.failed                {provider, attempts, error}
    llm.validation.failed          {schema, errors}
    llm.validation.repaired        {schema, changes_made}

    match.score.calculated         {resume_id, job_id, overall_score, all_sub_scores}
    gap.analysis.completed         {match_id, missing_count, partial_count}
    ats.analysis.completed         {match_id, ats_score}

    generate.resume.started        {match_id}
    generate.resume.completed      {document_id, duration_ms}
    generate.truthfulness.violation {document_id, violation_type, detail}

    application.status.changed     {application_id, from_status, to_status}
    email.sent                     {application_id, to_masked, subject}

    db.query.slow                  {query_hash, duration_ms} (> 1000ms threshold)

---

## 24. FUTURE EXTENSIONS

The following are NOT implemented in Phase 1 but the architecture supports them:

Job Discovery:
    - LinkedIn job scraper (browser automation via Playwright)
    - Indeed API integration
    - Wellfound (AngelList) integration
    - Company career page monitoring
    - Duplicate job detection (pgvector similarity check)
    - Job alert system (daily digest email)

AI Agents:
    - MCP (Model Context Protocol) integrations
    - Agentic job application flow (auto-fill forms with Playwright)
    - Interview preparation agent
    - Interview question generator (based on JD + resume gaps)
    - Company research agent

Analytics:
    - Match score trends over time
    - Skills most frequently missing
    - Application success rate by role type
    - Best time to apply (data from own application history)
    - Salary analysis by role/company/location

Multi-profile:
    - Multiple candidate profiles (useful for career coaching use case)
    - Resume version manager (A/B test different resume versions)

Browser Extension:
    - One-click JD capture from any job board
    - Auto-trigger analysis pipeline

---

## 25. GOLDEN RULES (NEVER VIOLATE)

RULE 1: NEVER FABRICATE
    The system must never invent any resume information.
    Skills, experience, companies, metrics, projects, education,
    certifications — if not in the source resume, they do not appear
    in any output. No exceptions.

RULE 2: NEVER TRUST LLM OUTPUT BLINDLY
    Every LLM response is: parsed → schema-validated → business-rule-checked.
    Failed validation = retry (max 3). All retries failed = error; never
    silently pass invalid data to the database or the user.

RULE 3: LLM DOES NOT DETERMINE FINAL SCORE
    The match score is calculated deterministically.
    The LLM explains the score in plain language.
    The LLM never overrides the calculated number.

RULE 4: NEVER COMMIT SECRETS
    No API keys, passwords, tokens, or credentials in code.
    No credentials.json, token.json, or .env files committed.
    Only .env.example (with placeholder values) is committed.

RULE 5: EVERY MODULE HAS TESTS
    No module is complete without unit tests.
    No integration is complete without integration tests.
    Tests use real sample data (not mocked LLM responses for parsing tests).

RULE 6: EVERY STAGE WAITS FOR APPROVAL
    Plan → Technology Options → WAIT → Approve → Implement → Test →
    Document → WAIT → Next Module.
    No stage is skipped. No code written before stack is confirmed.

RULE 7: SEPARATE CONCERNS
    API routers do not contain business logic.
    Business logic lives in services.
    Database operations live in repositories.
    AI operations live in ai/ module.
    Prompts live in ai/prompts/ as text files.
    No giant files. No giant functions.

RULE 8: CONFIGURABILITY
    Scoring weights, LLM provider, model names, file size limits,
    API URLs — all environment variables. Nothing hardcoded.

RULE 9: FAIL LOUDLY
    When something goes wrong, log it, raise an exception, return an error.
    Never silently swallow errors. Never return empty/default data
    when the real operation failed.

RULE 10: YOU CHOOSE THE TECHNOLOGY, THE SYSTEM IMPLEMENTS IT
    At every major decision point: explain options → wait for choice → build.
    Never assume. Never auto-proceed.

---

## QUICK START (after stack is confirmed and modules are built)

    # Clone repo
    git clone https://github.com/yourusername/ai-job-assistant
    cd ai-job-assistant

    # Copy and fill environment variables
    cp .env.example .env
    # Edit .env with your Gemini API key and other values

    # Start all services
    docker compose up -d

    # Pull Ollama models (first time only)
    docker exec ollama ollama pull qwen2.5:7b
    docker exec ollama ollama pull nomic-embed-text

    # Run database migrations
    docker exec backend alembic upgrade head

    # Seed development data (optional)
    docker exec backend python -m app.db.seed

    # Import n8n workflows
    # Open http://localhost:5678 → Workflows → Import from File
    # Import each file from automation/n8n/workflows/

    # Access the application
    Frontend:  http://localhost:3000
    Backend:   http://localhost:8000/docs (OpenAPI)
    n8n:       http://localhost:5678
    Mailhog:   http://localhost:8025

    # Run tests
    make test

---

## CURRENT STATUS

Module 1 (Architecture & Tech Selection): COMPLETE — Stack B selected (pending confirmation)

All subsequent modules: PENDING — awaiting technology selection confirmation from user.

Next action required: Confirm "Stack B" or specify alternative choices.
After confirmation: Begin Module 2 (Project Foundation).

---

END OF MASTER DOCUMENTATION
