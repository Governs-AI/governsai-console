# 👁️ GovernsAI — The AI Governance OS

**Version 0.1.0** - Production-ready secure control plane for AI interactions

A comprehensive platform that acts as an intelligent gateway between users and AI models, providing complete visibility, control, and governance over AI usage and spending.

## 🎯 The Problem

AI adoption in businesses is chaotic. Developers use multiple AI services with different keys, spending is unpredictable and often spirals out of control, and there is no central way to enforce security policies or audit what data is being sent to third-party models. This leads to budget overruns and major compliance risks.

## 💡 The Solution: The Sidecar Gateway

The core of GovernsAI is a high-performance API gateway (the "Sidecar"). Instead of connecting directly to OpenAI or other providers, developers route their AI traffic through a single, secure GovernsAI endpoint.

This allows GovernsAI to:

- **Enforce Budgets**: Automatically block requests when a pre-set monthly budget is exceeded
- **Provide Visibility**: Log every single request, tracking costs, tokens, and latency on a central dashboard
- **Ensure Compliance**: Flag requests that contain Personally Identifiable Information (PII) before they are sent to an external model

## 🏗️ System Architecture

```mermaid
graph TB
    %% External Actors
    User[👤 User/Developer]
    ExternalApp[🤖 External Chatbot App<br/>Any AI Agent]
    AIProviders[🌐 AI Providers<br/>OpenAI, Anthropic, Google, etc.<br/>AI Agnostic]

    %% ============================================
    %% AUTHENTICATION & SSO LAYER
    %% ============================================
    subgraph "🔐 Login with GovernsAI SSO/IDP"
        Keycloak[🔑 Keycloak OAuth/OIDC Provider<br/>auth.governsai.com]
        KeycloakFeatures[📝 Features:<br/>• OAuth 2.0 / OIDC<br/>• Org Context in JWT<br/>• Custom Claims<br/>• User Sync]
    end

    User -->|1. Sign Up/Login| Platform
    ExternalApp -->|Login with GovernsAI| Keycloak
    Keycloak -->|JWT + Org Context| ExternalApp

    %% ============================================
    %% CENTRAL PLATFORM (Hub)
    %% ============================================
    subgraph "⚙️ Platform Dashboard - Central Hub"
        Platform[👁️ Governs AI]

        subgraph "Core Services"
            Passkey[🔑 Passkey/WebAuthn<br/>Payment Confirmation]
            Budget[💰 Budget Manager<br/>Real-time Enforcement]
            ToolReg[🛠️ Tool Registration<br/>Agent Marketplace]
            PolicyEngine[📋 Policy Engine<br/>Tool Blocking]
            APIKeys[🗝️ API Key Management]
        end

        subgraph "Unified Memory & RAG"
            UnifiedMemory[🧠 Unified Context Memory<br/>Semantic Search]
            UnifiedRAG[📚 Unified RAG Engine<br/>Multi-source Retrieval]
            VectorSearch[🔍 Vector Embeddings<br/>pgvector]
        end

        Platform --> Passkey
        Platform --> Budget
        Platform --> ToolReg
        Platform --> PolicyEngine
        Platform --> APIKeys
        Platform --> UnifiedMemory
        Platform --> UnifiedRAG
        UnifiedMemory --> VectorSearch
        UnifiedRAG --> VectorSearch
    end

    %% ============================================
    %% WEBSOCKET SERVICE
    %% ============================================
    subgraph "⚡ WebSocket Service - Real-time Gateway"
        WSService[🔌 WebSocket Server<br/>Node.js + Express]
        WSFeatures[📡 Real-time Events<br/>📝 Decision Logging<br/>💾 Context Auto-save<br/>🔗 Webhooks]
        WSService --> WSFeatures
    end

    User -->|WebSocket Connect| WSService
    ExternalApp -->|API Requests| WSService

    %% ============================================
    %% PRECHECK SERVICE (STANDALONE)
    %% ============================================
    subgraph "🔍 Precheck Service - PII Detection"
        Precheck[🛡️ Precheck API<br/>Standalone Service]
        PrecheckFeatures[• No DB Connection<br/>• Runs Independently<br/>• PII Detection<br/>• Compliance Checks]
        Precheck -.->|Features| PrecheckFeatures
    end

    %% ============================================
    %% DATABASE LAYER
    %% ============================================
    subgraph "🗄️ Data Layer - PostgreSQL + pgvector"
        DB[(PostgreSQL Database)]

        subgraph "Tables"
            Users[👥 Users & Orgs]
            Keys[🔑 API Keys]
            Decisions[📊 AI Decisions]
            ContextVectors[🧠 Context Vectors]
            Policies[📜 Policies & Rules]
            BudgetData[💵 Budget & Usage]
            Tools[🛠️ Registered Tools]
        end

        DB --> Users
        DB --> Keys
        DB --> Decisions
        DB --> ContextVectors
        DB --> Policies
        DB --> BudgetData
        DB --> Tools
    end

    %% ============================================
    %% AI & EMBEDDING SERVICES
    %% ============================================
    subgraph "🤖 AI & Embedding Services - Multi-Provider"
        OpenAI[🤖 OpenAI<br/>GPT-4 + Embeddings]
        Anthropic[🧠 Anthropic Claude]
        Google[🔍 Google Gemini]
        Ollama[🦙 Ollama Local]
        HuggingFace[🤗 Hugging Face]
        Cohere[⚡ Cohere]
    end

    %% ============================================
    %% DATA FLOW CONNECTIONS
    %% ============================================

    %% Platform <-> Database
    Platform <-->|Read/Write| DB
    Platform -->|Sync Users| Keycloak

    %% WebSocket Service <-> Database
    WSService <-->|Log Decisions<br/>Save Context| DB

    %% WebSocket <-> Platform Communication
    WSService <-->|Budget Check<br/>Policy Check<br/>Tool Validation| Platform

    %% Precheck Integration (Independent)
    Platform -->|PII Check Request| Precheck
    WSService -->|PII Check Request| Precheck
    Precheck -->|PII Report| Platform
    Precheck -->|PII Report| WSService

    %% Unified Memory/RAG <-> AI Services
    UnifiedMemory -->|Embedding Request| OpenAI
    UnifiedMemory -->|Embedding Request| Ollama
    UnifiedMemory -->|Embedding Request| HuggingFace
    UnifiedMemory -->|Embedding Request| Cohere

    UnifiedRAG -->|RAG Query| OpenAI
    UnifiedRAG -->|RAG Query| Anthropic
    UnifiedRAG -->|RAG Query| Google

    %% AI Agnostic Gateway
    WSService -->|Proxied AI Requests| AIProviders
    PolicyEngine -->|Tool Blocking Rules| WSService
    Budget -->|Budget Limits| WSService

    %% Passkey for Payment Confirmation
    Budget -->|Requires Confirmation| Passkey
    Passkey -->|WebAuthn Challenge| User

    %% Tool Registration & Agent Marketplace
    ToolReg -->|Register Tools| DB
    ExternalApp -->|Register as Agent| ToolReg
    PolicyEngine -->|Tool Access Control| ToolReg

    %% ============================================
    %% STYLING
    %% ============================================
    classDef platform fill:#e1f5fe,stroke:#01579b,stroke-width:3px
    classDef service fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef data fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef sso fill:#f3e5f5,stroke:#4a148c,stroke-width:3px
    classDef precheck fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    classDef ai fill:#e0f2f1,stroke:#004d40,stroke-width:2px
    classDef external fill:#fff9c4,stroke:#f57f17,stroke-width:2px

    class Platform,WSService platform
    class Keycloak,KeycloakFeatures sso
    class Precheck,PrecheckFeatures precheck
    class DB,Users,Keys,Decisions,ContextVectors,Policies,BudgetData,Tools data
    class OpenAI,Anthropic,Google,Ollama,HuggingFace,Cohere ai
    class User,ExternalApp,AIProviders external
```

