# GovernsAI Console

GovernsAI Console is the control plane for runtime governance of AI agents: org admins write policies, manage API keys and the tool catalog, and approve held tool calls.
The precheck service enforces those policies on every prompt and tool call (PII redaction, deny, hold for approval) and every decision lands in the console's audit log.

This repository holds the console web app, the websocket service that carries decisions into the audit log, and the shared Prisma schema.

[![License](https://img.shields.io/badge/license-ELv2-blue.svg)](LICENSE)

---

## Architecture

```
  your agent / app
  (TypeScript SDK, Python SDK, or plain HTTP)
        │  x-governs-key
        ▼
  ┌──────────────┐  decision events   ┌────────────────────┐  writes   ┌──────────────┐
  │   precheck   │ ─────────────────▶ │ websocket service  │ ────────▶ │              │
  │ FastAPI :8082│     (ws, signed)   │  Node.js :3001     │           │  PostgreSQL  │
  └──────┬───────┘                    └────────────────────┘           │  (pgvector)  │
         │ reads policies + hashed API keys                            │              │
         └────────────────────────────────────────────────────────────▶│              │
                                                                       │              │
  ┌───────────────────────────────┐  reads/writes                      │              │
  │ console (this repo)           │ ──────────────────────────────────▶│              │
  │ Next.js :3002                 │                                    └──────────────┘
  │ policies, keys, tool catalog, │
  │ approvals inbox, audit log    │
  └───────────────────────────────┘
```

| Component | Where | Role |
|---|---|---|
| Console | `apps/platform` (this repo) | Next.js app and REST API (`/api/v1/*`): orgs, policies, API keys, tool catalog, confirmations, audit log, budgets |
| Websocket service | `apps/websocket-service` (this repo) | Receives decision events from precheck, authenticates them with the caller's API key, writes them to the audit log for that key's org |
| Database schema | `packages/db` (this repo) | Prisma schema and migrations shared by the console and the websocket service |
| Precheck | [`Governs-AI/precheck`](https://github.com/Governs-AI/precheck) | Evaluates each request against the org's active policy: `allow`, `transform` (PII redacted), `deny`, or `confirm` (hold for approval) |
| SDKs | [`@governs-ai/sdk`](https://github.com/Governs-AI/typescript-sdk), [`governs-ai-sdk`](https://github.com/Governs-AI/python-sdk) | Client libraries for precheck and the console API |

Precheck and the console share one Postgres database: precheck reads the org's policy and looks API keys up in the console's `APIKey` table by hash.

---

## Quickstart: run the whole loop locally

Prerequisites: Docker, Node.js 18+, pnpm 10, Python 3.12, and checkouts of this repo and `precheck` side by side.

### 1. Postgres (with pgvector)

```bash
docker run -d --name governs-ai-postgres -p 5433:5432 \
  -e POSTGRES_DB=governs_ai_dev -e POSTGRES_USER=governs_user -e POSTGRES_PASSWORD=governs_password \
  pgvector/pgvector:pg15
```

The migrations create the `vector` extension, so a plain `postgres` image will not work.

Start Keycloak too (`governsai-infra/keycloak`, admin console on `:8088`, realm `governs-ai`). It backs SSO and "Login with GovernsAI"; new users are synced to it in the background and sync failures are recorded and retried.

### 2. Environment variables

Set these per service. Names only; use your own values, and never commit them.

| Service | File | Variables |
|---|---|---|
| Console | `apps/platform/.env.local` | `DATABASE_URL`, `JWT_SECRET`, `PASSWORD_PEPPER`, `KEY_HMAC_SECRET`, `WEBHOOK_SECRET`, `PRECHECK_URL` (e.g. `http://localhost:8082`), `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_PLATFORM_URL`, `NEXT_PUBLIC_WEBSOCKET_URL`, `NEXT_PUBLIC_RP_ID`, `RESEND_API_KEY` |
| Websocket service | `apps/websocket-service/.env` | `DATABASE_URL`, `JWT_SECRET`, `WEBHOOK_SECRET`, `PORT`, `ALLOWED_ORIGINS`, `PLATFORM_WEBHOOK_URL` |
| Precheck | `precheck/.env` | `DB_URL` (the same database as the console), `WEBHOOK_BASE_URL` (`ws://localhost:3001/ws`), `WEBHOOK_SECRET`, `KEY_HMAC_SECRET`, `PII_TOKEN_SALT`, `DEBUG` |

Optional, by feature: `KEYCLOAK_*` (SSO), `OPENAI_API_KEY` / `EMBEDDING_PROVIDER` / `PGVECTOR_DIM` (context memory), `DOCUMENT_STORAGE_*` (documents), `LOG_AUTH_TOKENS` (log verification links outside `next dev`).

`RESEND_API_KEY` can be any placeholder locally; email then silently fails, and in `next dev` the verification link is printed to the console log instead.

### 3. Install and migrate

```bash
pnpm install
pnpm run generate                     # Prisma client
cd packages/db && npx prisma migrate deploy && cd ../..
```

`prisma migrate deploy` builds the full schema on an empty database; no `db push` is needed.

If your database was originally built with `prisma db push`, `migrate deploy` refuses it (Prisma error `P3005`, no migration history). Adopt it once with:

```bash
DATABASE_URL=... packages/db/scripts/baseline-pushed-db.sh
```

The script marks each migration whose changes are already present as applied, then runs `migrate deploy` for the rest. Back the database up first.

### 4. Start the services

```bash
# precheck (in the precheck repo)
python -m venv venv && venv/bin/pip install -r requirements.txt
venv/bin/python -m spacy download en_core_web_sm          # PII models
venv/bin/python start.py                                   # :8082

# this repo
pnpm --filter @governs-ai/websocket-service dev           # :3001
pnpm --filter @governs-ai/platform dev                    # :3002
```

Health checks: `GET :8082/api/v1/health`, `GET :3001/health`, `GET :3002/api/v1/health`.

### 5. Try it

1. Sign up at `http://localhost:3002`, open the verification link from the console log, and sign in.
2. Apply a policy template under **Policies**.
3. Create an API key under **API Keys**. The full key is shown once.
4. Call precheck with it:

```bash
curl -s localhost:8082/api/v1/precheck \
  -H "x-governs-key: $GOVERNS_API_KEY" -H 'content-type: application/json' \
  -d '{"tool": "chat", "raw_text": "Email jane.doe@example.com about the invoice"}'
```

The response carries `decision` and `raw_text_out`, with the email redacted when the policy says so. The decision then appears in **Audit**.

The meta repository's `scripts/local-e2e.py` drives this whole loop (sign-up, policy, key, all four decisions, approvals, audit, org isolation) and is the acceptance gate for changes.

---

## Approval flow

When a policy marks a tool as needing approval, precheck answers `confirm` instead of running it:

1. The agent calls precheck with the tool name and arguments and gets `decision: "confirm"`.
2. It creates a confirmation: `POST /api/v1/confirmation/create` with a `correlationId`, the request payload, and precheck's reasons. The response includes a `confirmationUrl`.
3. The request appears in the console's approvals inbox (`GET /api/v1/confirmations?status=pending`).
4. A signed-in user (the requester, or an org OWNER/ADMIN) approves or denies it (`POST /api/v1/confirmation/{id}/approve` or `/deny`). API keys cannot approve, so an agent cannot approve itself. Passkey approval (`/api/v1/confirmation/verify`) is available as a stronger step-up.
5. The agent polls `GET /api/v1/confirmation/{id}`, then calls `POST /api/v1/confirmation/{id}/consume` and runs the tool with the approved payload. Consuming before approval returns `409`. One approval authorises exactly one run, so a replay also gets `409`. Unused confirmations expire (default 15 minutes).

Every precheck decision, including `confirm`, is sent to the websocket service and written to the audit log, linked to the policy that made it. Only a SHA-256 of the raw input is stored; the redacted output is kept for `transform` decisions.

---

## API key hashing

- Keys look like `gai_…` and are 256-bit random values.
- The console stores only a SHA-256 hash (`APIKey.keyHash`) and a 12-character display prefix (`keyPrefix`). The full key is shown once, at creation, and cannot be retrieved later.
- Precheck, the websocket service and the console all authenticate a request by hashing the `x-governs-key` header and looking that hash up. The hash is unsalted on purpose: with 256-bit random keys a deterministic hash is safe, and it lets every service find the key.
- The `20261025120000_hash_api_keys` migration hashes any keys stored in plaintext by older versions, so existing keys keep working.
- Because precheck reads `keyHash`, deploy precheck before the console when upgrading from a version that stored plaintext keys.

---

## Per-org tool catalog

The tool catalog (`ToolConfig`) records each tool's category, risk level, scope and whether it needs approval.

- **Shared entries** (`orgId` null): the built-in tools and any entries created before per-org scoping. Every org can read them, and no one can edit them through the API (`403`).
- **Org entries**: created by that org's OWNER/ADMIN in the console (**Tools**, or `POST /api/v1/tools`). Only that org can see or change them; other orgs get `404`.
- **Overrides**: an org entry with the same `toolName` as a shared one replaces it for that org only. Use this to change a built-in's risk level, or to switch it off with `isActive: false`. Deleting the override restores the shared entry.
- Reads (`GET /api/v1/tools`) return shared and org entries merged, each with an `editable` flag. API keys can read the catalog but not write it.

---

## Development

```bash
pnpm run generate                              # Prisma client
pnpm build                                     # all packages (turbo)
pnpm lint
pnpm --filter @governs-ai/platform test        # Jest
pnpm --filter @governs-ai/platform build       # pre-merge check
```

Schema changes go in `packages/db/schema.prisma` with a new migration under `packages/db/migrations`. Each new migration also needs a marker in `packages/db/scripts/baseline-pushed-db.sh`; the script refuses to run without one.

Project structure:

```
apps/
  platform/            Next.js console and /api/v1 routes
  websocket-service/   decision ingest → audit log
packages/
  db/                  Prisma schema, migrations, seed, baseline script
  ui/, layout/, common-utils/   shared UI and helpers
docs/                  additional design notes
```

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Precheck returns `401` for a key the console just created | Precheck's `DB_URL` points at a different database than the console's `DATABASE_URL`. |
| Decisions never show up in **Audit** | Precheck has no `WEBHOOK_BASE_URL`, the websocket service isn't running, or `WEBHOOK_SECRET` differs between precheck and the websocket service. |
| `migrate deploy` fails with `P3005` | The database was built with `db push`. Run `packages/db/scripts/baseline-pushed-db.sh` (after a backup). |
| Migration fails on `CREATE EXTENSION "vector"` | The Postgres image lacks pgvector. Use `pgvector/pgvector:pg15`. |
| No verification email | Expected locally. Read the link from the console log (`next dev`), or set `LOG_AUTH_TOKENS=true` for production builds. |
| Precheck exits at startup with a secret error | With `DEBUG=false` precheck requires real `PII_TOKEN_SALT`, `WEBHOOK_SECRET` and `KEY_HMAC_SECRET` values and a `rediss://` `REDIS_URL` with a password, if one is set. Use `DEBUG=true` locally. |
| `403` editing a tool | It's a shared entry. Create an override for your org with the same `toolName`. |
| `pnpm install --frozen-lockfile` fails with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` | The `overrides` in `package.json` no longer match `pnpm-lock.yaml`. Keep both `overrides` blocks in step with the lockfile. |

---

## License

The console in this repository is licensed under the [Elastic License 2.0](LICENSE): you can read, modify and self-host it, including for commercial use within your organization, but not offer it to third parties as a hosted or managed service. Precheck and the SDKs are licensed separately; see their repositories.

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
