import { test, expect } from '@playwright/test';
import { hasCredentials, orgPath, TEST_ORG_SLUG } from './helpers/auth';

test.describe('API keys', () => {
  test.skip(!hasCredentials || !TEST_ORG_SLUG, 'credentials or org slug not set');

  test('keys page renders header and table', async ({ page }) => {
    await page.goto(orgPath('/keys'));
    await expect(page.getByTestId('api-keys-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: /api keys/i })).toBeVisible();
    await expect(page.getByTestId('create-key-button')).toBeVisible();
  });

  test('user creates an API key and sees the preview', async ({ page }) => {
    await page.goto(orgPath('/keys'));

    const keyName = `e2e-nova-${Date.now()}`;

    await page.getByTestId('create-key-button').click();
    await expect(page.getByTestId('create-key-form')).toBeVisible();
    await page.getByTestId('api-key-name-input').fill(keyName);

    const createResponse = page.waitForResponse(
      (res) => /\/api-keys(\?|$)/.test(res.url()) && res.request().method() === 'POST',
    );
    await page.getByTestId('create-key-submit-button').click();
    const response = await createResponse;
    expect(response.status()).toBeLessThan(300);

    await expect(page.getByTestId('api-key-created-state')).toBeVisible();
    await expect(page.getByTestId('api-key-preview-display')).toBeVisible();
    await expect(page.getByText(keyName)).toBeVisible();
  });

  test('user revokes an API key and it disappears from the table', async ({ page }) => {
    await page.goto(orgPath('/keys'));

    const keyName = `e2e-revoke-${Date.now()}`;

    await page.getByTestId('create-key-button').click();
    await page.getByTestId('api-key-name-input').fill(keyName);
    const createResponse = page.waitForResponse(
      (res) => /\/api-keys(\?|$)/.test(res.url()) && res.request().method() === 'POST',
    );
    await page.getByTestId('create-key-submit-button').click();
    await createResponse;

    await expect(page.getByTestId('api-key-table')).toBeVisible();
    const row = page.locator('[data-testid^="api-key-row-"]').filter({ hasText: keyName });
    await expect(row).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());

    const deleteResponse = page.waitForResponse(
      (res) => /\/api-keys\/[^/?]+/.test(res.url()) && res.request().method() === 'DELETE',
    );
    await row.getByRole('button', { name: /revoke api key/i }).click();
    const response = await deleteResponse;
    expect(response.status()).toBeLessThan(300);

    await expect(row).toHaveCount(0);
  });
});
