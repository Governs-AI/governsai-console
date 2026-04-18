import { expect, type Page } from '@playwright/test';

export const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? '';
export const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? '';
export const TEST_ORG_SLUG = process.env.E2E_TEST_ORG_SLUG ?? '';

export const hasCredentials = Boolean(TEST_EMAIL && TEST_PASSWORD);

export async function loginViaUI(page: Page): Promise<void> {
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.getByLabel('Password').fill(TEST_PASSWORD);

  const loginResponse = page.waitForResponse(
    (res) => res.url().includes('/api/v1/auth/login') && res.request().method() === 'POST',
  );
  await page.getByRole('button', { name: /sign in/i }).click();
  const response = await loginResponse;
  expect(response.status(), 'login API should return 2xx').toBeLessThan(300);

  await page.waitForURL(/\/o\/[^/]+\/dashboard|\/onboarding/, { timeout: 15_000 });
}

export function orgPath(path: string): string {
  if (!TEST_ORG_SLUG) {
    throw new Error('E2E_TEST_ORG_SLUG must be set to run org-scoped tests');
  }
  return `/o/${TEST_ORG_SLUG}${path.startsWith('/') ? path : `/${path}`}`;
}
