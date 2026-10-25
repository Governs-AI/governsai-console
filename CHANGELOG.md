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

### Changed
- `GET /api/v1/confirmation/:id` also accepts `X-Governs-Key` (same org), so
  SDKs and agents can poll status. Admin visibility now uses the real
  membership role (the old check compared against a lowercase `admin` that
  never matched).
- `/confirm/:id` falls back to session approval when the user has no passkey,
  and Deny records `denied` instead of `cancelled`.
- `POST /api/v1/confirmation/create` takes `expiresInSeconds` (default 15m,
  was a fixed 5m; max 24h) and returns `confirmationUrl` and `approvalsUrl`.

### Security
- `POST /api/v1/confirmation/cancel` was unauthenticated. It now requires a
  same-org key or an authorised session.
