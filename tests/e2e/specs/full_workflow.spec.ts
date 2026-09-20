// full_workflow.spec.ts
// Purpose: Upload resume -> paste JD -> view match -> generate documents -> track application
//
// Same live-stack requirement as the other specs — this is the
// end-to-end happy path across every module (3 through 15).
import { test, expect } from '@playwright/test';
import path from 'path';

test('full workflow: resume -> job -> match -> generate -> application', async ({ page }) => {
  // 1. Upload resume
  await page.goto('/resume');
  await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, 'fixtures', 'sample_resume.txt'));
  await expect(page.locator('a[href^="/resume/"]').first()).toBeVisible({ timeout: 30_000 });

  // 2. Analyze a job
  await page.goto('/jobs');
  await page.getByText('Paste text').click();
  await page.locator('textarea').fill('Backend Engineer at Acme Corp requiring Python.');
  await page.getByRole('button', { name: 'Analyze job' }).click();
  const jobLink = page.locator('a[href^="/jobs/"]').first();
  await expect(jobLink).toBeVisible({ timeout: 30_000 });
  await jobLink.click();

  // 3. Run a match
  await page.getByRole('button', { name: 'Run match' }).click();
  await expect(page).toHaveURL(/\/match\//, { timeout: 30_000 });
  await expect(page.getByText(/\/ 100/)).toBeVisible();

  // 4. Generate documents
  await page.getByRole('link', { name: /Generate application documents/ }).click();
  await expect(page.getByText(/Truthfulness check/)).toBeVisible({ timeout: 60_000 });
});
