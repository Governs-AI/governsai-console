# 🎯 GovernsAI Platform

Main platform application for AI governance and control.

## 📖 Overview

The GovernsAI Platform is the central hub for managing AI interactions, providing users with comprehensive tools to monitor, control, and govern their AI usage. It includes usage tracking, budget control, policy management, and audit logging all in one unified interface.

## 🚀 Features

- **AI Governance Dashboard**: Centralized AI management interface
- **Usage Tracking**: Monitor AI usage, costs, and performance
- **Budget Control**: Set spending limits and get alerts
- **Policy Management**: Define and enforce AI usage policies
- **Audit Logs**: Complete audit trail of AI interactions
- **API Key Management**: Manage API keys for different AI providers
- **Organization Management**: Multi-tenant organization support
- **Mobile Responsive**: Optimized for all devices

## 🏗️ Architecture

### App Router Structure
```
app/
├── api/                    # API routes
│   ├── usage/              # Usage tracking
│   ├── budgets/            # Budget management
│   ├── policies/           # Policy enforcement
│   ├── audit/              # Audit logging
│   ├── api-keys/           # API key management
│   └── organizations/      # Organization management
├── dashboard/              # Main dashboard
├── usage/                  # Usage tracking pages
├── budgets/                # Budget control pages
├── policies/               # Policy management pages
├── audit/                  # Audit log pages
├── api-keys/               # API key management pages
├── organizations/          # Organization management pages
├── profile/                # User profile
├── settings/               # Platform settings
└── layout.tsx              # Root layout
```

## 🛠️ Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **State Management**: React Context + Zustand
- **Charts**: Recharts
- **Icons**: Lucide React

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm
- PostgreSQL database

### Installation
```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Run database migrations
pnpm run db:migrate

# Start development server
pnpm run dev
```

### Environment Variables
```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3002"

# AI Providers
OPENAI_API_KEY="your-openai-key"
ANTHROPIC_API_KEY="your-anthropic-key"

# Platform URLs
NEXT_PUBLIC_PLATFORM_URL="http://localhost:3002"
NEXT_PUBLIC_DOCS_URL="http://localhost:3001"
NEXT_PUBLIC_LANDING_URL="http://localhost:3000"
```

## 📦 Available Scripts

```bash
# Development
pnpm run dev              # Start development server
pnpm run build            # Build for production
pnpm run start            # Start production server

# Code Quality
pnpm run lint             # Run ESLint
pnpm run type-check       # Run TypeScript checks
pnpm run format           # Format code with Prettier

# Database
pnpm run db:generate      # Generate Prisma client
pnpm run db:migrate       # Run database migrations
pnpm run db:seed          # Seed database with sample data
```

## 🏗️ Development

### Project Structure
```
apps/platform/
├── app/                   # Next.js App Router pages
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── shared/           # Shared components
│   └── ...               # Feature-specific components
├── lib/                  # Utility functions and configs
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
├── styles/               # Global styles and CSS
└── public/               # Static assets
```

### Key Components

- **AppLayout**: Main application layout with navigation
- **Dashboard**: Central dashboard with usage overview
- **UsageTracking**: AI usage monitoring and analytics
- **BudgetControl**: Spending limits and budget management
- **PolicyManagement**: AI usage policy definition and enforcement
- **AuditLogs**: Complete audit trail of AI interactions

### Compliance Report API Contract

The platform exposes an async compliance summary report workflow for UI consumers.

**Access control:** all `/api/v1/reports/*` routes require an authenticated session (or
API key) **and** an `ADMIN` or `OWNER` org membership. Other roles receive `403 Admin
access required`.

**Concurrency cap:** each org may have at most
`COMPLIANCE_REPORT_MAX_ACTIVE_JOBS_PER_ORG` (default `3`) reports in `pending` or
`processing` state. Additional `POST /generate` calls receive `429` with a `Retry-After`
header until an existing report finishes.

