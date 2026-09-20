# Architecture

See `AI_JOB_ASSISTANT_MASTER_DOCUMENTATION.md` sections 3–7 for the full
architecture decision, technology selection, and folder structure.

Summary:

    Next.js Frontend --REST/WS--> FastAPI Backend (modular monolith)
                                        |
                          -------------------------------
                          |                             |
                    PostgreSQL+pgvector          LLM Provider (Gemini/Ollama)
                          |                             |
                          -------------------------------
                                        |
                                 n8n (orchestration, calls backend HTTP API)
                                        |
                          -------------------------------
                          |             |               |
                     Gmail API    Google Sheets     Webhooks

n8n never lives inside the backend process — it is an external orchestrator
that calls the versioned REST API (`/api/v1/...`).

STATUS: expand with sequence diagrams as each module lands.
