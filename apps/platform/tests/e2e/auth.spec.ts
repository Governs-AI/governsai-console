import { test, expect } from '@playwright/test';
import { hasCredentials, loginViaUI } from './helpers/auth';

test.describe('Auth — login page', () => {
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

    await expect(page.getByText(/login failed|invalid|incorrect/i)).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});

test.describe('Auth — authenticated flow', () => {
  test.skip(!hasCredentials, 'E2E_TEST_EMAIL/PASSWORD not set');

  test('logs in and lands on dashboard', async ({ page }) => {
    await loginViaUI(page);
    await expect(page).toHaveURL(/\/o\/[^/]+\/dashboard|\/onboarding/);
  });
});
