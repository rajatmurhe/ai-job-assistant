// Playwright config for the full-stack e2e specs (Module 16).
//
// Requires `docker compose --profile dev up -d` running first
// (frontend on :3000, backend on :8000) — Playwright does not start
// the stack itself since it depends on Postgres + an LLM provider,
// neither of which Playwright can bring up on its own.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  reporter: [['list']],
});
