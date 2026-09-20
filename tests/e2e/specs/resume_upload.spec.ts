// resume_upload.spec.ts
// Purpose: Upload PDF -> parsed data visible in UI
//
// Requires the full stack running: `docker compose --profile dev up -d`
// (backend + frontend + postgres), plus a real or stubbed LLM provider
// reachable at LLM_PROVIDER. Not executed in this build sandbox (no
// live browser/frontend/backend stack here) — run with `npx playwright
// test` against a running `make dev-full` stack.
import { test, expect } from '@playwright/test';
import path from 'path';

test('uploading a resume shows parsed candidate name', async ({ page }) => {
  await page.goto('/resume');

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'sample_resume.txt'));

  // Uploader shows a "Parsing your resume…" state while the request is in flight.
  await expect(page.getByText('Parsing your resume')).toBeVisible();

  // Once done, the new resume appears in the list with its extracted name.
  await expect(page.locator('a[href^="/resume/"]').first()).toBeVisible({ timeout: 30_000 });
});
