# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
