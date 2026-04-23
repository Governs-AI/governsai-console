import { test, expect } from '@playwright/test';
import { hasCredentials, orgPath, TEST_ORG_SLUG } from './helpers/auth';

test.describe('Policies', () => {
  test.skip(!hasCredentials || !TEST_ORG_SLUG, 'credentials or org slug not set');

  test('policies page renders with header', async ({ page }) => {
    await page.goto(orgPath('/policies'));
    await expect(page.getByRole('heading', { name: /ai governance policies/i })).toBeVisible();
  });

  test('user creates a policy and sees it in the list', async ({ page }) => {
    await page.goto(orgPath('/policies'));

    const createBtn = page.getByRole('button', { name: /create policy/i });
    if (!(await createBtn.isVisible().catch(() => false))) {
      test.skip(true, 'user lacks manage-policies permission in this org');
      return;
    }

    const policyName = `nova-e2e-${Date.now()}`;
    await createBtn.click();

    await page.getByLabel(/name|title/i).first().fill(policyName);

    const createResponse = page.waitForResponse(
      (res) => /\/policies(\?|$)/.test(res.url()) && res.request().method() === 'POST',
    );
    await page.getByRole('button', { name: /^(create|save)$/i }).first().click();
    const response = await createResponse;
    expect(response.status()).toBeLessThan(300);

    await expect(page.getByText(policyName)).toBeVisible();
  });
});
