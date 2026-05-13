/**
 * sandbox-smoke.spec.ts — minimal Playwright tests against the running dashboard.
 *
 * Scope: unauthenticated rendering only. The authed flow has a known issue
 * (post-login refetch can hang) which is tracked separately. These tests are
 * what the sandbox e2e runs to prove Playwright + dashboard render together.
 */
import { test, expect } from '@playwright/test';

// Each test starts from a clean storage state so the dashboard project's
// pre-seeded storageState doesn't redirect us away from /auth/login.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Dashboard smoke', () => {
  test('login page renders the email + password + sign-in controls', async ({ page }) => {
    const response = await page.goto('/auth/login');
    expect(response?.status() ?? 0).toBeLessThan(400);

    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('signup page renders the email + password fields', async ({ page }) => {
    const response = await page.goto('/auth/signup');
    expect(response?.status() ?? 0).toBeLessThan(400);

    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i).first()).toBeVisible();
  });

  test('invalid credentials surface a visible error', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill('nobody@example.invalid');
    await page.getByLabel('Password').fill('not-the-right-password');

    const loginResponse = page.waitForResponse((res) =>
      res.url().includes('/api/v1/auth/login'),
    );
    await page.getByRole('button', { name: /sign in/i }).click();
    await loginResponse;

    // Error surface is rendered via [data-testid="login-error-state"]
    await expect(page.getByTestId('login-error-state')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
