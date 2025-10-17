# GovernsAI Platform - Project Specifications

## 🎯 Project Overview

The GovernsAI Platform is a comprehensive AI governance and control system that provides centralized management for AI interactions, usage tracking, budget control, policy management, and audit logging. It serves as the main dashboard and control plane for organizations to monitor, control, and govern their AI usage.

## 🏗️ Architecture

### Technology Stack
- **Framework**: Next.js 15.4.7 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5 (beta)
- **State Management**: React Context + Zustand
- **Charts**: Recharts
- **Icons**: Lucide React

### Project Structure
```
apps/platform/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── agents/        # AI agent management
│   │   ├── auth/          # Authentication endpoints
│   │   ├── budget/        # Budget management
│   │   ├── decisions/     # Decision tracking
│   │   ├── governs/       # GovernsAI webhooks
│   │   ├── mfa/           # Multi-factor authentication
│   │   ├── orgs/          # Organization management
│   │   ├── passkeys/      # Passkey authentication
│   │   ├── policies/      # Policy management
│   │   ├── profile/       # User profile
│   │   ├── purchases/     # Purchase tracking
│   │   ├── spend/         # Spending analytics
│   │   ├── toolcalls/     # Tool call tracking
│   │   ├── tools/         # Tool management
│   │   ├── usage/         # Usage tracking
│   │   └── v1/            # API v1 endpoints
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard
│   ├── o/[slug]/          # Organization pages
│   ├── onboarding/        # User onboarding
│   └── profile/           # User profile pages
├── components/            # React components
│   ├── ui/               # Base UI components
│   └── ...               # Feature-specific components
├── lib/                  # Utility functions and configs
└── public/               # Static assets
```

## 🚀 Core Features

### 1. AI Governance Dashboard
- **Centralized AI Management**: Unified interface for all AI interactions
- **Real-time Monitoring**: Live updates on AI usage and decisions
- **Multi-tenant Support**: Organization-based access control
- **Responsive Design**: Optimized for all devices

### 2. Usage Tracking & Analytics
- **Token-based Tracking**: Monitor input/output tokens across AI providers
- **Cost Calculation**: Real-time cost tracking with provider-specific pricing
- **Usage Analytics**: Detailed reports and visualizations
- **Historical Data**: Long-term usage trends and patterns

### 3. Budget Control & Management
- **Spending Limits**: Set and enforce budget constraints
- **Real-time Alerts**: Notifications when approaching limits
- **Budget Analytics**: Detailed spending breakdowns
- **Multi-currency Support**: Handle different currencies

### 4. Policy Management
- **Policy Definition**: Create and manage AI usage policies
- **Rule Engine**: Flexible policy enforcement rules
- **Policy Templates**: Pre-built policy templates
- **Compliance Tracking**: Monitor policy adherence

### 5. Audit & Compliance
- **Complete Audit Trail**: Track all AI interactions
- **Decision Logging**: Record all governance decisions
- **Compliance Reports**: Generate compliance documentation
- **Data Retention**: Configurable data retention policies

### 6. API Key Management
- **Secure Key Generation**: Generate and manage API keys
- **Scope-based Access**: Fine-grained permission control
- **Key Rotation**: Automated key rotation capabilities
- **Usage Tracking**: Monitor API key usage

### 7. Organization Management
- **Multi-tenant Architecture**: Support for multiple organizations
- **User Management**: Add/remove users from organizations
- **Role-based Access**: Granular permission system
- **Organization Settings**: Customizable organization preferences

## 🔌 API Endpoints