## 🎯 Current Status

### ✅ Implemented Features (v0.1.0)

**Core Infrastructure**
- ✅ Next.js 15 platform with TypeScript
- ✅ Real-time WebSocket service for live updates
- ✅ PostgreSQL database with pgvector for semantic search
- ✅ Turborepo monorepo with shared packages

**Authentication & Security**
- ✅ **"Login with GovernsAI" OAuth/OIDC Provider** via Keycloak
- ✅ Passkey/WebAuthn authentication (phishing-resistant)
- ✅ Organization context embedded in JWT tokens
- ✅ Automatic user sync to Keycloak
- ✅ API key generation and management
- ✅ Secure session management with JWT
- ✅ HMAC webhook signature verification

**AI Governance**
- ✅ Budget tracking and enforcement
- ✅ Decision logging and audit trail
- ✅ Policy management system
- ✅ PII detection via Precheck API integration
- ✅ Real-time usage monitoring

**Context Memory System**
- ✅ Semantic search with vector embeddings
- ✅ Multi-provider support (OpenAI, Ollama, Hugging Face, Cohere)
- ✅ Automatic context saving from conversations
- ✅ Recency scoring and deduplication
- ✅ Cross-agent memory sharing
- ✅ Platform-only memory management

**Real-time Features**
- ✅ WebSocket gateway for live updates
- ✅ Real-time budget status notifications
- ✅ Live decision streaming
- ✅ Context save event webhooks

