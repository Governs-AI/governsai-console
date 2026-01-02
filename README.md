# 🛡️ GovernsAI Console — The AI Governance OS

[![License](https://img.shields.io/badge/license-ELv2-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)

**🚀 Production-Ready** | Integrated with [REFRAG](https://github.com/Shaivpidadi/refrag) | Multi-Provider Support

---

## 🎯 What is GovernsAI?

The AI Governance OS — a unified control plane for AI interactions across your entire organization.

**Stop rebuilding authentication, memory, and cost tracking for every AI project.** GovernsAI provides:

- 🔐 **Single sign-on for AI apps** — "Login with GovernsAI" OAuth/OIDC provider
- 💰 **Real-time budget enforcement** — Control spending across all AI providers
- 🧠 **Context Memory** — Unified semantic search with REFRAG optimization
- 🔍 **Automatic PII detection** — Compliance checks before data hits AI models
- 📊 **Complete audit trail** — Every AI interaction logged and searchable
- 🌐 **AI-agnostic** — Works with OpenAI, Anthropic, Google, or any provider

**Production-ready. Battle-tested. Open source.**

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🔐 **Login with GovernsAI** | OAuth/OIDC provider via Keycloak - external apps use GovernsAI as SSO |
| 💰 **Budget Control** | Real-time spending limits with automatic request blocking |
| 🧠 **Context Memory** | Semantic search across all conversations with [REFRAG](https://github.com/Shaivpidadi/refrag) chunk-based optimization |
| 🔍 **PII Detection** | Automatic compliance checks via Precheck API integration |
| 🌐 **AI Agnostic** | OpenAI, Anthropic, Google, Ollama, or any provider |
| 📊 **Complete Audit** | Every request logged with tokens, cost, and latency |
| ⚡ **Real-time Updates** | WebSocket-based live notifications and monitoring |
| 🏢 **Multi-tenant** | Organization and role management built-in |
| 🔑 **Passkey Auth** | WebAuthn/FIDO2 for phishing-resistant authentication |
| 🛠️ **Tool Registry** | Agent marketplace with policy-based access control |

---

## 🚀 The Problem We Solve

AI adoption in businesses is chaotic:

- ❌ Developers use multiple AI services with different API keys
- ❌ Spending is unpredictable and often spirals out of control
- ❌ No central way to enforce security policies or audit data flow
- ❌ Every project rebuilds authentication, memory, and cost tracking
- ❌ Compliance risks when sensitive data hits third-party models

**GovernsAI fixes this with a single, secure gateway.**

---

## ⚡ Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL 11+ with pgvector extension
- OpenAI API key (or other AI provider keys)

### Installation

```bash
# 1. Clone and install
git clone https://github.com/Shaivpidadi/governsai-console.git
cd governsai-console
pnpm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your database URL and AI provider keys

# 3. Initialize database
pnpm run generate
pnpm --filter @governs-ai/db run migrate:dev

# 4. Start all services
pnpm run dev:all

# Platform Dashboard: http://localhost:3002
# WebSocket Service: http://localhost:3003
```

**Need help?** Check [docs/setup-guide.md](docs/setup-guide.md) or [open an issue](https://github.com/Shaivpidadi/governsai-console/issues).

---

## 🏗️ Architecture Overview

```
User/App → Keycloak SSO → Platform Dashboard → WebSocket Gateway → AI Providers
                              ↓                      ↓
                         Budget/Policy          Real-time Logs
                              ↓                      ↓
                        PostgreSQL + pgvector (Memory & Audit)
                              ↓
                        Precheck API (PII Detection)
```

**Core Components:**

- **Platform Dashboard** — Next.js 15 admin interface for configuration and monitoring
- **WebSocket Gateway** — Real-time proxy with budget enforcement and policy checks
- **Keycloak SSO** — OAuth/OIDC identity provider ("Login with GovernsAI")
- **Context Memory** — Semantic search with pgvector + [REFRAG](https://github.com/Shaivpidadi/refrag) optimization
- **Precheck API** — Standalone PII detection service

**[View Full Architecture Diagram →](docs/architecture.md)**

---

## 🛠️ Tech Stack

**Frontend**
- Next.js 15 (App Router) + TypeScript 5.8
- React 18 + Tailwind CSS
- shadcn/ui components + Lucide icons

**Backend**
- Next.js API Routes
- Node.js + Express (WebSocket service)
- Prisma ORM + PostgreSQL 11+ with pgvector

**Authentication**
- Keycloak OAuth/OIDC provider
- WebAuthn/Passkey (FIDO2)
- JWT-based sessions
- Argon2id password hashing

**AI & Embeddings**
- OpenAI (GPT-4, embeddings)
- Anthropic Claude
- Google Gemini
- Ollama (local)
- Hugging Face + Cohere

**Real-time**
- WebSocket (ws library)
- Server-Sent Events

**Infrastructure**
- pnpm + Turborepo monorepo
- Docker support
- Vercel-ready deployment

---

## 📁 Project Structure

```
governsai-console/
├── apps/
│   ├── platform/                 # Platform Dashboard (Next.js 15)
│   │   ├── app/                  # App router pages & API routes
│   │   ├── components/           # React components
│   │   └── lib/                  # Services and utilities
│   └── websocket-service/        # Real-time WebSocket Gateway
│       ├── src/
│       │   ├── server.js         # Express server
│       │   ├── websocket/        # WebSocket handlers
│       │   └── services/         # Auth & business logic
│       └── package.json
├── packages/
│   ├── db/                       # Prisma schema & migrations
│   ├── ui/                       # Shared UI components
│   ├── layout/                   # Layout components
│   ├── billing/                  # Billing utilities
│   └── common-utils/             # Shared utilities
├── docs/                         # Documentation
│   ├── environment-variables.md
│   ├── unified-context-memory.md
│   └── keycloak-integration.md
└── SECURITY.md                   # Security policy
```

---

## ⚙️ Essential Environment Variables

### Core Services

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/governs_ai"

# Authentication
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# AI Providers
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_AI_API_KEY="..."

# Google OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

### Application URLs

```bash
# Development
NEXT_PUBLIC_PLATFORM_DEV_URL="http://localhost:3002"

# Production
NEXT_PUBLIC_PLATFORM_URL="https://app.governsai.com"
```

**See [docs/environment-variables.md](docs/environment-variables.md) for complete reference.**

---

## 🚀 Development

### Available Scripts

```bash
# Start all services
pnpm run dev:all

# Start individual services
pnpm run dev:platform        # Platform dashboard (port 3002)
# WebSocket runs separately (see apps/websocket-service)

# Build everything
pnpm run build

# Database operations
pnpm run generate                                   # Generate Prisma client
pnpm --filter @governs-ai/db run migrate:dev       # Run migrations

# Code quality
pnpm run lint                # Lint all packages
pnpm run check-types         # TypeScript checking
pnpm run format              # Format with Prettier

# Cleanup
pnpm run clean              # Remove build artifacts
```

---

## 🔒 Security

Security is our top priority. Key features:

- **No hardcoded secrets** — All sensitive data in environment variables
- **Passkey authentication** — WebAuthn/FIDO2 for phishing resistance
- **HMAC webhook verification** — Cryptographic signature validation
- **Timing-safe comparisons** — Protection against timing attacks
- **Argon2id hashing** — Industry-standard password security
- **JWT session management** — Secure token-based authentication
- **CORS whitelisting** — Controlled cross-origin access

**See [SECURITY.md](SECURITY.md) for:**
- Security best practices
- How to report vulnerabilities
- Production deployment checklist

---

## 🌟 Who's Using GovernsAI?

- **Production AI applications** requiring governance and compliance
- **Enterprise teams** managing multi-provider AI infrastructure
- **Developers** building secure, auditable AI agents
- **Organizations** needing unified AI authentication and memory

**[Add your project →](https://github.com/Shaivpidadi/governsai-console/issues/new?template=showcase.md)**

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Workflow

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/yourusername/governsai-console.git`
3. **Create** a feature branch: `git checkout -b feature/amazing-feature`
4. **Set up** environment: `cp .env.example .env` (fill in your keys)
5. **Install** dependencies: `pnpm install`
6. **Initialize** database: `pnpm run generate`
7. **Start** development: `pnpm run dev:all`
8. **Make** your changes
9. **Test** your code: `pnpm run lint && pnpm run check-types`
10. **Commit** changes: `git commit -m 'feat: add amazing feature'`
11. **Push** to fork: `git push origin feature/amazing-feature`
12. **Open** a Pull Request

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `refactor:` — Code refactoring
- `test:` — Test additions/changes
- `chore:` — Maintenance tasks
- `security:` — Security improvements

---

## 🗺️ Roadmap

### ✅ Current Release (v0.1.0)

**Core Infrastructure**
- Next.js 15 platform with TypeScript
- Real-time WebSocket service
- PostgreSQL with pgvector
- Turborepo monorepo

**Authentication & Security**
- "Login with GovernsAI" OAuth/OIDC provider (Keycloak)
- Passkey/WebAuthn authentication
- Organization context in JWT tokens
- API key generation and management

**AI Governance**
- Budget tracking and enforcement
- Decision logging and audit trail
- Policy management system
- PII detection (Precheck API)
- Real-time usage monitoring

**Memory System**
- Semantic search with vector embeddings
- Multi-provider support (OpenAI, Ollama, Hugging Face, Cohere)
- [REFRAG integration](https://github.com/Shaivpidadi/refrag) with chunk-based optimization
- Cross-agent memory sharing

### 🔜 Coming Soon

**Enhanced SSO/IDP**
- 🔄 Direct ChatGPT/Claude/Gemini integration for "Login with GovernsAI" (Just kidding)
- 🔄 Federated identity across AI platforms
- 🔄 Policy enforcement via token claims
- 🔄 Automatic governance application

**AI Proxy Gateway (Sidecar Mode)**
- 🔄 Per-user/org proxy endpoints
- 🔄 Transparent request interception
- 🔄 Provider failover and load balancing
- 🔄 Zero-trust AI access layer

**Enterprise Features**
- 🔄 Cost optimization recommendations
- 🔄 Compliance reporting (SOC2, GDPR, HIPAA)
- 🔄 Marketplace for governance plugins
- 🔄 Mobile app for monitoring
- 🔄 Advanced analytics and BI dashboards
- 🔄 Verified AI agent marketplace

---

## 📦 Deployment

### Vercel (Recommended)

1. Fork this repository
2. Connect to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy platform and websocket service as separate projects
5. Update routing with your domain URLs

### Docker

```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individual images
docker build -t governsai-console .
docker run -p 3002:3002 governsai-console
```

**[Full deployment guide →](docs/deployment.md)**

---

## 📄 License

GovernsAI uses an **open-core licensing model**:

**Open Source Components (MIT)**:
- **Precheck Service** - PII detection and policy evaluation
- **TypeScript SDK** - Client library for integration
- **Browser Extension** - Shadow AI protection
- **No restrictions** - Use, modify, host, or offer as a service

**Platform Console (ELv2 - Source-Available)**:
- Platform Dashboard licensed under **Elastic License 2.0 (ELv2)**
- **Full source code access** - Clone, modify, and self-host
- **Commercial use** - Run in production for your organization
- Cannot offer the console as a hosted/managed service to third parties


**[Read full license →](LICENSE)** | **[Learn more about ELv2 →](https://www.elastic.co/licensing/elastic-license)**

---

## 🙏 Acknowledgments

Built with love and powered by:

- [Next.js](https://nextjs.org/) - The React Framework
- [Keycloak](https://www.keycloak.org/) - Open source identity and access management
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [shadcn/ui](https://ui.shadcn.com/) - Beautifully designed components
- The amazing open source community

---

## 🌟 Vision

**GovernsAI is becoming the AI Governance OS** — the unified identity, policy, and compliance layer that keeps AI interactions secure, auditable, and under control.

Starting as a comprehensive governance platform for developers, GovernsAI is evolving into the essential control plane for enterprise AI:

- 🎯 **Single source of truth** for all AI interactions
- 🔐 **Zero-trust security** with policy enforcement at the gateway
- 🧠 **Intelligent memory** that follows users across all AI applications
- 📊 **Complete observability** with real-time monitoring and analytics
- 🏢 **Enterprise-ready** with compliance reporting and audit trails

**The future of AI is governed. Join us in building it.**

---

## 📞 Connect

- **Documentation:** [docs.governsai.com](https://docs.governsai.com) (coming soon)
- **Issues:** [GitHub Issues](https://github.com/Shaivpidadi/governsai-console/issues)
- **Discussions:** [GitHub Discussions](https://github.com/Shaivpidadi/governsai-console/discussions)
- **Email:** [security@governsai.com] (for security reports only)

---

<div align="center">

**⭐ Star this repo if you find it useful!**

**Built by [@Shaivpidadi](https://github.com/Shaivpidadi)** 

</div>