### Authentication & Authorization
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/forgot-password` - Password reset
- `POST /api/auth/reset-password` - Password reset confirmation
- `POST /api/auth/verify-email` - Email verification
- `POST /api/mfa/enable` - Enable MFA
- `POST /api/mfa/verify` - Verify MFA
- `POST /api/passkeys/register` - Register passkey
- `POST /api/passkeys/authenticate` - Authenticate with passkey

### Usage & Analytics
- `POST /api/usage` - Record usage data
- `GET /api/usage` - Retrieve usage analytics
- `GET /api/usage/summary` - Usage summary
- `GET /api/usage/trends` - Usage trends

### Budget Management
- `GET /api/budget/context` - Get budget context
- `POST /api/budget` - Create/update budget
- `GET /api/budget` - Retrieve budget information
- `GET /api/budget/alerts` - Budget alerts

### Policy Management
- `GET /api/policies` - List policies
- `POST /api/policies` - Create policy
- `PUT /api/policies/[id]` - Update policy
- `DELETE /api/policies/[id]` - Delete policy
- `GET /api/v1/policies` - API v1 policies

### Tool Management
- `GET /api/tools` - List available tools
- `POST /api/tools` - Create/update tool configuration
- `GET /api/tools/[id]` - Get tool details
- `DELETE /api/tools/[id]` - Delete tool

### Organization Management
- `GET /api/v1/orgs` - List organizations
- `POST /api/v1/orgs` - Create organization
- `GET /api/v1/orgs/[orgId]` - Get organization details
- `PUT /api/v1/orgs/[orgId]` - Update organization
- `GET /api/v1/orgs/[orgId]/api-keys` - List API keys
- `POST /api/v1/orgs/[orgId]/api-keys` - Create API key

### Decision Tracking
- `GET /api/decisions` - List decisions
- `GET /api/decisions/[id]` - Get decision details
- `POST /api/decisions` - Create decision

### Purchase Tracking
- `POST /api/purchases` - Record purchase
- `GET /api/purchases` - List purchases
- `GET /api/purchases/summary` - Purchase summary

### API v1 Endpoints
- `GET /api/v1/keys` - List API keys
- `POST /api/v1/keys` - Create API key
- `GET /api/v1/precheck` - Precheck decision
- `GET /api/v1/policies` - List policies
- `POST /api/v1/policies` - Create policy
- `GET /api/v1/passkey/list` - List passkeys

### Context Memory (Unified Context) – New
- `POST /api/v1/context` – Store context (explicit client save path)
- `POST /api/v1/context/search` – **Platform-only**: Full semantic search with stats (pgvector)
- `POST /api/v1/context/search/llm` – **SDK-accessible**: LLM-optimized compressed search
- `GET /api/v1/context/conversation` – Get conversation items
- `POST /api/v1/context/conversation` – Get or create conversation
- `POST /api/governs/webhook` – Receives signed events; now handles `context.save`

**Context Search Pipeline Features:**
- **Scoring**: Recency (30-day decay) + similarity (0.7/0.3 weights)
- **Deduplication**: Content similarity threshold (0.93)
- **Tiering**: High (0.75+), Medium (0.60-0.75), Low (0.50-0.60)
- **Compression**: Token-budgeted natural language for LLM consumption
- **Overquery**: 3x multiplier for better recall

## 🔐 Security Features

### Authentication
- **Multi-factor Authentication (MFA)**: TOTP-based MFA support
- **Passkey Authentication**: WebAuthn/FIDO2 support
- **Session Management**: Secure session handling
- **JWT Tokens**: Stateless authentication

### Authorization
- **Role-based Access Control (RBAC)**: Granular permission system
- **API Key Management**: Secure API key generation and management
- **Scope-based Access**: Fine-grained permission control
- **Organization Isolation**: Multi-tenant security

### Webhook Security (Context Save)
- **Signed Webhooks**: `x-governs-signature` header `v1,t=TIMESTAMP,s=HMAC_SHA256_HEX`
- **Shared Secret**: `WEBHOOK_SECRET` (must match WebSocket service)
- **Idempotency**: `correlationId` used to deduplicate `context.save`

### Data Protection
- **Encryption**: Data encryption at rest and in transit
- **Audit Logging**: Comprehensive audit trail
- **Data Retention**: Configurable data retention policies
- **Privacy Controls**: User privacy settings

## 📊 Database Schema

### Core Entities
- **Users**: User accounts and profiles
- **Organizations**: Multi-tenant organizations
- **API Keys**: API key management
- **Usage Records**: AI usage tracking
- **Budget Records**: Budget and spending data
- **Policy Records**: Policy definitions
- **Decision Records**: Governance decisions
- **Context Memory**: `ContextMemory`, `Conversation`, `Document`, `DocumentChunk`, `ContextAccessLog` (pgvector-backed embeddings)
- **Audit Logs**: Audit trail
- **Purchase Records**: Purchase tracking

### Relationships
- Users belong to Organizations (many-to-many)
- API Keys belong to Users and Organizations
- Usage Records belong to Users and Organizations
- Budget Records belong to Organizations
- Policy Records belong to Organizations
- Decision Records belong to Users and Organizations
- Context records belong to Users and Organizations; Conversations relate to ContextMemory

## 🚀 Deployment

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
EMBEDDING_PROVIDER="openai|ollama|huggingface|cohere"
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_EMBEDDING_MODEL="nomic-embed-text"
HUGGINGFACE_API_KEY="hf_..."
HUGGINGFACE_EMBEDDING_MODEL="sentence-transformers/all-MiniLM-L6-v2"
COHERE_API_KEY="..."

# Platform URLs
NEXT_PUBLIC_PLATFORM_URL="http://localhost:3002"
# Webhook & WebSocket
WEBHOOK_SECRET="change-me"               # Platform (must match WS)
PLATFORM_WEBHOOK_URL="http://localhost:3002/api/governs/webhook"  # WS side
NEXT_PUBLIC_DOCS_URL="http://localhost:3001"
NEXT_PUBLIC_LANDING_URL="http://localhost:3000"
```

