# AI Job Assistant — Comprehensive Project Documentation

> **Auto-generated documentation** based on thorough inspection of every source file, configuration, and asset in the project.
> Generated: 2026-08-26

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture & Design Philosophy](#2-architecture--design-philosophy)
3. [Project Structure](#3-project-structure)
4. [Technology Stack](#4-technology-stack)
5. [Backend Deep Dive](#5-backend-deep-dive)
6. [AI Layer Deep Dive](#6-ai-layer-deep-dive)
7. [Frontend Deep Dive](#7-frontend-deep-dive)
8. [Automation Layer (n8n)](#8-automation-layer-n8n)
9. [Database Schema](#9-database-schema)
10. [End-to-End Workflow / Data Flow](#10-end-to-end-workflow--data-flow)
11. [API Endpoints Reference](#11-api-endpoints-reference)
12. [Configuration Reference](#12-configuration-reference)
13. [Testing Strategy](#13-testing-strategy)
14. [Running the Project](#14-running-the-project)
15. [Golden Rules](#15-golden-rules)
16. [Issues, Gaps & Recommendations](#16-issues-gaps--recommendations)

---

## 1. Project Overview

**AI Job Assistant** is a production-quality, AI-powered job application copilot that:

1. **Parses resumes** — Extracts structured data from PDF, DOCX, or TXT resumes using file parsers and LLM-powered extraction.
2. **Analyzes job descriptions** — Ingests job postings (pasted text or URL), extracts structured requirements, skills, and metadata.
3. **Computes explainable match scores** — Uses a **deterministic** weighted scoring engine (the LLM never determines the score) across 7 dimensions: required skills, preferred skills, experience, education, projects, semantic similarity, and ATS keyword coverage.
4. **Identifies skill gaps** — Classifies skills as strong match, partial match, missing, or transferable.
5. **Checks ATS compatibility** — Analyzes keyword coverage and formatting issues that could cause ATS rejections.
6. **Generates truthful, ATS-optimized documents** — Creates tailored resumes, cover letters, and application emails. Every generated document passes through a deterministic **truthfulness checker** that flags fabricated metrics, skills, or companies.
7. **Tracks applications end-to-end** — Implements a full FSM (Finite State Machine) for application lifecycle management: DRAFT → READY → APPLIED → IN_REVIEW → INTERVIEWING → OFFER/REJECTED/WITHDRAWN.

---

## 2. Architecture & Design Philosophy

### High-Level Architecture

```
┌──────────────────────┐     REST/WS      ┌──────────────────────────────────────┐
│   Next.js Frontend   │ ───────────────▶  │  FastAPI Backend (Modular Monolith)  │
│   (Port 3000)        │                   │  (Port 8000)                         │
└──────────────────────┘                   └──────────┬───────────────────────────┘
                                                      │
                                       ┌──────────────┼──────────────┐
                                       │              │              │
                               ┌───────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
                               │  PostgreSQL   │ │   AI     │ │   n8n       │
                               │  + pgvector   │ │  Layer   │ │ (Port 5678) │
                               │  (Port 5432)  │ │ Gemini/  │ │ Orchestrator│
                               └──────────────┘ │ Ollama   │ └─────────────┘
                                                 └──────────┘
```

### Design Principles

- **Separation of concerns**: Routers → Services → Repositories/DB; AI layer is fully isolated
- **Deterministic scoring**: The LLM **never** determines match scores (Golden Rule 3)
- **Truthfulness contract**: Generated content is verified against source resume data; fabrication causes loud failures (Golden Rule 1 + 9)
- **LLM output validation**: Every LLM response is schema-validated via JSON Schema (Golden Rule 2)
- **Configuration via environment**: Everything configurable via `.env` (Golden Rule 8)
- **Fail loudly**: No silent error swallowing — custom exception hierarchy with proper HTTP status codes (Golden Rule 9)

---

## 3. Project Structure

```
ai-job-assistant/
├── .env.example                    # Environment variable template (62 vars)
├── .gitignore                      # Git ignore rules
├── docker-compose.yml              # Full stack: postgres, backend, ollama, n8n, frontend, mailhog
├── Makefile                        # Dev commands: dev, test, migrate, lint, format
├── README.md                       # Quick-start guide
├── AI_JOB_ASSISTANT_MASTER_DOCUMENTATION.md  # 94KB master design document
│
├── ai/                             # 🤖 AI Layer (LLM-free logic + LLM integration)
│   ├── __init__.py
│   ├── parsers/                    # File parsing (PDF via PyMuPDF, DOCX via python-docx, TXT)
│   │   ├── resume_parser.py        # Multi-format resume parser
│   │   ├── jd_parser.py            # Job description parser (text + URL via httpx)
│   │   └── text_cleaner.py         # Whitespace/unicode normalization
│   ├── extractors/                 # LLM-powered structured data extraction
│   │   ├── resume_extractor.py     # Resume → structured ResumeData JSON
│   │   └── jd_extractor.py         # JD → structured JobData JSON
│   ├── providers/                  # LLM provider abstraction
│   │   ├── base.py                 # Abstract base with retry logic (tenacity)
│   │   ├── gemini.py               # Google Gemini REST API (httpx, no SDK)
│   │   ├── ollama.py               # Ollama local LLM
│   │   └── factory.py              # Provider factory (gemini/ollama/auto)
│   ├── matching/                   # Deterministic matching pipeline
│   │   ├── scoring_engine.py       # Weighted 7-dimension score calculator
│   │   ├── skill_matcher.py        # Fuzzy skill name matching
│   │   ├── semantic_matcher.py     # Cosine similarity between embeddings
│   │   └── gap_analyzer.py         # Skill gap classification
│   ├── ats/                        # ATS compatibility analysis
│   │   ├── ats_analyzer.py         # Keyword coverage + formatting checks
│   │   └── keyword_extractor.py    # Extract ATS keywords from JD
│   ├── generation/                 # Document generation
│   │   ├── resume_optimizer.py     # ATS-optimized resume generation
│   │   ├── cover_letter_generator.py  # Cover letter generation
│   │   ├── email_generator.py      # Application email generation
│   │   ├── report_generator.py     # Narrative report generation
│   │   └── truthfulness_checker.py # Deterministic fabrication detection
│   ├── embeddings/                 # Vector embeddings
│   │   └── embedder.py             # Text → 768-dim vector (via Ollama nomic-embed-text)
│   ├── validation/                 # LLM output validation
│   │   ├── validator.py            # JSON Schema validation wrapper
│   │   └── schemas/                # JSON Schema files for LLM outputs
│   └── prompts/                    # 9 prompt templates (txt files)
│       ├── resume_extraction.txt
│       ├── jd_extraction.txt
│       ├── skill_matching.txt
│       ├── gap_analysis.txt
│       ├── ats_analysis.txt
│       ├── resume_optimization.txt
│       ├── cover_letter.txt
│       ├── application_email.txt
│       └── report_generation.txt
│
├── backend/                        # 🖥️ FastAPI Backend
│   ├── Dockerfile                  # Python 3.11-slim container
│   ├── requirements.txt            # 19 production dependencies
│   ├── requirements-dev.txt        # 8 dev dependencies (pytest, black, ruff, mypy)
│   ├── alembic.ini                 # Alembic migration config
│   ├── pytest.ini                  # Pytest config (asyncio_mode=auto)
│   ├── app/
│   │   ├── main.py                 # FastAPI app factory with CORS, exception handler, lifespan
│   │   ├── dependencies.py         # Shared DI: DB session, LLM provider, user ID
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic Settings (all env vars + weight validation)
│   │   │   ├── exceptions.py       # 8 custom exceptions with HTTP status codes
│   │   │   ├── logging.py          # Structured JSON logging (structlog)
│   │   │   └── security.py         # File extension + magic byte validation
│   │   ├── db/
│   │   │   ├── session.py          # Async SQLAlchemy engine + session factory
│   │   │   ├── seed.py             # Database seeder
│   │   │   └── migrations/         # Alembic migrations
│   │   ├── models/                 # 10 SQLAlchemy ORM models
│   │   │   ├── base.py             # DeclarativeBase + UUID/Timestamp mixins
│   │   │   ├── user.py             # Users table
│   │   │   ├── resume.py           # Resumes + pgvector embeddings
│   │   │   ├── job.py              # Jobs + JobRequirements
│   │   │   ├── skill.py            # Skills taxonomy + ResumeSkills join
│   │   │   ├── application.py      # Applications + ApplicationEvents (FSM)
│   │   │   ├── document.py         # GeneratedDocuments
│   │   │   └── analysis.py         # AnalysisReports
│   │   ├── schemas/                # 6 Pydantic API schemas
│   │   │   ├── resume.py, job.py, match.py, application.py, generation.py, common.py
│   │   ├── services/               # 7 business logic services
│   │   │   ├── resume_service.py   # Upload → parse → extract → embed → persist
│   │   │   ├── job_service.py      # JD → parse → extract → embed → persist
│   │   │   ├── matching_service.py # Full deterministic match pipeline
│   │   │   ├── generation_service.py # Resume + cover letter + email generation
│   │   │   ├── tracking_service.py # Application CRUD + FSM transitions
│   │   │   ├── email_service.py    # Gmail API (prod) / Mailhog SMTP (dev)
│   │   │   └── storage_service.py  # Local filesystem storage
│   │   └── api/v1/                 # 8 API routers
│   │       ├── router.py           # Router aggregator
│   │       ├── health.py           # GET /health
│   │       ├── resume.py           # CRUD /resume
│   │       ├── jobs.py             # POST /jobs/analyze, GET /jobs
│   │       ├── match.py            # POST /match
│   │       ├── generate.py         # POST /generate
│   │       ├── applications.py     # CRUD /applications + PATCH status
│   │       └── reports.py          # GET/POST /reports
│   └── tests/                      # Backend tests
│       ├── conftest.py             # Shared fixtures (client, db_available, db_session)
│       ├── fixtures/               # Test fixture data
│       ├── unit/                   # 9 unit test files (44 tests)
│       └── integration/            # 4 integration test files (12 tests, need live DB)
│
├── frontend/                       # 🎨 Next.js 14 Frontend
│   ├── Dockerfile                  # Node container
│   ├── package.json                # Next.js 14, React 18, Tailwind CSS 3, Playwright
│   ├── next.config.js              # Next.js configuration
│   ├── tailwind.config.js          # Tailwind theme with custom design tokens
│   ├── tsconfig.json               # TypeScript strict config
│   └── src/
│       ├── app/                    # App Router pages
│       │   ├── layout.tsx          # Root layout with sidebar navigation
│       │   ├── page.tsx            # Dashboard with health check + quick links
│       │   ├── globals.css         # Global styles
│       │   ├── resume/             # Resume upload and detail pages
│       │   ├── jobs/               # Job analysis and detail pages
│       │   ├── match/              # Match report with score visualization
│       │   ├── generate/           # Document generation page
│       │   └── applications/       # Application tracker with FSM buttons
│       ├── components/             # Reusable UI components
│       │   ├── ui/                 # Base UI primitives
│       │   ├── layout/             # Layout components
│       │   ├── resume/, jobs/, match/, generate/, applications/, shared/
│       ├── lib/
│       │   ├── api.ts              # Type-safe REST client (114 lines)
│       │   ├── constants.ts        # Shared constants
│       │   └── utils.ts            # Utility functions
│       └── types/                  # TypeScript type definitions
│           ├── resume.ts, job.ts, match.ts, generation.ts, application.ts
│
├── automation/                     # 🔄 n8n Orchestration Layer
│   └── n8n/
│       ├── README.md               # Setup instructions
│       └── workflows/              # 11 importable n8n workflow JSON files
│           ├── 01_resume_ingestion.json
│           ├── 02_jd_analysis.json
│           ├── 03_resume_matching.json
│           ├── 04_gap_analysis.json through 11_followup_reminder.json
│
├── storage/                        # 📁 Local file storage
│   ├── README.md                   # Storage layout docs
│   ├── resumes/                    # Uploaded resume files
│   ├── generated/                  # Generated documents
│   └── reports/                    # Analysis reports
│
├── tests/                          # 🧪 End-to-End Tests
│   ├── e2e/
│   │   ├── playwright.config.ts
│   │   ├── package.json
│   │   └── specs/                  # 3 Playwright e2e test specs
│   ├── integration/
│   └── unit/
│
└── docs/                           # 📚 Documentation
    ├── architecture.md             # Architecture diagram + overview
    ├── troubleshooting.md          # Common setup issues
    ├── prompts.md                  # Prompt documentation reference
    ├── scoring.md                  # Scoring documentation reference
    └── workflows.md                # Workflow documentation reference
```

---

## 4. Technology Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Python** | 3.11 | Backend runtime |
| **FastAPI** | 0.115.0 | Async REST API framework |
| **Uvicorn** | 0.30.6 | ASGI server |
| **SQLAlchemy** | 2.0.35 | Async ORM (asyncio mode) |
| **Alembic** | 1.13.2 | Database migrations |
| **asyncpg** | 0.29.0 | Async PostgreSQL driver |
| **Pydantic** | 2.9.2 | Data validation & settings |
| **pydantic-settings** | 2.5.2 | Environment-driven config |
| **pgvector** | 0.3.4 | Vector similarity (embeddings) |
| **structlog** | 24.4.0 | Structured JSON logging |
| **tenacity** | 9.0.0 | LLM retry logic |
| **httpx** | 0.27.2 | Async HTTP client (Gemini API) |
| **PyMuPDF** | 1.24.11 | PDF text extraction |
| **python-docx** | 1.1.2 | DOCX text extraction |
| **jsonschema** | 4.23.0 | LLM output validation |
| **google-api-python-client** | 2.147.0 | Gmail API integration |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 14.2 | React framework (App Router) |
| **React** | 18.3 | UI library |
| **TypeScript** | 5.5 | Type safety |
| **Tailwind CSS** | 3.4 | Utility-first styling |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Docker + Docker Compose** | Container orchestration |
| **PostgreSQL 16 + pgvector** | Primary database with vector search |
| **n8n** | Workflow automation/orchestration |
| **Ollama** | Local LLM inference (qwen2.5:7b + nomic-embed-text) |
| **Google Gemini** | Cloud LLM (primary, via REST API) |
| **Mailhog** | Dev email testing |

### Dev/Test Tools
| Tool | Purpose |
|---|---|
| **pytest** | Backend unit + integration tests |
| **Playwright** | E2E browser tests |
| **Black** | Python code formatting |
| **Ruff** | Python linting |
| **mypy** | Python type checking |

---

## 5. Backend Deep Dive

### FastAPI Application (`app/main.py`)
- **Factory pattern**: `create_app()` builds the FastAPI instance
- **CORS**: Open in development, restricted in production
- **Exception handler**: All `BaseAppException` subclasses are caught and returned as structured JSON `{error_code, message, details}`
- **Lifespan**: Startup/shutdown logging via structlog
- **Router mounting**: `/health` at root, all API routers under `/api/v1`

### Configuration (`app/core/config.py`)
- **62 environment variables** managed via Pydantic Settings
- **Scoring weights validation**: Sum of 7 `MATCH_*_WEIGHT` vars must equal 1.0 exactly
- **Cached singleton**: `get_settings()` uses `@lru_cache` for performance

### Services Layer
- **`resume_service.py`**: validate → parse → extract (LLM) → embed → persist
- **`job_service.py`**: parse JD → extract (LLM) → embed → persist
- **`matching_service.py`**: deterministic scoring pipeline (7 dimensions) → persist AnalysisReport
- **`generation_service.py`**: generate resume + cover letter + email → truthfulness check → persist
- **`tracking_service.py`**: Application CRUD + FSM transitions with event audit log
- **`email_service.py`**: Gmail API (production) or SMTP/Mailhog (dev)
- **`storage_service.py`**: Local filesystem abstraction

### Dependencies (`app/dependencies.py`)
- **DB session**: Yields async SQLAlchemy session per request
- **LLM provider**: Factory-cached singleton
- **User ID**: Fixed UUID (`00000000-...0001`) until Phase 2 auth

---

## 6. AI Layer Deep Dive

### LLM Providers
- **Abstract base** (`base.py`): `generate()` (text), `generate_structured()` (JSON-only), `embed()` (vectors)
- **Retry logic**: Shared via tenacity — exponential backoff, configurable max retries
- **Gemini** (`gemini.py`): Direct REST API via httpx (no SDK dependency)
- **Ollama** (`ollama.py`): Local inference via HTTP
- **Factory** (`factory.py`): `auto` mode tries Gemini first, falls back to Ollama

### Deterministic Match Pipeline (No LLM Involved)
1. **Skill Matching** (`skill_matcher.py`): Fuzzy string matching between resume and job skills
2. **Scoring Engine** (`scoring_engine.py`): Weighted sum across 7 dimensions with configurable weights
3. **Semantic Matcher** (`semantic_matcher.py`): Cosine similarity of pgvector embeddings
4. **Gap Analyzer** (`gap_analyzer.py`): Classifies skills as strong/partial/missing/transferable
5. **ATS Analyzer** (`ats_analyzer.py`): Keyword coverage + formatting issue detection

### Truthfulness Contract
- **`truthfulness_checker.py`**: 4 independent checks:
  1. No invented metrics (%, $, multipliers)
  2. No invented skills (missing skills shouldn't appear in output)
  3. No invented companies
  4. No invented ATS keywords
- Violations raise `TruthfulnessViolationError` — never silently fixed

### Prompt Templates
9 carefully crafted prompt templates in `ai/prompts/` for every LLM-touching operation.

---

## 7. Frontend Deep Dive

### Architecture
- **Next.js 14** with App Router
- **Sidebar navigation**: Dashboard, Resumes, Job Postings, Applications
- **Type-safe API client** (`lib/api.ts`): Full coverage of all backend endpoints

### Pages
| Route | Purpose |
|---|---|
| `/` | Dashboard — health check, system status, quick links |
| `/resume` | Resume upload (PDF/DOCX/TXT) and listing |
| `/resume/[id]` | Resume detail view with parsed data |
| `/jobs` | Job description analysis form |
| `/jobs/[id]` | Job detail view with requirements |
| `/match` | Run match and view score visualization |
| `/generate` | Generate optimized resume + cover letter + email |
| `/applications` | Application tracker with FSM status transition buttons |

---

## 8. Automation Layer (n8n)

### 11 Workflow Files
n8n operates as an **external orchestrator** — it calls backend REST endpoints via HTTP Request nodes. The backend never knows n8n exists.

| # | Workflow | Backend Endpoint |
|---|---|---|
| 01 | Resume Ingestion | POST /api/v1/resume |
| 02 | JD Analysis | POST /api/v1/jobs/analyze |
| 03 | Resume Matching | POST /api/v1/match |
| 04 | Gap Analysis | Part of match pipeline |
| 05 | ATS Analysis | Part of match pipeline |
| 06 | Resume Generation | POST /api/v1/generate |
| 07 | Cover Letter Generation | POST /api/v1/generate |
| 08 | Email Generation | POST /api/v1/generate |
| 09 | Report Generation | POST /api/v1/reports/{id}/narrative |
| 10 | Application Tracking | CRUD /api/v1/applications |
| 11 | Follow-up Reminder | Scheduled digest |

---

## 9. Database Schema

### Entity-Relationship Overview

```
┌──────────┐     1:N     ┌───────────┐     N:1     ┌──────────┐
│  users   │────────────▶│  resumes  │◀────────────│ resume_  │
│          │             │           │             │ skills   │
│ • email  │             │ • raw_text│             │ • years  │
│ • name   │             │ • parsed  │             │ • prof.  │
└──────────┘             │ • embed.  │             └──────────┘
     │                   └───────────┘                  │
     │ 1:N                    │                         │ N:1
     ▼                        │                    ┌──────────┐
┌────────────────┐            │                    │  skills  │
│  applications  │            │                    │ • name   │
│ • status (FSM) │            │                    │ • alias  │
│ • resume_id    │            │                    └──────────┘
│ • job_id       │            │
└────────────────┘            │
     │ 1:N                    │ N:1
     ▼                        ▼
┌────────────────┐    ┌──────────────────┐
│ application_   │    │ analysis_reports │    ┌──────────────┐
│ events         │    │ • overall_score  │    │    jobs      │
│ • from/to stat │    │ • sub_scores     │◀───│ • title      │
│ • note         │    │ • gap_analysis   │    │ • company    │
└────────────────┘    │ • ats_analysis   │    │ • raw_text   │
                      └──────────────────┘    │ • parsed     │
┌────────────────┐                            │ • embedding  │
│ generated_docs │                            └──────────────┘
│ • doc_type     │                                 │ 1:N
│ • content      │                                 ▼
│ • truthful?    │                            ┌──────────────┐
│ • approved?    │                            │ job_require- │
└────────────────┘                            │ ments        │
                                              │ • type       │
                                              │ • value      │
                                              │ • importance │
                                              └──────────────┘
```

### Tables (10 models)
1. **users** — email, full_name
2. **resumes** — user_id, file_name, storage_path, raw_text, parsed_data (JSONB), embedding (Vector 768)
3. **jobs** — title, company, source_url, raw_text, parsed_data (JSONB), embedding (Vector 768)
4. **job_requirements** — job_id, requirement_type, value, importance
5. **skills** — name, category, aliases (ARRAY)
6. **resume_skills** — resume_id, skill_id, years, proficiency, context
7. **applications** — user_id, resume_id, job_id, status (FSM), notes
8. **application_events** — application_id, from_status, to_status, note (audit trail)
9. **generated_documents** — application_id, document_type, content, changes_made, truthfulness_check_passed, approved
10. **analysis_reports** — resume_id, job_id, overall_score, recommendation, sub_scores, gap_analysis, ats_analysis, report_markdown

---

## 10. End-to-End Workflow / Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. RESUME UPLOAD                                                           │
│    User uploads PDF/DOCX/TXT → validate extension + magic bytes →          │
│    parse raw text (PyMuPDF/python-docx) → LLM extract structured data →    │
│    embed (768-dim vector via Ollama) → save file + persist Resume row       │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. JOB ANALYSIS                                                            │
│    User pastes JD text or URL → clean text → LLM extract structured data   │
│    (title, company, skills, requirements) → embed → persist Job +          │
│    JobRequirement rows                                                      │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. DETERMINISTIC MATCH (NO LLM)                                            │
│    Fetch Resume + Job → compute:                                           │
│    • Required skill score (fuzzy matching)                                  │
│    • Preferred skill score                                                  │
│    • Experience score (years comparison)                                    │
│    • Education score (level ranking)                                        │
│    • Project score                                                          │
│    • Semantic score (cosine similarity of embeddings)                       │
│    • ATS keyword coverage score                                             │
│    → Weighted sum → overall_score → recommendation (STRONGLY_APPLY /       │
│      APPLY / APPLY_WITH_CAUTION / IMPROVE_FIRST / DO_NOT_APPLY)            │
│    → Classify skill gaps → Persist AnalysisReport                          │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. DOCUMENT GENERATION                                                     │
│    Create Application (DRAFT) → Generate:                                  │
│    • Optimized resume (LLM + gap analysis + ATS keywords)                  │
│    • Cover letter (LLM)                                                    │
│    • Application email (LLM with subject + body)                           │
│    → Each document passes truthfulness checker →                           │
│    → Persist GeneratedDocuments                                            │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. APPLICATION TRACKING (FSM)                                              │
│    DRAFT → READY → APPLIED → IN_REVIEW → INTERVIEWING → OFFER             │
│                        ↓         ↓            ↓                            │
│                   WITHDRAWN   REJECTED    REJECTED                         │
│    Every transition creates an ApplicationEvent audit log entry             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. API Endpoints Reference

### Health
| Method | Path | Description |
|---|---|---|
| GET | `/health` | System health (DB, LLM provider status) |

### Resume (under `/api/v1`)
| Method | Path | Description |
|---|---|---|
| POST | `/resume` | Upload + parse + extract resume |
| GET | `/resume` | List current user's resumes |
| GET | `/resume/{id}` | Get single resume |
| DELETE | `/resume/{id}` | Delete resume |

### Jobs (under `/api/v1`)
| Method | Path | Description |
|---|---|---|
| POST | `/jobs/analyze` | Analyze job description |
| GET | `/jobs` | List analyzed jobs |
| GET | `/jobs/{id}` | Get single job |

### Match (under `/api/v1`)
| Method | Path | Description |
|---|---|---|
| POST | `/match` | Run deterministic match pipeline |

### Generate (under `/api/v1`)
| Method | Path | Description |
|---|---|---|
| POST | `/generate` | Generate resume + cover letter + email |

### Applications (under `/api/v1`)
| Method | Path | Description |
|---|---|---|
| POST | `/applications` | Create application |
| GET | `/applications` | List user's applications |
| GET | `/applications/{id}` | Get single application |
| PATCH | `/applications/{id}/status` | FSM status transition |

### Reports (under `/api/v1`)
| Method | Path | Description |
|---|---|---|
| GET | `/reports/{id}` | Get analysis report |
| POST | `/reports/{id}/narrative` | LLM-narrate existing report |
| POST | `/reports/{id}/send` | Email report to user |

---

## 12. Configuration Reference

All configuration is via environment variables (see `.env.example`):

| Category | Key Variables |
|---|---|
| **Application** | `APP_NAME`, `APP_ENV`, `APP_VERSION`, `SECRET_KEY` |
| **Database** | `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` |
| **LLM** | `LLM_PROVIDER` (gemini/ollama/auto), `GEMINI_API_KEY`, `GEMINI_MODEL`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL` |
| **Scoring** | 7 `MATCH_*_WEIGHT` vars (must sum to 1.0) |
| **Email** | `GMAIL_ENABLED`, `GMAIL_CREDENTIALS_PATH`, `MAILHOG_SMTP_HOST/PORT` |
| **Storage** | `STORAGE_BACKEND` (local/minio), `STORAGE_LOCAL_PATH`, `MAX_FILE_SIZE_MB` |
| **n8n** | `N8N_URL`, `N8N_WEBHOOK_SECRET` |
| **Auth (Phase 2)** | `AUTH_ENABLED`, `JWT_SECRET`, `JWT_EXPIRE_MINUTES` |
| **Logging** | `LOG_LEVEL`, `LOG_FORMAT` (json/text) |

---

## 13. Testing Strategy

### Unit Tests (44 tests — backend/tests/unit/)
- `test_scoring_engine.py` — Weighted score calculation edge cases
- `test_skill_matcher.py` — Fuzzy skill matching logic
- `test_gap_analyzer.py` — Skill gap classification
- `test_ats_analyzer.py` — ATS keyword coverage + formatting detection
- `test_resume_parser.py` — Multi-format resume parsing (fixtures: PDF, DOCX, TXT)
- `test_jd_extractor.py` — JD extraction with stubbed LLM
- `test_document_generator.py` — Document generation with truthfulness checks
- `test_matching_service_helpers.py` — Education/experience helper functions
- `test_tracking_fsm.py` — Application FSM transition validation

### Integration Tests (12 tests — backend/tests/integration/)
- `test_resume_api.py` — Full resume upload + parse + persist flow
- `test_match_api.py` — Full match pipeline
- `test_generate_api.py` — Full document generation
- `test_application_api.py` — Application CRUD + FSM transitions
- **Requires live Postgres** — auto-skip with `"No reachable Postgres"` message

### E2E Tests (3 specs — tests/e2e/)
- Playwright browser tests against the full running stack
- **Requires full stack running** (`docker compose --profile dev up -d`)

---

## 14. Running the Project

### Prerequisites
- Docker Engine + Docker Compose
- Git (for cloning)
- (Optional) Python 3.11, Node.js 20+ for local development

### Quick Start

```bash
# 1. Copy and configure environment variables
cp .env.example .env
# Edit .env: set GEMINI_API_KEY if using Gemini, or set LLM_PROVIDER=ollama

# 2. Start core services (Postgres + Backend)
docker compose up -d postgres backend

# 3. Verify health
curl http://localhost:8000/health

# 4. View API docs
open http://localhost:8000/docs
```

### Full Stack (adds Ollama, n8n, Frontend, Mailhog)
```bash
docker compose --profile dev up -d
```

### Running Tests
```bash
make test                              # All backend tests
cd frontend && npm run build           # Verify frontend compiles
cd tests/e2e && npx playwright test    # E2E (requires full stack)
```

---

## 15. Golden Rules

These rules are **never violated** by this codebase:

1. **Never fabricate resume content** — enforced by truthfulness_checker.py
2. **Never trust LLM output blindly** — always schema-validate via JSON Schema
3. **The LLM never determines the final match score** — deterministic scoring only
4. **Never commit secrets** — .env, credentials.json, token.json in .gitignore
5. **Every module has tests** — 44 unit + 12 integration + 3 e2e
6. **Every stage waits for approval** before the next begins
7. **Separation of concerns** — routers → services → repositories/DB, AI isolated
8. **Everything configurable via environment variables** — 62 env vars
9. **Fail loudly** — no silent error swallowing, 8 custom exception types
10. **You choose the technology; the system implements it**

---

## 16. Issues, Gaps & Recommendations

### Current Issues Found

| # | Issue | Severity | Details |
|---|---|---|---|
| 1 | **No `.env` file exists** | 🟡 Medium | Only `.env.example` present; must copy and configure before running |
| 2 | **No `node_modules` in frontend** | 🟡 Medium | `npm install` needed before local frontend dev |
| 3 | **No `postcss.config.js` in frontend** | 🟡 Medium | Required by Tailwind CSS; may cause build issues |
| 4 | **Default user ID is hardcoded** | 🟡 Medium | `dependencies.py` uses fixed UUID until Phase 2 auth |
| 5 | **Gemini API key required** | 🟡 Medium | Default LLM_PROVIDER=gemini but no key set; resume upload and job analysis will fail without it |
| 6 | **Gmail OAuth not wired** | 🟢 Low | `send_via_gmail()` raises ConfigurationError without real credentials |
| 7 | **Health router included twice** | 🟢 Low | `router.py` includes `health.router` AND `main.py` also includes it separately; the `/health` endpoint at root is fine but `health.router` is also mounted under `/api/v1/health` |

### Missing Dependencies / Features (Phase 2)

- **Authentication** — JWT auth system is designed but `AUTH_ENABLED=false`
- **MinIO storage** — Only local filesystem implemented; `STORAGE_BACKEND=minio` not yet functional
- **Google Sheets integration** — Configured but `GOOGLE_SHEETS_ENABLED=false`
- **Database seeder** — `seed.py` exists but needs a running DB to populate

### Recommendations

1. **Add `postcss.config.js`** for the frontend (needed for Tailwind CSS)
2. **Add a `default_user` seed** — Create the hardcoded user UUID in the DB so FK constraints are satisfied
3. **Add `LLM_PROVIDER=ollama` as default** for easier local development without API keys
4. **Add rate limiting** to API endpoints (especially LLM-heavy ones like `/generate`)
5. **Add pagination** to list endpoints (`GET /resume`, `GET /jobs`, `GET /applications`)
6. **Add API versioning strategy** documentation for future v2 migration
7. **Add WebSocket support** for real-time progress updates during long-running LLM operations
8. **Containerize tests** so `make test` works without manual setup
9. **Add CI/CD pipeline** configuration (GitHub Actions / GitLab CI)
10. **Add monitoring** — health endpoint is present, but consider Prometheus metrics and Sentry error tracking
