# AI Job Assistant

A production-quality, AI-powered job application copilot. It parses your
resume, analyzes a job description, computes an explainable match score,
identifies skill gaps, checks ATS compatibility, and generates truthful,
ATS-optimized application documents (resume, cover letter, email) —
then tracks the application end to end.

Full architecture, stack rationale, database schema, module roadmap,
and golden rules live in `AI_JOB_ASSISTANT_MASTER_DOCUMENTATION.md`.

## Current status

**Modules 2–17 (Foundation through n8n Workflows): implemented.**

Every layer described in the master documentation is real, working
code — not stubs — and has been verified as far as this build
environment allows:

- **AI layer** (parsers, LLM providers, extractors, deterministic
  scoring/gap/ATS analysis, generation with a truthfulness checker,
  embeddings): fully implemented, **44/44 unit tests passing**
  against real logic (including generated PDF/DOCX fixtures and a
  stubbed LLM provider).
- **Backend** (10 SQLAlchemy models + Alembic migration, all Pydantic
  schemas, all 6 services including a real application-status FSM,
  all 6 API routers): fully implemented. The FastAPI app boots and
  every documented endpoint resolves (verified via `/openapi.json`);
  `/health` degrades gracefully instead of crashing when Postgres is
  unreachable.
- **n8n**: 11 real, JSON-validated, importable workflow files.
- **Frontend**: a working Next.js 14 app (dashboard, resume
  upload/detail, job analysis/detail, match report with a live score
  visualization, document generation, application tracker with FSM
  transition buttons) — **`npm run build` succeeds**, all pages
  compile and type-check.
- **Tests**: 44 unit tests pass for real. 12 integration tests and 3
  Playwright e2e specs are written as real (not stub) test code, gated
  behind a live-Postgres/live-stack check — they skip with a clear
  reason (`No reachable Postgres...`) rather than silently passing
  when no DB/stack is running, which is the case in the sandbox this
  was built in.

**What still needs a live environment to fully exercise:** actually
running `docker compose up` (Postgres, Ollama, n8n import, a real
Gemini API key) was not possible inside the build sandbox itself — no
Docker runtime, no reachable Postgres/Ollama/Gemini endpoints. Every
piece of code is written and locally verified wherever this sandbox
could do so (pure logic, FastAPI TestClient, `tsc`/`next build`); the
remaining gap is genuinely a live-infrastructure gap, not missing code.


## Quick start

```bash
# 1. Copy and fill environment variables
cp .env.example .env
# Edit .env: at minimum set GEMINI_API_KEY if LLM_PROVIDER=gemini

# 2. Start the foundation services (db + backend; add --profile dev for mailhog)
docker compose up -d postgres backend

# 3. Check health
curl http://localhost:8000/health

# 4. API docs
open http://localhost:8000/docs
```

Full stack (adds ollama, n8n, frontend, mailhog):

```bash
docker compose --profile dev up -d
```

Run tests:

```bash
make test              # all backend tests (unit always run; integration skip without a live DB)
cd frontend && npm run build   # verify the frontend compiles
cd tests/e2e && npx playwright test   # requires the full stack running
```

## Repository layout

```
backend/     FastAPI modular monolith (API routers, services, models, db)
ai/          LLM providers, prompts, parsers, extractors, matching, ATS,
             document generation, validation, embeddings
automation/  n8n workflow definitions (orchestration layer, outside backend)
frontend/    Next.js 14 dashboard (App Router + Tailwind + shadcn/ui)
storage/     Local filesystem storage for uploads, generated docs, reports
tests/       Root-level e2e (Playwright) specs
docs/        Architecture, workflow, prompt, and scoring documentation
```

See `docs/architecture.md` for the request flow and `docs/troubleshooting.md`
for common setup issues.

## Development commands

See the `Makefile`: `make dev`, `make test`, `make migrate`, `make lint`,
`make format`.

## Golden rules (from the master doc — never violated by this codebase)

1. Never fabricate resume content.
2. Never trust LLM output blindly — always schema-validate.
3. The LLM never determines the final match score (deterministic only).
4. Never commit secrets.
5. Every module has tests.
6. Every stage waits for approval before the next begins.
7. Separation of concerns (routers → services → repositories/db, AI isolated).
8. Everything configurable via environment variables.
9. Fail loudly — no silent error swallowing.
10. You choose the technology; the system implements it.