**Organization Management**
- ✅ Multi-tenant organization support
- ✅ User and role management
- ✅ Per-org API keys and policies
- ✅ Spending isolation by organization

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL database
- OpenAI API key (and other AI provider keys)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/governs-ai.git
cd governs-ai

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env

# Generate Prisma client
pnpm run generate

# Start development servers
pnpm run dev:all
```

## ⚙️ Environment Variables

### Required Environment Variables

#### Core Services

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
# Development URLs
NEXT_PUBLIC_LANDING_DEV_URL="http://localhost:3000"
NEXT_PUBLIC_PLATFORM_DEV_URL="http://localhost:3002"
NEXT_PUBLIC_DOCS_DEV_URL="http://localhost:3001"

# Production URLs
NEXT_PUBLIC_LANDING_URL="https://governsai.com"
NEXT_PUBLIC_PLATFORM_URL="https://app.governsai.com"
NEXT_PUBLIC_DOCS_URL="https://docs.governsai.com"
```

## ✨ Current Features (v0.1.0)

### 🔑 "Login with GovernsAI" - OAuth/OIDC Identity Provider

**The Killer Feature** - External applications can use GovernsAI as their identity provider:

- 🎯 **Single Sign-On (SSO)** - "Login with GovernsAI" button for external chatbot apps
- 🔐 **OAuth 2.0/OIDC Provider** - Full-featured identity provider via Keycloak
- 🏢 **Organization Context in Tokens** - Tokens include org_id, org_slug, and role
- 🔄 **Automatic User Sync** - Dashboard users automatically synced to Keycloak
- 📝 **Custom Claims** - GovernsAI-specific claims embedded in JWT tokens
- 🌐 **Standard OIDC Endpoints** - Works with any OAuth 2.0 library

**Use Cases:**
- Chatbot applications can use "Login with GovernsAI"
- AI agents get organization context automatically
- Centralized user management across AI ecosystem
- Governance policies follow users across apps

See [docs/keycloak-integration.md](docs/keycloak-integration.md) for integration guide.

---

### What's Live Now

**Platform Capabilities:**
- 🔐 **Authentication** - Passkey/WebAuthn authentication for phishing resistance
- 🔐 **Keycloak SSO/IDP** - Full OAuth/OIDC provider for "Login with GovernsAI"
- 🗝️ **API Key Management** - Generate, manage, and rotate API keys with scopes
- 💰 **Budget Tracking** - Monitor and control AI spending with real-time enforcement
- 📊 **Decision Logging** - Complete audit trail of all AI interactions
- 🧠 **Context Memory** - Semantic search across conversation history with vector embeddings
- 🔍 **PII Detection** - Automatic flagging of sensitive data via Precheck API
- ⚡ **Real-time Monitoring** - WebSocket-based live updates and notifications
- 🏢 **Multi-tenant** - Full organization and user management
- 📋 **Policy Engine** - Define and enforce governance policies
- 🔗 **Webhooks** - Event-driven integrations for custom workflows

