import { test, expect } from '@playwright/test';
import { hasCredentials } from './helpers/auth';

test.describe('Auth — login page', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('renders login form', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill('nobody@example.invalid');
    await page.getByLabel('Password').fill('not-the-right-password');

    const loginResponse = page.waitForResponse((res) =>
      res.url().includes('/api/v1/auth/login'),
    );
    await page.getByRole('button', { name: /sign in/i }).click();
    await loginResponse;

    await expect(page.getByTestId('login-error-state')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe('Auth — authenticated session', () => {
  test.skip(!hasCredentials, 'TEST_USER_EMAIL/TEST_USER_PASSWORD not set');

  test('stored session lands on dashboard or onboarding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/o\/[^/]+\/dashboard|\/onboarding/);
  });
});
