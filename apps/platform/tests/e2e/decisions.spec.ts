import { test, expect } from '@playwright/test';
import { hasCredentials, orgPath, TEST_ORG_SLUG } from './helpers/auth';

test.describe('Decision log', () => {
  test.skip(!hasCredentials || !TEST_ORG_SLUG, 'credentials or org slug not set');

  test('decision log page loads and fetches decisions', async ({ page }) => {
    const decisionsResponse = page.waitForResponse(
      (res) => res.url().includes('/decisions') && res.request().method() === 'GET',
      { timeout: 15_000 },
    );
    await page.goto(orgPath('/decisions'));
    const response = await decisionsResponse;
    expect(response.status()).toBeLessThan(400);

    await expect(page.getByTestId('decisions-page')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('filter controls are present on the decisions page', async ({ page }) => {
    await page.goto(orgPath('/decisions'));
    await expect(page.getByTestId('decisions-page')).toBeVisible();

    const filters = page.getByTestId('decisions-filter-controls');
    await expect(filters).toBeVisible();
    await expect(page.getByTestId('decisions-search-input')).toBeVisible();
    await expect(page.getByTestId('decisions-direction-filter')).toBeVisible();
    await expect(page.getByTestId('decisions-outcome-filter')).toBeVisible();
  });
});
