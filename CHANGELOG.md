# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- The tool catalog is scoped per org (`ToolConfig.orgId`, migration
  `20261025140000_tool_catalog_per_org`). Existing entries and the built-ins
  become shared entries (`orgId` null): readable by all, editable by none. Org
  admins create, edit and delete their own org's entries. An org entry named
  like a shared one overrides it for that org only. Reads return the merged
  view with `editable`; another org's entries return 404. Uniqueness is
  `(org_id, tool_name) NULLS NOT DISTINCT`. The Tools page marks shared entries,
  and editing or deactivating one saves an org override.

### Fixed
- `prisma migrate deploy` now builds the full schema. Migration
  `20261025130000_catch_up_schema_drift` adds `User.external_id`/`external_source`,
  `documents.external_source`/`external_user_id`, `webhook_idempotency_keys` and
  the `vector` extension, which were only ever applied with `db push`. It is
  idempotent. `packages/db/scripts/baseline-pushed-db.sh` adopts migrations on
  `db push`-built databases.

### Security
- The shared tool catalog is admin-managed. `POST /api/v1/tools`,
  `PUT|DELETE /api/v1/tools/:id` require a dashboard session of an org
  OWNER/ADMIN (role checked in the database); API keys and members get 403.
  Reads are unchanged. Shared check: `lib/tool-catalog-auth.ts`.
- API keys are no longer stored in plaintext. `APIKey` keeps a SHA-256
  `keyHash` and a 12-character `keyPrefix`; the full key is returned once, in
  the create/rotate response. Migration `20261025120000_hash_api_keys` hashes
  existing keys in place (they keep working) and drops the `key` column. Every
  `X-Governs-Key` lookup (platform routes, websocket gateway) goes through
  `lib/api-keys.ts`. Key lists show `keyPreview` (`gai_1234abcd…`).
- Precheck now reads dashboard keys from `APIKey` by hash, so the HMAC copy
  sync (`lib/precheck-key-sync.ts`) is removed and deactivating a key on
  `/api/v1/keys/:id` (which never reached precheck before) applies at once.
- The policy preview no longer reuses a stored key: for session callers it
  mints a 5-minute, hidden `preview`-scoped key.

### Added
- OpenRouter embedding provider (`EMBEDDING_PROVIDER=openrouter`, default
  `openai/text-embedding-3-small`, 1536 dims). It is the default when
  `OPENROUTER_API_KEY` (or `OPEN_ROUTER_API_KEY`) is set and
  `EMBEDDING_PROVIDER` is not.
- Approvals inbox at `/o/:slug/approvals` (nav: Approvals). It lists confirm
  decisions held for review and refreshes every 5s.
- `POST /api/v1/confirmation/:id/approve|deny`: session approval by the
  requester or an org OWNER/ADMIN. API keys are refused, so an agent can't
  approve itself.
- `POST /api/v1/confirmation/:id/consume`: the integration marks an approval
  used right before acting. One approval authorises one execution.
- `GET /api/v1/confirmations?status=`: the inbox list, with `pendingCount`.
- `GET /api/v1/tools/:toolName/metadata` returns the `tool_config` shape the
  SDKs use to enrich precheck calls. They called this path, but it didn't exist.
- `GET /api/v1/context/conversation/:conversationId`: the path form the SDKs
  call, alongside the existing query-string form.
- Built-in tool catalog (`lib/tool-catalog.ts`): the model, the chat-demo
  tools, payments, email and the exec tools are inserted on first use, so a
  fresh install can write tool rules without running a seed. Existing rows are
  never overwritten.

- A **Get started** checklist on the org dashboard walks through pick a policy
  template → create a key (shown once, copyable) → send a request ("Try it
  with a sample", or copy-paste curl / TypeScript SDK) → see it in the audit
  log. It's driven by real data, polls for the first decision, and can be
  dismissed.
- Shared policy templates (`lib/policy-templates.ts`), including the new
  recommended **AI agent guardrails** and **Fintech: block card & SSN**.
- Audit log rows expand to show the rule, reasons, detected PII types,
  redacted output, scope and latency. The Policy column shows the policy name,
  and there's a `confirm` decision filter.

### Changed
- The policy form takes any tool name for a rule (catalog names are offered as
  suggestions), adds the `tokenize` action, and explains `allowTools`.
- The dashboard title shows the org name instead of its slug.
- `GET /api/v1/confirmation/:id` also accepts `X-Governs-Key` (same org), so
  SDKs and agents can poll status. Admin visibility now uses the real
  membership role (the old check compared against a lowercase `admin` that
  never matched).
- `/confirm/:id` falls back to session approval when the user has no passkey,
  and Deny records `denied` instead of `cancelled`.
- `POST /api/v1/confirmation/create` takes `expiresInSeconds` (default 15m,
  was a fixed 5m; max 24h) and returns `confirmationUrl` and `approvalsUrl`.

### Security
- Email-verification, password-reset and invite tokens were `console.log`ged
  in every environment. They are now logged only under `next dev` or with
  `LOG_AUTH_TOKENS=true` (`lib/dev-log.ts`). Removed a debug log of session
  details in the org API-keys route.
- `POST /api/v1/confirmation/cancel` was unauthenticated. It now requires a
  same-org key or an authorised session.
