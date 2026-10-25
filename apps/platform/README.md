# @governs-ai/platform

The GovernsAI console web app: a Next.js 15 (App Router) application that serves both the dashboard UI and the console REST API under `/api/v1`.

For architecture, the local end-to-end quickstart, the approval flow, API key hashing and the per-org tool catalog, see the [repository README](../../README.md).

## Run

```bash
# from the repository root
pnpm install
pnpm run generate                             # Prisma client
pnpm --filter @governs-ai/platform dev        # http://localhost:3002
```

Configuration lives in `apps/platform/.env.local`; the variable names are listed in the repository README. The app needs the shared Postgres database (migrated with `prisma migrate deploy`), and precheck at `PRECHECK_URL` for policy previews.

## Layout

```
app/
  o/[slug]/            org-scoped pages: dashboard, policies, keys, tools,
                       approvals, decisions, toolcalls, audit, spend, budget,
                       settings, admin
  auth/, onboarding/   sign-up, sign-in, email verification, org setup
  confirm/             passkey approval page for held requests
  profile/             user profile
  api/v1/              REST API (orgs, policies, keys, tools, confirmation(s),
                       decisions, audit, budget, spend, usage, context,
                       documents, reports, retention, sso, passkeys, health, …)
components/            UI components (e.g. tools-client.tsx for the catalog)
lib/
  api-keys.ts          key generation and SHA-256 hashing
  tool-catalog.ts      shared + per-org catalog merge (visibleTo, mergeCatalog)
  tool-catalog-auth.ts catalog read/write authorisation
  confirmation-decide.ts, confirmations.ts   approval flow
  policy-templates.ts, precheck-policy-sync.ts   policies and precheck cache invalidation
  keycloak-admin.ts, keycloak-sync.ts      SSO user sync
__tests__/             Jest tests (API routes and lib)
```

## Test and build

```bash
pnpm --filter @governs-ai/platform test       # Jest
pnpm --filter @governs-ai/platform build      # production build (pre-merge check)
```

`pnpm lint` at this package level is currently a no-op (`next lint` is deprecated in Next.js 15.5); type checking runs as part of `next build`.

The full loop with precheck and the websocket service is covered by `scripts/local-e2e.py` in the meta repository.
