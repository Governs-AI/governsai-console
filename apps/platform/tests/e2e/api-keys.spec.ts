import { test, expect } from '@playwright/test';
import { hasCredentials, loginViaUI, orgPath, TEST_ORG_SLUG } from './helpers/auth';

test.describe('API keys', () => {
  test.skip(!hasCredentials || !TEST_ORG_SLUG, 'credentials or org slug not set');

  test('user creates an API key and sees the preview', async ({ page }) => {
    await loginViaUI(page);
    await page.goto(orgPath('/keys'));
    await expect(page.getByRole('heading', { name: /api keys/i })).toBeVisible();

    const keyName = `e2e-nova-${Date.now()}`;

    await page.getByRole('button', { name: /create key/i }).click();
    await page.getByLabel(/name/i).first().fill(keyName);

    const createResponse = page.waitForResponse(
      (res) => res.url().includes('/api-keys') && res.request().method() === 'POST',
    );
    await page.getByRole('button', { name: /^create key$/i }).click();
    const response = await createResponse;
    expect(response.status()).toBeLessThan(300);

    await expect(page.getByText(/your new api key/i)).toBeVisible();
    await expect(page.getByText(keyName)).toBeVisible();
  });
});