### Build & Deployment
- **Development**: `pnpm run dev` (port 3002)
- **Production**: `pnpm run build && pnpm run start`
- **Docker**: Containerized deployment support
- **Vercel**: Optimized for Vercel deployment

## 📈 Performance & Scalability

### Performance Optimizations
- **Server-side Rendering (SSR)**: Next.js App Router
- **Static Generation**: Pre-built static pages
- **Image Optimization**: Next.js image optimization
- **Code Splitting**: Automatic code splitting
- **Caching**: Strategic caching strategies

### Scalability Features
- **Database Connection Pooling**: Efficient database connections
- **API Rate Limiting**: Prevent abuse
- **Caching Layers**: Redis/memory caching
- **CDN Integration**: Global content delivery
- **Load Balancing**: Horizontal scaling support

## 🔧 Development

### Available Scripts
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

### Development Guidelines
- **TypeScript**: Strict type checking
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **Testing**: Unit and integration tests
- **Documentation**: Comprehensive documentation

## 🔗 Integration Points

### External Services
- **AI Providers**: OpenAI, Anthropic, etc.
- **Email Service**: Resend for email notifications
- **Authentication**: Keycloak integration
- **Database**: PostgreSQL with Prisma
- **WebSocket Service**: Real-time communication

### Internal Packages
- `@governs-ai/common-utils` - Shared utilities
- `@governs-ai/db` - Database schema and queries
- `@governs-ai/layout` - Layout components
- `@governs-ai/ui` - UI components

## 📝 Future Enhancements

### Planned Features
- **Advanced Analytics**: Machine learning insights
- **Custom Dashboards**: User-configurable dashboards
- **API Rate Limiting**: Advanced rate limiting
- **Webhook Support**: External webhook integration
- **Mobile App**: Native mobile application
- **Advanced Reporting**: Custom report generation

### Technical Improvements
- **Microservices**: Service decomposition
- **Event Sourcing**: Event-driven architecture
- **CQRS**: Command Query Responsibility Segregation
- **GraphQL**: GraphQL API layer
- **Real-time Updates**: WebSocket integration

## 🎯 Success Metrics

### Key Performance Indicators (KPIs)
- **User Adoption**: Active users and organizations
- **Usage Tracking**: AI usage volume and costs
- **Policy Compliance**: Policy adherence rates
- **System Performance**: Response times and uptime
- **User Satisfaction**: User feedback and ratings

### Monitoring & Alerting
- **Application Performance**: Response times and error rates
- **Database Performance**: Query performance and connections
- **User Activity**: Usage patterns and trends
- **Security Events**: Authentication and authorization events
- **Business Metrics**: Revenue and cost tracking

---

*This specification document provides a comprehensive overview of the GovernsAI Platform project, including its architecture, features, API endpoints, security measures, and development guidelines.*