```http
POST /api/v1/reports/generate
Content-Type: application/json

{
  "startTime": "2026-04-01T00:00:00.000Z",
  "endTime": "2026-04-24T23:59:59.999Z"
}
```

Returns `202 Accepted` with:

```json
{
  "report_id": "cuid",
  "status": "pending",
  "status_url": "/api/v1/reports/cuid",
  "download_url": null,
  "artifacts": {
    "pdf": null,
    "json": null
  }
}
```

`status` values: `pending`, `processing`, `ready`, `failed`.

Poll:

```http
GET /api/v1/reports/:report_id
```

Ready response shape:

```json
{
  "report_id": "cuid",
  "status": "ready",
  "error_code": null,
  "download_url": "/api/v1/reports/cuid?download=1&format=pdf",
  "artifacts": {
    "pdf": "/api/v1/reports/cuid?download=1&format=pdf",
    "json": "/api/v1/reports/cuid?download=1&format=json"
  }
}
```

Failed response shape (sanitized — raw error message is logged server-side
only and never returned by the public API):

```json
{
  "report_id": "cuid",
  "status": "failed",
  "error_code": "generation_failed",
  "download_url": null,
  "artifacts": { "pdf": null, "json": null }
}
```

`error_code` enum: `generation_failed` (the only public failure code today).

Artifact downloads:

```http
GET /api/v1/reports/:report_id?download=1&format=pdf
GET /api/v1/reports/:report_id?download=1&format=json
```

**Storage:** rendered PDFs are persisted to Vercel Blob and served back through
`/api/v1/reports/:id?download=1&format=pdf` so the admin gate and audit log
remain authoritative. Set `BLOB_READ_WRITE_TOKEN` for production. When the env
is missing, the service falls back to inline `pdf_data` in Postgres so dev and
test environments keep working without external dependencies.

**Encryption-at-rest:** PDFs are encrypted with AES-256-GCM before they reach
Vercel Blob, so a leaked blob URL alone (server log, referer header, error
report, MITM on the inter-service fetch) is not sufficient to disclose PII —
the bytes at rest are opaque ciphertext. Set
`COMPLIANCE_REPORT_ENCRYPTION_KEY` to a 64-character hex string (32 bytes,
e.g. `openssl rand -hex 32`) whenever `BLOB_READ_WRITE_TOKEN` is set; the
storage layer fails closed if the key is missing or malformed. Rotate the key
by re-running `scripts/backfill-compliance-report-blobs.ts` against the new
key (the magic header lets future migrations decrypt with the previous key
during transition).

**PII / retention:** every `compliance_reports` row carries `contains_pii=true`
by default because the report schema persists member emails and PII signal
events. Retention and legal-hold workflows must respect this column; the audit
log entry for `compliance.report.download` includes `containsPii` and the
storage backend (`blob` vs `inline`).

**Stale-job recovery:** `processComplianceReportJob` reclaims rows that are
stuck in `processing` for longer than 15 minutes (a worker that died between
the claim and the final write). Active claims still short-circuit concurrent
callers, so this is safe to run from a watchdog cron.

**Concurrency cap (TOCTOU note):** the `count + create` pair in
`POST /generate` is intentionally not atomic. Worst-case overshoot is
`cap + concurrent_admin_count` rows, briefly. With ADMIN/OWNER-only access and
a default cap of 3, the race is acceptable; if the cap is later raised or
opened to non-admin roles, replace the count check with a partial unique index
or wrap it in a `RAISE`-on-cap CTE.

## 🔗 Related Packages

- `@governs-ai/ui` - Shared UI components
- `@governs-ai/layout` - Layout components
- `@governs-ai/db` - Database schema and queries
- `@governs-ai/billing` - Billing and subscription management
- `@governs-ai/common-utils` - Shared utilities

## 📝 Contributing

1. Follow the established code style and patterns
2. Add proper TypeScript types for all new code
3. Include JSDoc comments for public APIs
4. Write tests for new features
5. Update documentation as needed

## 📄 License

MIT License - see root LICENSE file for details.
