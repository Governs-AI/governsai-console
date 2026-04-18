import { test, expect } from '@playwright/test';
import { hasCredentials, loginViaUI, orgPath, TEST_ORG_SLUG } from './helpers/auth';

test.describe('Decision log', () => {
  test.skip(!hasCredentials || !TEST_ORG_SLUG, 'credentials or org slug not set');

  test('decision log page loads and fetches decisions', async ({ page }) => {
    await loginViaUI(page);

    const decisionsResponse = page.waitForResponse(
      (res) => res.url().includes('/decisions') && res.request().method() === 'GET',
      { timeout: 15_000 },
    );
    await page.goto(orgPath('/decisions'));
    const response = await decisionsResponse;
    expect(response.status()).toBeLessThan(400);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
