import { test, expect } from '@playwright/test';
import { hasCredentials, orgPath, TEST_ORG_SLUG } from './helpers/auth';

test.describe('Audit log CSV export (GOV-587)', () => {
  test.skip(!hasCredentials || !TEST_ORG_SLUG, 'credentials or org slug not set');

  test('export button is visible on the audit page', async ({ page }) => {
    await page.goto(orgPath('/audit'));
    await expect(page.getByTestId('audit-page')).toBeVisible();
    await expect(page.getByTestId('audit-export-csv')).toBeVisible();
  });

  test('click sends the current filter params to Atlas export endpoint', async ({ page }) => {
    await page.goto(orgPath('/audit'));
    await expect(page.getByTestId('audit-page')).toBeVisible();

    await page.getByTestId('audit-filter-decision').selectOption('deny');
    await page.getByTestId('audit-filter-tool').fill('search_web');
    await page.getByTestId('audit-filter-apply').click();

    // Atlas's endpoint (GOV-602) may or may not be live yet — either way the
    // click should issue a HEAD to /api/v1/audit/export with the filter keys
    // forwarded. We assert the request rather than the response outcome.
    const exportRequest = page.waitForRequest(
      (req) =>
        req.url().includes('/api/v1/audit/export') &&
        req.url().includes('format=csv') &&
        req.url().includes('decision=deny') &&
        req.url().includes('tool=search_web'),
      { timeout: 15_000 },
    );
    await page.getByTestId('audit-export-csv').click();
    await exportRequest;
  });

  test('button is disabled while export is in flight', async ({ page }) => {
    await page.goto(orgPath('/audit'));
    await expect(page.getByTestId('audit-page')).toBeVisible();

    // Slow the HEAD probe so we can observe the disabled state.
    await page.route('**/api/v1/audit/export**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.fulfill({ status: 200, body: '' });
    });

    const button = page.getByTestId('audit-export-csv');
    await button.click();
    await expect(button).toBeDisabled();
    // Re-enables once the probe resolves.
    await expect(button).toBeEnabled({ timeout: 5_000 });
  });
});
