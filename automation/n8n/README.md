# n8n Workflows

n8n is the automation/orchestration layer. It lives OUTSIDE the backend
and calls backend REST endpoints (`/api/v1/...`) via HTTP Request nodes.
The backend never knows n8n exists (see section 3, Architecture Decision).

STATUS: STUB — the 11 workflow JSON files below are built and exported
in Module 13, after the API endpoints they call (Modules 3–12) exist.

Planned workflows:
1.  01_resume_ingestion.json         — file upload trigger -> POST /resume
2.  02_jd_analysis.json              — JD paste/URL -> POST /jobs/analyze
3.  03_resume_matching.json          — POST /match orchestration
4.  04_gap_analysis.json             — gap analysis step
5.  05_ats_analysis.json             — ATS analysis step
6.  06_resume_generation.json        — POST /generate/resume
7.  07_cover_letter_generation.json  — POST /generate/cover-letter
8.  08_email_generation.json         — POST /generate/email
9.  09_report_generation.json        — POST /reports + assemble
10. 10_application_tracking.json     — application CRUD + Google Sheets sync
11. 11_followup_reminder.json        — scheduled follow-up digest

## Setup (once Module 13 workflows exist)

1. `docker compose --profile dev up -d n8n`
2. Open http://localhost:5678
3. Workflows -> Import from File -> select each file in `workflows/`
4. Configure Gmail / Google Sheets credentials inside n8n's credential store
   (never stored in this repo — see section 22, Security & Privacy Rules)

## Environment variable required inside n8n

Every workflow's HTTP Request node targets `{{$env.BACKEND_URL}}`. Set
this once in n8n's own environment (Settings -> Variables, or via
`N8N_ENV_BACKEND_URL` in docker-compose) to `http://backend:8000`
(the service name from docker-compose.yml, since n8n and backend run
as sibling containers on the same Docker network).

## Status of the 11 workflow files

All 11 are valid, importable n8n workflow JSON (trigger node -> HTTP
Request node calling the matching backend endpoint from Modules 3-12).
They have not been imported into a running n8n instance in this build
environment (no live n8n/Docker runtime available here) — import and
click-test each one after `docker compose --profile dev up -d n8n`.

Two workflows (10_application_tracking, 11_followup_reminder) are
intentionally minimal: Google Sheets sync and "no update in N days"
filtering are the kind of logic best expressed as native n8n
Google Sheets / IF / Filter nodes added directly in the n8n editor
(using your own Sheet ID and Gmail credentials), rather than baked
into a static exported JSON file with someone else's IDs in it.
