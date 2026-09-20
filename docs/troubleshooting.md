# Troubleshooting

## Backend won't start / DB connection refused
- Ensure `postgres` health check passes first: `docker compose ps`
- Check `DATABASE_URL` in `.env` matches the postgres service name (`postgres`, not `localhost`) when running inside Docker.

## GET /health returns db: "down"
- Postgres container may still be initializing on first run — wait a few seconds.
- Confirm `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` match between `.env` and the `postgres` service.

## Gemini calls failing
- Confirm `GEMINI_API_KEY` is set and `LLM_PROVIDER=gemini`.
- Set `LLM_PROVIDER=ollama` to fall back to a fully local stack (requires `docker compose --profile dev up -d ollama` and pulling models).

More entries added as later modules land.