### Key Features at a Glance

| Feature | Status | Description |
|---------|--------|-------------|
| **🎯 "Login with GovernsAI"** | ✅ Live | OAuth/OIDC provider for external apps via Keycloak |
| **🔐 Passkey Auth** | ✅ Live | WebAuthn-based phishing-resistant authentication |
| **🏢 Org Context in Tokens** | ✅ Live | JWT tokens include org_id, org_slug, and role |
| **🔑 API Key Management** | ✅ Live | Generate, manage, and rotate API keys with scopes |
| **💰 Budget Control** | ✅ Live | Set spending limits with real-time enforcement |
| **📊 Decision Logging** | ✅ Live | Complete audit trail of all AI interactions |
| **🧠 Context Memory** | ✅ Live | Semantic search across conversation history |
| **🔍 PII Detection** | ✅ Live | Automatic flagging of sensitive data |
| **⚡ Real-time Updates** | ✅ Live | WebSocket-based live notifications |
| **🔗 Webhook System** | ✅ Live | Event-driven integrations |

## 🛠️ Tech Stack

**Frontend**
- Next.js 15 (App Router)
- TypeScript 5.8
- React 18
- Tailwind CSS
- shadcn/ui components
- Lucide React icons

**Backend**
- Next.js API Routes
- Node.js + Express (WebSocket service)
- Prisma ORM
- PostgreSQL 11+ with pgvector extension

**Authentication**
- WebAuthn/Passkey (FIDO2)
- Keycloak SSO
- JWT-based sessions
- Argon2id password hashing

**AI & Embeddings**
- OpenAI (GPT-4, text-embedding-3-small)
- Ollama (local embeddings)
- Hugging Face Transformers
- Cohere embeddings

**Real-time**
- WebSocket (ws library)
- Server-Sent Events
- Ably for pub/sub

**Infrastructure**
- pnpm + Turborepo monorepo
- Docker support
- Vercel-ready deployment

## 🚀 Development

### Available Scripts

```bash
# Start all services
pnpm run dev:all

# Start individual services
pnpm run dev:platform        # Platform dashboard (http://localhost:3002)
# WebSocket service runs separately (see apps/websocket-service)

# Build all applications
pnpm run build

# Database operations
pnpm run generate            # Generate Prisma client
pnpm --filter @governs-ai/db run migrate:dev  # Run migrations

# Code quality
pnpm run lint               # Lint all packages
pnpm run check-types        # TypeScript type checking
pnpm run format             # Format code with Prettier

# Cleanup
pnpm run clean              # Remove build artifacts and node_modules
```

### Project Structure

```
governs-ai/
├── apps/
│   ├── platform/                 # Main Platform Dashboard (Next.js 15)
│   │   ├── app/                  # App router pages and API routes
│   │   ├── components/           # React components
│   │   ├── lib/                  # Services and utilities
│   │   └── public/               # Static assets
│   └── websocket-service/        # Real-time WebSocket Service (Node.js)
│       ├── src/
│       │   ├── server.js         # Express server setup
│       │   ├── websocket/        # WebSocket handlers
│       │   └── services/         # Auth and business logic
│       └── package.json
├── packages/
│   ├── db/                       # Prisma schema and database client
│   │   ├── prisma/
│   │   │   └── schema.prisma    # Database schema
│   │   └── migrations/          # Database migrations
│   ├── ui/                      # Shared UI components
│   ├── layout/                  # Layout components
│   ├── billing/                 # Billing utilities
│   ├── common-utils/            # Shared utilities
│   ├── typescript-config/       # TypeScript configs
│   └── eslint-config/           # ESLint configs
├── docs/                        # Documentation
│   ├── environment-variables.md
│   ├── unified-context-memory.md
│   └── keycloak-integration.md
├── .env.example                 # Environment template
├── SECURITY.md                  # Security policy
└── LICENSE                      # ELv2 License
```

