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

The platform exposes an async compliance summary report workflow for UI consumers:

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
  "download_url": "/api/v1/reports/cuid?download=1&format=pdf",
  "artifacts": {
    "pdf": "/api/v1/reports/cuid?download=1&format=pdf",
    "json": "/api/v1/reports/cuid?download=1&format=json"
  }
}
```

Artifact downloads:

```http
GET /api/v1/reports/:report_id?download=1&format=pdf
GET /api/v1/reports/:report_id?download=1&format=json
```

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
