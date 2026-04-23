import { test as setup, expect } from '@playwright/test';
import { hasCredentials, loginViaUI } from './helpers/auth';
import path from 'node:path';

export const STORAGE_STATE = path.join(__dirname, '../../.auth/user.json');

setup('authenticate', async ({ page }) => {
  setup.skip(!hasCredentials, 'TEST_USER_EMAIL/TEST_USER_PASSWORD not set');

  await loginViaUI(page);
  await expect(page).toHaveURL(/\/o\/[^/]+\/dashboard|\/onboarding/);

  await page.context().storageState({ path: STORAGE_STATE });
});
