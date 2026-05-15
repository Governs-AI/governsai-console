/**
 * pages-no-5xx.spec.ts — crawl every authed page once and assert nothing
 * returns 5xx and nothing renders a Next.js error boundary.
 *
 * Uses the shared chromium project + stored storageState (`auth.setup.ts`).
 * Designed for the sandbox e2e: needs TEST_USER_EMAIL/PASSWORD/E2E_TEST_ORG_SLUG.
 */
import { test, expect } from '@playwright/test';
import { hasCredentials, orgPath, TEST_ORG_SLUG } from './helpers/auth';

test.describe('Pages — no 5xx, no error boundary', () => {
  test.skip(!hasCredentials || !TEST_ORG_SLUG, 'credentials or org slug not set');

  const paths = [
    '/dashboard',
    '/policies',
    '/decisions',
    '/keys',
    '/audit',
    '/spend',
    '/budget',
    '/toolcalls',
    '/tools',
    '/admin',
    '/admin/users',
    '/settings',
    '/settings/general',
    '/settings/members',
    '/settings/passkeys',
    '/settings/mfa',
    '/settings/data',
  ];

  for (const p of paths) {
    test(`GET ${p} renders without 5xx`, async ({ page }) => {
      const response = await page.goto(orgPath(p));
      expect(response, `no response for ${p}`).not.toBeNull();
      const status = response!.status();
      expect(status, `expected <500 for ${p}, got ${status}`).toBeLessThan(500);

      // Sanity: no Next.js error overlay or "Application error" boundary text.
      const body = await page.content();
      const errorRegex = /Application error|This page could not be found|Internal Server Error/i;
      expect(errorRegex.test(body), `error text on ${p}`).toBe(false);
    });
  }
});
