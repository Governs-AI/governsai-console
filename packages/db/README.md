# `@governs-ai/db`

Database package for the GovernsAI monorepo.

## 📖 Overview

This package provides the database schema, Prisma client, and database utilities for all GovernsAI applications. It centralizes database operations and ensures consistent data access patterns across the ecosystem.

## 🚀 Features

- **Prisma Schema**: Centralized database schema definition
- **Generated Client**: Auto-generated Prisma client for type-safe database access
- **Migrations**: Database migration management
- **Type Safety**: Full TypeScript support with generated types
- **Monorepo Integration**: Designed for Turborepo monorepo structure

## 📦 Installation

This package is automatically installed as a dependency in all GovernsAI projects.

## ⚙️ Usage

### Importing the Client
```typescript
import { prisma } from '@governs-ai/db';

// Use the client for database operations
const users = await prisma.user.findMany();
const user = await prisma.user.findUnique({
  where: { id: 'user-id' }
});
```

### Using Generated Types
```typescript
import type { User, Organization, APIKey } from '@governs-ai/db';

// Type-safe database operations
const createUser = async (data: Omit<User, 'id' | 'createdAt'>) => {
  return await prisma.user.create({ data });
};
```

## 🔧 Database Schema

### Core Models

#### User Management
- **User**: Core user information and authentication
- **Account**: OAuth account connections
- **Session**: User session management

#### AI Governance Data
- **UserProfile**: Extended user profile information
- **APIKey**: API key management
- **UsageRecord**: AI usage tracking
- **Budget**: Budget management
- **Policy**: Policy configuration

#### AI Provider Management
- **AIProvider**: AI provider configurations
- **UsageRecord**: API usage tracking
- **Budget**: Spending limits and alerts
- **Policy**: Compliance policies

#### Audit & Compliance
- **AuditLog**: Activity logging
- **Policy**: Policy enforcement
- **Budget**: Spending controls

#### Usage Analytics
- **UsageRecord**: Detailed usage tracking
- **Budget**: Budget monitoring
- **AuditLog**: Compliance logging

#### Organization Management
- **Organization**: Organization settings
- **User**: User management
- **APIKey**: API key management

#### Billing & Subscriptions
- **Subscription**: Subscription management
- **Transaction**: Payment tracking

## 🚀 Scripts

```bash
# Generate Prisma client
pnpm run generate

# Run database migrations
pnpm run migrate:deploy

# Create new migration
pnpm run migrate:dev

# Reset database (development only)
pnpm run migrate:reset

# Adopt migrations on a database built with `db push` (deploy refuses it, P3005)
DATABASE_URL=... scripts/baseline-pushed-db.sh

# Seed database
pnpm run seed

# Build package
pnpm run build
```

## 🔧 Environment Variables

```bash
# Required
DATABASE_URL="postgresql://username:password@localhost:5432/governs_ai"

# Optional
SHADOW_DATABASE_URL="postgresql://username:password@localhost:5432/governs_ai_shadow"
```

## 📁 File Structure

```
packages/db/
├── schema.prisma          # Database schema definition
├── migrations/            # Database migration files
├── generated/             # Generated Prisma client
├── queries/               # Custom query functions
├── index.ts              # Main export file
└── package.json          # Package configuration
```

## 🔗 Related Packages

- `@governs-ai/billing` - Billing utilities
- `@governs-ai/common-utils` - Common utilities
- `@governs-ai/ui` - Shared UI components

## 📝 Contributing

When updating the database schema:
1. Create a new migration using `pnpm run migrate:dev`
2. Test the migration in development
3. Update any affected queries or types
4. Update this README if adding new models
5. Ensure backward compatibility

## 🚨 Important Notes

- **Never modify generated files** in the `generated/` directory
- **Always use migrations** for schema changes
- **Test migrations** before deploying to production
- **Backup database** before running migrations in production

## 📄 License

MIT License - see root LICENSE file for details.

## Migrations and `db push` databases

`migrations/` builds the full schema: `migrate deploy` on an empty database
followed by `prisma migrate diff --from-url $DATABASE_URL --to-schema-datamodel
schema.prisma` reports no changes. The only exception is precheck's own tables
(`api_keys`, `budgets`, …), which share the database but are not in this schema.
`20261025130000_catch_up_schema_drift` added the objects that had only ever
been applied with `db push`. It is idempotent, so databases that already have
them upgrade cleanly.

A database created with `db push` has no `_prisma_migrations` table, so
`migrate deploy` refuses it. Run `scripts/baseline-pushed-db.sh` once. For each
migration it checks a marker query:

- If the migration's changes are already present, it marks the migration applied.
- If not, it lets `migrate deploy` run it.

A database that still holds plaintext API keys gets them hashed. When you add a
migration, add its marker to the script; the script refuses to run if a
migration has none.
