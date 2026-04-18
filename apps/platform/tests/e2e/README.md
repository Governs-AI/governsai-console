# Platform E2E tests

Playwright suite that exercises the platform UI at `http://localhost:3002`.

## Run locally

```bash
# One-time: install browser binaries
pnpm dlx playwright install chromium

# Start the full local stack (Keycloak, platform, websocket, precheck, site, chat)
# See the repo root start-dev.sh or docker-compose.dev.yml.

# Unauthenticated smoke tests — always safe to run
pnpm --filter @governs-ai/platform test:e2e -- tests/e2e/auth.spec.ts

# Authenticated flows — require a seeded user and org
E2E_TEST_EMAIL=e2e@governs.ai \
E2E_TEST_PASSWORD='…' \
E2E_TEST_ORG_SLUG=e2e-org \
  pnpm --filter @governs-ai/platform test:e2e
```

Tests that depend on credentials are skipped (not failed) when the env vars are not set,
so the unauthenticated checks can safely run in preview CI before seeding is wired up.

## Environment variables

| Variable             | Purpose                                              |
|----------------------|------------------------------------------------------|
| `E2E_BASE_URL`       | Platform URL (default `http://localhost:3002`)       |
| `E2E_TEST_EMAIL`     | Test user email                                      |
| `E2E_TEST_PASSWORD`  | Test user password                                   |
| `E2E_TEST_ORG_SLUG`  | Org slug the test user belongs to                    |

## Artifacts

Traces, screenshots, and videos are captured on failure via `trace: 'retain-on-failure'`,
`screenshot: 'only-on-failure'`, and `video: 'retain-on-failure'`. The GitHub Actions
`e2e` job uploads `playwright-report/` and `test-results/` on failure.