## 🚀 Deployment

### Vercel Deployment

1. Fork this repository
2. Connect your Vercel account
3. Set up environment variables in Vercel dashboard
4. Deploy each app to separate Vercel projects
5. Update the routing configuration with your domain URLs

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individual images
docker build -t governs-ai .
docker run -p 3000:3000 governs-ai
```

## 🔒 Security

Security is a top priority for GovernsAI. See [SECURITY.md](SECURITY.md) for:
- Security best practices
- Environment variable requirements
- How to report vulnerabilities
- Production deployment checklist

**Key Security Features:**
- All secrets must be in environment variables (no hardcoded fallbacks)
- Passkey authentication for phishing resistance
- HMAC signature verification for webhooks
- Timing-safe comparison for sensitive operations
- Argon2id password hashing
- JWT-based session management
- CORS configuration with whitelisting

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Workflow

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/governs-ai.git`
3. Create a feature branch: `git checkout -b feature/amazing-feature`
4. Copy environment template: `cp .env.example .env`
5. Fill in your environment variables
6. Install dependencies: `pnpm install`
7. Run database migrations: `pnpm run generate`
8. Start development: `pnpm run dev:all`
9. Make your changes
10. Run quality checks: `pnpm run lint && pnpm run check-types`
11. Commit your changes: `git commit -m 'feat: add amazing feature'`
12. Push to your fork: `git push origin feature/amazing-feature`
13. Open a Pull Request

### Commit Convention

We use conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks
- `security:` - Security improvements

## 📄 License

This project is licensed under the Elastic License 2.0 (ELv2). See the `LICENSE` file for details.

The ELv2 license allows you to use, modify, and redistribute this software freely, with the following key limitations:
- You may not provide the software to third parties as a hosted or managed service
- You may not circumvent the license key functionality

For more information, visit https://www.elastic.co/licensing/elastic-license

## 🙏 Acknowledgments

- Built with Next.js and the amazing open source community
- AI powered by OpenAI, Anthropic, and Google
- UI components from shadcn/ui
- Icons from Lucide React

## 🗺️ Roadmap

### Current Release (v0.1.0)
- ✅ Core governance platform
- ✅ Context memory system
- ✅ Real-time monitoring
- ✅ Multi-tenant support

### Upcoming Features (Roadmap)

**Enhanced SSO/IDP Capabilities**
- 🔄 Direct integration with ChatGPT, Claude, Gemini for "Login with GovernsAI"
- 🔄 Federated identity across AI platforms (once they support custom OIDC providers)
- 🔄 Policy enforcement in tokens (budget limits, permissions as claims)
- 🔄 Automatic governance application via token claims

**AI Proxy Gateway (Sidecar Mode)**
- 🔄 Per-user/org proxy endpoints (governsai.com/u/{id})
- 🔄 Transparent request interception and governance
- 🔄 Provider failover and load balancing
- 🔄 Zero-trust AI access layer

**Enterprise Features**
- 🔄 Cost optimization recommendations and alerts
- 🔄 Compliance reporting (SOC2, GDPR, HIPAA)
- 🔄 Marketplace for governance plugins and integrations
- 🔄 Mobile app for real-time monitoring
- 🔄 Advanced analytics, insights, and BI dashboards
- 🔄 AI agent marketplace with verified governance

## 🌟 Vision

**GovernsAI is the AI Governance OS** — a unified identity, policy, and compliance layer that keeps AI interactions secure, auditable, and under control.

Starting as a comprehensive governance platform for developers, GovernsAI will evolve into the essential governance layer for enterprise AI, expanding to include:
- Complex policy enforcement with custom rules
- Fine-grained role-based access control
- Trusted marketplace for third-party AI agents and governance plugins
- Enterprise compliance reporting (SOC2, GDPR, HIPAA)
- AI usage optimization and cost reduction

It will become the single source of truth for how organizations interact with artificial intelligence — providing complete control, visibility, and compliance across all AI interactions.