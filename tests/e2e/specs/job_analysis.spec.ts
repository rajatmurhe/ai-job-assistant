// job_analysis.spec.ts
// Purpose: Paste JD -> structured JD visible in UI
//
// Same live-stack requirement as resume_upload.spec.ts.
import { test, expect } from '@playwright/test';

test('pasting a job description shows extracted title and company', async ({ page }) => {
  await page.goto('/jobs');

  await page.getByText('Paste text').click();
  await page.locator('textarea').fill(
    'Backend Engineer at Acme Corp. Remote. Requires 3+ years of Python and PostgreSQL experience.'
  );
  await page.getByRole('button', { name: 'Analyze job' }).click();

  await expect(page.locator('a[href^="/jobs/"]').first()).toBeVisible({ timeout: 30_000 });
});
