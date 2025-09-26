# GovernsAI Project Specifications

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [API Specifications](#api-specifications)
5. [Frontend Components](#frontend-components)
6. [Authentication & Authorization](#authentication--authorization)
7. [AI Governance Features](#ai-governance-features)
8. [Development Guidelines](#development-guidelines)
9. [Deployment Specifications](#deployment-specifications)
10. [Testing Strategy](#testing-strategy)
11. [Security Considerations](#security-considerations)
12. [Performance Requirements](#performance-requirements)

## 🎯 Project Overview

### Mission Statement
GovernsAI is a secure control plane for AI interactions that acts as an intelligent gateway between users and AI models, providing complete visibility and control over AI usage, spending, and compliance.

### Core Value Propositions
- **Cost Control**: Predictable AI spending with budget enforcement
- **Security**: PII detection and data protection
- **Compliance**: Comprehensive audit trails and policy enforcement
- **Visibility**: Real-time monitoring and analytics
- **Unified Access**: Single endpoint for multiple AI providers

### Target Users
- **Primary**: Enterprise developers and DevOps teams
- **Secondary**: AI application developers and startups
- **Tertiary**: Compliance officers and security teams

## 🏗️ System Architecture

### Monorepo Structure
```
governs-ai/
├── apps/                    # Applications
│   ├── landing/             # Marketing & Landing Page (Port 3003)
│   ├── platform/            # Main Platform App (Port 3002)
│   ├── docs/                # Documentation Site (Port 3001)
│   └── websocket-service/   # Standalone WebSocket Service (Port 3000)
├── packages/                # Shared Packages
│   ├── ui/                  # UI Components (shadcn/ui based)
│   ├── layout/              # Layout Components
│   ├── db/                  # Database Schema & Queries
│   ├── common-utils/        # Shared Utilities
│   ├── typescript-config/   # TypeScript Configuration
│   └── eslint-config/       # ESLint Configuration
```

### Technology Stack
- **Frontend**: Next.js 15, TypeScript, React 18, Tailwind CSS
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: PostgreSQL with Prisma
- **Authentication**: NextAuth.js with Google OAuth
- **AI Providers**: OpenAI, Anthropic Claude, Google Gemini
- **Infrastructure**: Vercel, Docker
- **Package Manager**: pnpm with Turborepo

### Application Ports
- **Landing**: http://localhost:3003
- **Platform**: http://localhost:3002
- **Docs**: http://localhost:3001

## 🗄️ Database Schema

### Core Models

#### User Model
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  apiKeys      APIKey[]
  usageRecords UsageRecord[]
  budgets      Budget[]
  auditLogs    AuditLog[]
}
```

#### APIKey Model
```prisma
model APIKey {
  id        String   @id @default(cuid())
  label     String
  keyValue  String   @unique
  scopes    String[] // ["precheck:invoke", "ingest:write", "policy:publish"]
  orgId     String
  isActive  Boolean  @default(true)
  lastUsed  DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  user User @relation(fields: [userId], references: [id])
  userId String
}
```

#### Decision Model (Event Ingest)
```prisma
model Decision {
  id               String   @id @default(cuid())
  orgId            String
  direction        String   // "precheck" | "postcheck"
  decision         String   // "allow" | "transform" | "deny"
  tool             String?
  scope            String?
  detectorSummary  Json     @default("{}")
  payloadHash      String
  latencyMs        Int?
  correlationId    String?
  tags             Json     @default("[]")
  ts               DateTime @default(now())
  
  @@index([orgId, ts(sort: Desc)])
  @@index([decision])
  @@index([direction])
  @@index([tool])
  @@index([correlationId])
}
```

#### Policy Model
```prisma
model Policy {
  id               String   @id @default(cuid())
  name             String
  description      String
  toolAccessMatrix Json     @default("{}")
  orgId            String
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

#### UsageRecord Model
```prisma
model UsageRecord {
  id          String   @id @default(cuid())
  userId      String
  orgId       String
  provider    String   // "openai", "anthropic", "google"
  model       String   // "gpt-4", "claude-3", "gemini-pro"
  inputTokens Int
  outputTokens Int
  cost        Decimal
  timestamp   DateTime @default(now())
  
  // Relations
  user User @relation(fields: [userId], references: [id])
}
```

#### Budget Model
```prisma
model Budget {
  id          String   @id @default(cuid())
  userId      String
  orgId       String
  name        String
  limit       Decimal
  current     Decimal  @default(0)
  period      String   // "monthly", "yearly"
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  user User @relation(fields: [userId], references: [id])
}
```

#### AuditLog Model
```prisma
model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  orgId     String
  action    String   // "api_call", "policy_change", "budget_update"
  resource  String   // "decision", "policy", "budget"
  details   Json     @default("{}")
  timestamp DateTime @default(now())
  
  // Relations
  user User @relation(fields: [userId], references: [id])
}
```

## 🔌 API Specifications

### Event Ingest API

#### POST /api/v1/ingest/decision
**Purpose**: Ingest decision events from AI governance system

**Headers**:
```
Content-Type: application/json
X-Governs-Signature: sha256=<hmac_signature> (optional)
```

**Request Body**:
```json
{
  "orgId": "string",
  "direction": "precheck" | "postcheck",
  "decision": "allow" | "transform" | "deny",
  "tool": "string (optional)",
  "scope": "string (optional)",
  "detectorSummary": {
    "reasons": ["string"],
    "confidence": "number",
    "piiDetected": ["string"]
  },
  "payloadHash": "string",
  "latencyMs": "number (optional)",
  "correlationId": "string (optional)",
  "tags": ["string"],
  "timestamp": "number (unix timestamp, optional)"
}
```

**Response**:
```json
{
  "status": "accepted"
}
```

**Status Codes**:
- `202 Accepted`: Event ingested successfully
- `400 Bad Request`: Missing required fields
- `500 Internal Server Error`: Server error

### Decisions API

#### GET /api/decisions
**Purpose**: Retrieve decision events with filtering and pagination

**Query Parameters**:
- `orgId`: Organization ID (required)
- `direction`: Filter by direction ("precheck" | "postcheck")
- `decision`: Filter by decision ("allow" | "transform" | "deny")
- `tool`: Filter by tool name
- `correlationId`: Filter by correlation ID
- `startTime`: Start time filter (ISO string)
- `endTime`: End time filter (ISO string)
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)
- `includeStats`: Include statistics (boolean)

**Response**:
```json
{
  "decisions": [
    {
      "id": "string",
      "orgId": "string",
      "direction": "string",
      "decision": "string",
      "tool": "string",
      "scope": "string",
      "detectorSummary": {},
      "payloadHash": "string",
      "latencyMs": "number",
      "correlationId": "string",
      "tags": ["string"],
      "ts": "string (ISO date)"
    }
  ],
  "stats": {
    "total": "number",
    "byDecision": {
      "allow": "number",
      "transform": "number",
      "deny": "number"
    },
    "byDirection": {
      "precheck": "number",
      "postcheck": "number"
    },
    "byTool": {
      "tool_name": "number"
    }
  },
  "lastIngestTime": "string (ISO date)",
  "pagination": {
    "limit": "number",
    "offset": "number",
    "hasMore": "boolean"
  }
}
```

### API Keys Management

#### GET /api/v1/keys
**Purpose**: List API keys for organization

**Query Parameters**:
- `orgId`: Organization ID (required)

**Response**:
```json
[
  {
    "id": "string",
    "label": "string",
    "scopes": ["string"],
    "issuedAt": "string (ISO date)",
    "lastUsed": "string (ISO date)",
    "isActive": "boolean"
  }
]
```

#### POST /api/v1/keys
**Purpose**: Create new API key

**Request Body**:
```json
{
  "label": "string",
  "scopes": ["string"],
  "orgId": "string"
}
```

**Response**:
```json
{
  "id": "string",
  "label": "string",
  "scopes": ["string"],
  "keyValue": "string (only returned on creation)",
  "issuedAt": "string (ISO date)",
  "isActive": "boolean"
}
```

#### DELETE /api/v1/keys/[id]
**Purpose**: Delete API key

**Response**:
```json
{
  "message": "API key deleted successfully"
}
```

#### PATCH /api/v1/keys/[id]
**Purpose**: Update API key (toggle active status)

**Request Body**:
```json
{
  "isActive": "boolean"
}
```

### Policies Management

#### GET /api/v1/policies
**Purpose**: List policies for organization

**Query Parameters**:
- `orgId`: Organization ID (required)

**Response**:
```json
[
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "toolAccessMatrix": {},
    "isActive": "boolean",
    "createdAt": "string (ISO date)",
    "updatedAt": "string (ISO date)"
  }
]
```

#### POST /api/v1/policies
**Purpose**: Create new policy

**Request Body**:
```json
{
  "name": "string",
  "description": "string",
  "toolAccessMatrix": {
    "web.fetch": {
      "email": "tokenize",
      "phone": "mask",
      "ssn": "remove"
    }
  },
  "orgId": "string"
}
```

#### PATCH /api/v1/policies/[id]
**Purpose**: Update policy

**Request Body**:
```json
{
  "name": "string (optional)",
  "description": "string (optional)",
  "toolAccessMatrix": "object (optional)",
  "isActive": "boolean (optional)"
}
```

#### DELETE /api/v1/policies/[id]
**Purpose**: Delete policy

**Response**:
```json
{
  "message": "Policy deleted successfully"
}
```

## 🎨 Frontend Components

### Core UI Components

#### HealthPill Component
**Location**: `apps/platform/components/health-pill.tsx`

**Purpose**: Display system health status and metrics

**Features**:
- Real-time health status (healthy/warning/error)
- Last ingest time display
- DLQ count monitoring
- Total decisions counter
- Error rate calculation
- Auto-refresh every 30 seconds

**Props**:
```typescript
interface HealthPillProps {
  orgId?: string;
  refreshInterval?: number;
}
```

#### DecisionsClient Component
**Location**: `apps/platform/app/dashboard/decisions/decisions-client.tsx`

**Purpose**: Display and manage decision events

**Features**:
- Real-time decision event table
- Advanced filtering (direction, decision, tool, time range)
- Statistics cards (total, allowed, transformed, denied)
- Detail drawer with full event JSON
- Pagination support
- Auto-refresh capability

**State Management**:
```typescript
interface DecisionEvent {
  id: string;
  orgId: string;
  direction: "precheck" | "postcheck";
  decision: "allow" | "transform" | "deny";
  tool?: string;
  scope?: string;
  detectorSummary: Record<string, any>;
  payloadHash: string;
  latencyMs?: number;
  correlationId?: string;
  tags: string[];
  ts: string;
}
```

#### KeysClient Component
**Location**: `apps/platform/app/dashboard/keys/keys-client.tsx`

**Purpose**: Manage API keys

**Features**:
- API key listing with status
- Create new API keys with scopes
- Toggle key active/inactive status
- Delete keys with confirmation
- Secure key value display (one-time only)
- Copy to clipboard functionality

**Available Scopes**:
- `precheck:invoke`: Allow invoking precheck decisions
- `ingest:write`: Allow writing decision events
- `policy:publish`: Allow publishing policies

#### PoliciesClient Component
**Location**: `apps/platform/app/dashboard/policies/policies-client.tsx`

**Purpose**: Manage governance policies

**Features**:
- Policy listing and management
- Tool access matrix configuration
- PII class handling per tool
- Transform options (pass_through, tokenize, mask, remove)
- Policy creation and editing
- Active/inactive status management

**Tool Access Matrix**:
```typescript
interface ToolAccessMatrix {
  [tool: string]: {
    [piiClass: string]: "pass_through" | "tokenize" | "mask" | "remove";
  };
}
```

**Available Tools**:
- `web.fetch`, `web.search`
- `code.execute`
- `file.read`, `file.write`
- `db.query`
- `ai.generate`, `ai.analyze`

**PII Classes**:
- `email`, `phone`, `ssn`
- `credit_card`, `address`
- `name`, `date_of_birth`

## 🔐 Authentication & Authorization

### Authentication Methods
- **Primary**: Email + Password with Argon2id hashing
- **Secondary**: JWT session tokens for web access
- **MFA**: TOTP (Time-based One-Time Password) support
- **Future**: OAuth2/OIDC integration

### Multi-Tenant Organization System
- **Organizations**: Isolated workspaces with unique slugs
- **Memberships**: Role-based access control per organization
- **Invitations**: Email-based team member invitations
- **Subdomain Support**: `{orgSlug}.app.governs.ai` routing

### User Management
- **Registration**: Self-service signup with email verification
- **Password Reset**: Secure token-based password recovery
- **Profile Management**: User profile and organization switching
- **Account Security**: TOTP MFA setup and management

### Authorization Levels
- **OWNER**: Full organization control, can manage all members
- **ADMIN**: User management, policy configuration, billing access
- **DEVELOPER**: API key management, usage monitoring, policy testing
- **VIEWER**: Read-only access to analytics and policies

### Security Features
- **Password Security**: Argon2id hashing with optional server-side pepper
- **Session Management**: HTTP-only cookies with secure flags
- **MFA Support**: TOTP with QR code setup and verification
- **Email Verification**: Required before organization access
- **Rate Limiting**: Login, signup, and password reset protection
- **Audit Logging**: All authentication and authorization events

### API Key Authentication
- **HMAC Signatures**: Optional for enhanced security
- **Scope-based Access**: Granular permissions
- **Rate Limiting**: Per-key request limits

## 🛡️ AI Governance Features

### Precheck System
**Purpose**: Validate requests before sending to AI providers

**Features**:
- Budget enforcement
- PII detection
- Policy compliance checking
- Rate limiting
- Request logging

### Postcheck System
**Purpose**: Analyze responses after AI provider interaction

**Features**:
- Response content analysis
- Cost calculation
- Usage tracking
- Audit logging
- Quality metrics

### PII Detection
**Supported Data Types**:
- Email addresses
- Phone numbers
- Social Security Numbers
- Credit card numbers
- Physical addresses
- Names and dates of birth

**Detection Methods**:
- Regex pattern matching
- Machine learning models
- Custom rule engines
- Third-party PII detection services

### Budget Management
**Features**:
- Per-organization spending limits
- Real-time cost tracking
- Automatic request blocking
- Spending alerts and notifications
- Historical cost analysis

## 🛠️ Development Guidelines

### Code Standards
- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Code formatting
- **Husky**: Pre-commit hooks
- **Conventional Commits**: Standardized commit messages

### Component Guidelines
- **Functional Components**: Use React hooks
- **TypeScript Interfaces**: Define all props and state
- **Error Boundaries**: Implement error handling
- **Loading States**: Show loading indicators
- **Accessibility**: WCAG 2.1 AA compliance

### API Guidelines
- **RESTful Design**: Follow REST principles
- **Error Handling**: Consistent error responses
- **Validation**: Input validation on all endpoints
- **Documentation**: OpenAPI/Swagger specs
- **Rate Limiting**: Implement rate limits

### Database Guidelines
- **Migrations**: Use Prisma migrations
- **Indexes**: Optimize query performance
- **Relations**: Proper foreign key constraints
- **Soft Deletes**: Use deletedAt timestamps
- **Audit Trails**: Log all changes

## 🚀 Deployment Specifications

### Environment Variables

#### Required Variables
```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/governs_ai"

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# AI Providers
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"
GOOGLE_AI_API_KEY="your-google-ai-api-key"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

#### Application URLs
```bash
# Development
NEXT_PUBLIC_LANDING_DEV_URL="http://localhost:3000"
NEXT_PUBLIC_PLATFORM_DEV_URL="http://localhost:3002"
NEXT_PUBLIC_DOCS_DEV_URL="http://localhost:3001"

# Production
NEXT_PUBLIC_LANDING_URL="https://governs.ai"
NEXT_PUBLIC_PLATFORM_URL="https://app.governs.ai"
NEXT_PUBLIC_DOCS_URL="https://docs.governs.ai"
```

### Vercel Deployment
1. **Separate Projects**: Each app deployed independently
2. **Environment Variables**: Set in Vercel dashboard
3. **Custom Domains**: Configure subdomains
4. **Build Commands**: Optimized for Turborepo
5. **Edge Functions**: Use for high-performance APIs

### Docker Deployment
```dockerfile
# Multi-stage build
FROM node:18-alpine AS base
FROM base AS deps
FROM base AS builder
FROM base AS runner

# Production optimizations
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
```

## 🧪 Testing Strategy

### Testing Levels
1. **Unit Tests**: Component and utility functions
2. **Integration Tests**: API endpoints and database
3. **E2E Tests**: Critical user workflows
4. **Performance Tests**: Load and stress testing

### Testing Tools
- **Jest**: Unit testing framework
- **React Testing Library**: Component testing
- **Playwright**: E2E testing
- **k6**: Performance testing
- **MSW**: API mocking

### Test Coverage
- **Minimum Coverage**: 80% for critical paths
- **Critical Paths**: Authentication, API endpoints, data processing
- **UI Components**: All interactive components
- **API Endpoints**: All public endpoints

## 🔒 Security Considerations

### Data Protection
- **Encryption**: TLS 1.3 for data in transit
- **Database Encryption**: AES-256 for data at rest
- **API Keys**: Secure storage and rotation
- **PII Handling**: Minimal collection and processing

### Access Control
- **Authentication**: Multi-factor authentication
- **Authorization**: Role-based access control
- **API Security**: Rate limiting and DDoS protection
- **Audit Logging**: Comprehensive activity logs

### Compliance
- **GDPR**: Data protection and privacy rights
- **SOC 2**: Security and availability controls
- **HIPAA**: Healthcare data protection (future)
- **PCI DSS**: Payment card data security (future)

## ⚡ Performance Requirements

### Response Times
- **API Endpoints**: < 200ms for 95th percentile
- **Database Queries**: < 100ms for simple queries
- **Page Load**: < 2s for initial load
- **Real-time Updates**: < 1s for live data

### Scalability
- **Concurrent Users**: Support 10,000+ users
- **API Requests**: Handle 100,000+ requests/hour
- **Database**: Support 1M+ records per table
- **Storage**: Efficient data retention policies

### Monitoring
- **Application Metrics**: Response times, error rates
- **Infrastructure Metrics**: CPU, memory, disk usage
- **Business Metrics**: User activity, feature usage
- **Alerting**: Proactive issue detection

## 📊 Analytics & Monitoring

### Key Metrics
- **User Engagement**: Daily/monthly active users
- **API Usage**: Request volume and patterns
- **Cost Tracking**: Spending trends and budgets
- **Security Events**: PII detection and policy violations

### Dashboards
- **Executive Dashboard**: High-level business metrics
- **Operations Dashboard**: System health and performance
- **Security Dashboard**: Threat detection and compliance
- **Developer Dashboard**: API usage and debugging

### Logging
- **Application Logs**: Structured JSON logging
- **Audit Logs**: Immutable security events
- **Performance Logs**: Timing and resource usage
- **Error Logs**: Exception tracking and debugging

---

## 🔌 WebSocket Architecture

### Overview
GovernsAI uses a **standalone WebSocket service** for real-time AI governance decisions (precheck/postcheck). This service is deployed separately from the main platform for scalability and performance.

### Standalone WebSocket Service: `apps/websocket-service/`
**Purpose**: Dedicated real-time service for precheck/postcheck AI governance decisions

**Architecture**:
```
┌─────────────────┐    ┌──────────────────┐
│   Dashboard     │    │  External Apps   │
│   (Vercel)      │    │  (Precheck)      │
└─────────────────┘    └──────────────────┘
         │                       │
         └───────────────────────┘
                    │
         ┌─────────────────────┐
         │  WebSocket Service  │
         │    (Railway)        │
         │                     │
         │  - Authentication   │
         │  - Message Routing  │
         │  - Decision Storage │
         │  - Real-time Sync   │
         └─────────────────────┘
                    │
         ┌─────────────────────┐
         │     Database        │
         │   (Shared)          │
         └─────────────────────┘
```

**Key Components**:
- `src/server.js` - Main service entry point with Express + WebSocket server
- `src/websocket/handler.js` - WebSocket connection and message handling
- `src/websocket/validator.js` - Message validation with Zod schemas
- `src/websocket/channels.js` - Channel subscription management
- `src/services/auth.js` - API key and session authentication
- `src/services/decision.js` - Decision processing and storage
- `src/services/health.js` - Health monitoring and metrics

**Database Models**:
- `Decision` - Processed precheck/postcheck decisions
- `APIKey` - Authentication keys for external clients
- `WebSocketSession` - Active connection tracking (optional)
- `AuditLog` - Activity logging and audit trail

**Flow**:
1. User generates WebSocket URL via dashboard (`/api/ws/generate-url/`)
2. External precheck/postcheck system connects to `wss://websocket-service.railway.app/ws`
3. Client sends `INGEST` messages with decision data
4. Messages are validated, processed, and stored in `Decision` table
5. Real-time updates are broadcast to dashboard subscribers

### Dashboard Integration: `/api/ws/`
**Purpose**: WebSocket URL generation and configuration for dashboard

**Key Components**:
- `/api/ws/generate-url/` - Generate WebSocket URLs pointing to standalone service
- `/api/ws/generate-url/new-key/` - Create new API key and generate URL
- `/api/ws/generate-url/delete-key/` - Soft-delete API keys

**Usage**: These endpoints provide the dashboard interface for managing WebSocket connections to the standalone service.

### Monitoring System: `/api/websockets/`
**Purpose**: WebSocket connection monitoring and activity logging

**Key Components**:
- `/api/websockets/connections/` - Fetch connection status for dashboard
- `/api/websockets/activity/` - Log WebSocket activities for audit

**Usage**: These endpoints are used by the decisions page to display real-time connection status and activity from the standalone service.

### Message Schemas
**INGEST Message Format**:
```json
{
  "type": "INGEST",
  "channel": "org:orgId:decisions",
  "schema": "decision.v1",
  "idempotencyKey": "unique-key",
  "data": {
    "orgId": "string",
    "direction": "precheck|postcheck", 
    "decision": "allow|transform|deny",
    "tool": "string",
    "scope": "string",
    "payloadHash": "string",
    "latencyMs": 123,
    "correlationId": "string"
  }
}
```

### Security
- API key authentication embedded in WebSocket URL
- Channel-based access control (org-level, user-level, key-level)
- Session tracking with automatic cleanup
- Audit logging for all WebSocket activities

---

## 📝 Recent Changes Log

- **2024-12-26**: Standalone WebSocket Service Architecture
  - **MAJOR CHANGE**: Created completely separate WebSocket service (`apps/websocket-service/`)
  - **Deployment Strategy**: WebSocket service can be deployed independently on Railway/other platforms
  - **Scalability**: Dedicated service for high-throughput real-time decision processing
  - **Architecture**: Express + WebSocket server with comprehensive message handling
  - **Authentication**: API key and session token support with proper validation
  - **Channel Management**: Organized message routing by org/user/key channels
  - **Health Monitoring**: Built-in health checks, metrics, and performance tracking
  - **Production Ready**: Docker support, graceful shutdown, error handling
  - **Testing**: Comprehensive test client for validation
  - **Documentation**: Complete README with API reference and deployment guide
  - **Platform Integration**: Updated dashboard to point to standalone service
  - **Clean Architecture**: Removed old embedded WebSocket code from platform

- **2024-12-19**: Implemented comprehensive authentication system
  - Added multi-tenant organization system with role-based access control
  - Implemented email/password authentication with Argon2id hashing
  - Added TOTP MFA support with QR code setup
  - Created organization invitation system with email tokens
  - Built complete auth UI pages (login, signup, password reset, MFA setup)
  - Added middleware for org resolution and auth protection
  - Updated database schema with User, Credential, Org, OrgMembership models
  - Implemented secure session management with JWT tokens
  - Added password reset and email verification flows
  - Created organization management and member invitation system
  - All authentication features are production-ready with proper security measures

- **2024-12-19**: Fixed development server issues
  - Resolved port conflicts (3002, 3003)
  - Removed duplicate pnpm-lock.yaml from platform app
  - Set up shared UI components using shadcn/ui
  - Added LoadingSpinner component to shared UI package
  - Updated TypeScript path mappings for shared components
  - Removed deprecated `appDir` option from Next.js configs
  - All TypeScript compilation errors resolved

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-XX | Initial MVP with core features |
| 1.1.0 | 2024-02-XX | PII detection and policy engine |
| 1.2.0 | 2024-03-XX | Advanced analytics and reporting |
| 2.0.0 | 2024-04-XX | Enterprise features and compliance |

---

*This document is living and will be updated as the project evolves. For the most current version, please refer to the main repository.*
