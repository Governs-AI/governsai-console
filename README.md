# 🌐 GovernsAI — The AI Governance OS

**Secure control plane for AI interactions** that acts as an intelligent gateway between users and AI models, providing complete visibility and control over AI usage and spending.

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
    %% User Entry Points
    User[👤 User] --> Landing[🌐 Landing App<br/>Marketing & Sales]
    User --> Platform[⚙️ Platform App<br/>Main Dashboard]
    User --> Docs[📚 Docs App<br/>Documentation]

    %% Main Applications
    Landing --> Auth[🔐 Authentication]
    Platform --> Auth
    Docs --> Auth

    %% Shared Packages
    Platform --> Layout[📐 Layout Package]
    Landing --> Layout
    Docs --> Layout

    Platform --> UI[🎨 UI Package]
    Landing --> UI
    Docs --> UI

    Platform --> Billing[💳 Billing Package]
    Platform --> DB[(🗄️ Database<br/>PostgreSQL)]
    Platform --> CommonUtils[🛠️ Common Utils]

    %% External Services
    Platform --> OpenAI[🤖 OpenAI API]
    Platform --> Claude[🤖 Claude API]
    Platform --> Gemini[🤖 Gemini API]

    Auth --> Google[🔐 Google OAuth]

    %% Data Flow
    subgraph "AI Governance Layer"
        Proxy[🛡️ AI Proxy Gateway]
        PII[🔍 PII Detection]
        Budget[💰 Budget Control]
        Audit[📊 Audit Logging]
    end

    Platform --> Proxy
    Proxy --> OpenAI
    Proxy --> Claude
    Proxy --> Gemini

    Proxy --> PII
    Proxy --> Budget
    Proxy --> Audit

    %% Styling
    classDef app fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef package fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef service fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef data fill:#fff3e0,stroke:#e65100,stroke-width:2px

    class Landing,Platform,Docs app
    class Layout,UI,Billing,CommonUtils package
    class OpenAI,Claude,Gemini,Google service
    class DB,Proxy,PII,Budget,Audit data
```

## 📦 The MVP Plan

The project will be built in two minimal, rapid phases:

### Phase 1: The "Cost Controller" MVP
The absolute core product. It will provide the proxy endpoint, a dashboard for visibility, and the critical budget enforcement feature. The goal is to solve the #1 pain point: unpredictable spending.

### Phase 2: The "PII-Aware" Upgrade
The first major feature enhancement. It will add an asynchronous PII detection system that flags requests containing sensitive data in the user's dashboard, demonstrating immediate security value.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
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
cp .env.example .env.local

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
NEXT_PUBLIC_LANDING_URL="https://governs.ai"
NEXT_PUBLIC_PLATFORM_URL="https://app.governs.ai"
NEXT_PUBLIC_DOCS_URL="https://docs.governs.ai"
```

## ✨ Core Features

### 🔑 Mode 1: Login with AI (Passport Mode)

Users sign in once through GovernsAI (via passkey, wallet, or SSO).

Connect to multiple AI agents (ChatGPT, Gemini, Claude, custom MCP agents).

GovernsAI applies policies: budgets, approvals, logging, redaction.

Enterprises gain centralized control and visibility.

### ⚙️ Mode 2: Sidecar MCP Gateway (Optional)

Users or enterprises get a per-user/per-org endpoint (governs.ai/u/{id}).

Any agent can route API traffic through this Sidecar without changing its login system.

GovernsAI transparently enforces policies, logs usage, and redacts sensitive data.

No lock-in: the AI provider (OpenAI, Google, Anthropic, etc.) still sees standard API calls.

### Key Features

- **✅ Unified Identity**: One login for multiple agents (passkey, OAuth, or wallet)
- **✅ Budgets & Payments**: Set per-agent or per-team usage limits with real-time spend dashboards
- **✅ Compliance & Audit**: Immutable logs of all prompts, responses, and tool calls
- **✅ Memory Visibility**: Dashboard shows which agents are connected and what memory they retain
- **✅ PII Guardrails**: Instant flagging of sensitive data (SSN, credit card, PHI) before it leaves the system

## 🛠️ Tech Stack

- **Frontend:** Next.js 15, TypeScript, React 18, Tailwind CSS
- **Backend:** Next.js API routes, Prisma ORM
- **AI/ML:** OpenAI GPT-4, Anthropic Claude, Google Gemini
- **Database:** PostgreSQL with Prisma
- **Authentication:** NextAuth.js with Google OAuth
- **Infrastructure:** Vercel, Docker
- **Package Manager:** pnpm with Turborepo

## 🚀 Development

### Available Scripts

```bash
# Start all applications
pnpm run dev:all

# Start individual applications
pnpm run dev:landing    # http://localhost:3000
pnpm run dev:platform   # http://localhost:3002
pnpm run dev:docs       # http://localhost:3001

# Build all applications
pnpm run build

# Lint all packages
pnpm run lint

# Type check all packages
pnpm run check-types
```

### Project Structure

```
governs-ai/
├── apps/                    # Applications
│   ├── platform/            # Main Platform App (Port 3002)
├── packages/                # Shared Packages
│   ├── ui/                  # UI Components
│   ├── layout/              # Layout Components
│   ├── db/                  # Database Schema & Queries
│   ├── billing/             # Billing & Usage Tracking
│   ├── common-utils/        # Shared Utilities
│   ├── typescript-config/   # TypeScript Configuration
│   └── eslint-config/       # ESLint Configuration
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

## 🤝 Contributing

We welcome contributions! Please see our `CONTRIBUTING.md` file for guidelines on how to get involved.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`pnpm run lint && pnpm run check-types`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## 🙏 Acknowledgments

- Built with Next.js and the amazing open source community
- AI powered by OpenAI, Anthropic, and Google
- UI components from shadcn/ui
- Icons from Lucide React

## 🌟 The Long-Term Vision

GovernsAI will start as a simple cost and security tool for developers. Over time, it will evolve into the essential governance layer for enterprise AI, expanding to include complex policy enforcement, role-based access control, and a trusted marketplace for third-party AI agents. It will become the single source of truth for how an organization interacts with artificial intelligence.

**GovernsAI is the AI Governance OS** — a unified identity, policy, and compliance layer that keeps AI interactions secure, auditable, and under control.