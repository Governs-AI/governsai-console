# Environment Variables

This document lists all environment variables required for the GovernsAI platform and its services.

## Platform (apps/platform)

### Core Configuration

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/governs_db"

# NextAuth
NEXTAUTH_URL="http://localhost:3002"
NEXTAUTH_SECRET="your-nextauth-secret-here"

# Keycloak OAuth
KEYCLOAK_ID="governs-platform"
KEYCLOAK_SECRET="your-keycloak-secret"
KEYCLOAK_ISSUER="http://localhost:8080/realms/governs"
```

### Keycloak Admin

```bash
#
# Keycloak Admin (Dashboard → Keycloak user sync)
#
# The dashboard uses a Keycloak service account (client credentials) to create/update
# users and set org context attributes in Keycloak.
#
# See docs/keycloak-integration.md for the recommended production setup.
#
KEYCLOAK_BASE_URL="http://localhost:8080"
KEYCLOAK_REALM="governs-ai"
KEYCLOAK_ADMIN_CLIENT_ID="admin-sync-client"
KEYCLOAK_ADMIN_CLIENT_SECRET="your-admin-client-secret"

# Optional: enables durable retries for Keycloak *creation* flows by storing
# a short-lived encrypted copy of the signup password in the DB retry queue.
# Must be base64-encoded 32 bytes (AES-256 key).
KEYCLOAK_SYNC_PASSWORD_ENCRYPTION_KEY="base64-32-bytes"

# Optional: protects the Keycloak sync worker endpoint (cron).
KEYCLOAK_SYNC_WORKER_TOKEN="strong-random-token"

# Legacy / alternative settings (not used by current dashboard sync code):
# KEYCLOAK_ADMIN_URL="http://localhost:8080"
# KEYCLOAK_ADMIN_USERNAME="admin"
# KEYCLOAK_ADMIN_PASSWORD="admin"
# KEYCLOAK_ADMIN_CLIENT_ID="admin-cli"
# KEYCLOAK_REALM="governs"
```

### Webhook Configuration

```bash
# Shared with WebSocket service - must match exactly
WEBHOOK_SECRET="dev-secret-key-change-in-production"
```

### Email Configuration

```bash
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="noreply@governsai.com"
```

### Precheck Service

```bash
# For context memory PII detection
PRECHECK_API_KEY="your-precheck-api-key"
PRECHECK_URL="http://localhost:3001"
```

### Embedding Service Configuration

The platform supports multiple embedding providers. Configure ONE of the following:

#### Option 1: OpenAI (Default, Recommended for Production)

```bash
EMBEDDING_PROVIDER="openai"  # or omit this line
OPENAI_API_KEY="sk-..."
```

**Model**: `text-embedding-3-small` (1536 dimensions, ~$0.02 per 1M tokens)

#### Option 2: Ollama (Local Development)

```bash
EMBEDDING_PROVIDER="ollama"
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_EMBEDDING_MODEL="nomic-embed-text"  # or "mxbai-embed-large"
```

**Requirements**: Ollama installed locally with embedding model pulled

#### Option 3: Hugging Face

```bash
EMBEDDING_PROVIDER="huggingface"
HUGGINGFACE_API_KEY="hf_..."
HUGGINGFACE_EMBEDDING_MODEL="sentence-transformers/all-MiniLM-L6-v2"
```

#### Option 4: Cohere

```bash
EMBEDDING_PROVIDER="cohere"
COHERE_API_KEY="..."
```

### pgvector Configuration

```bash
# No environment variables needed - configured in DATABASE_URL
# Ensure PostgreSQL has pgvector extension installed:
# CREATE EXTENSION IF NOT EXISTS vector;
```

### Service URLs

```bash
WEBSOCKET_SERVICE_URL="http://localhost:3000"
```

### Feature Flags

```bash
ENABLE_CONTEXT_MEMORY=true
ENABLE_CROSS_AGENT_SEARCH=true
```

---

## WebSocket Service (apps/websocket-service)

### Core Configuration

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://username:password@localhost:5432/governs_db"
```

### Authentication

```bash
JWT_SECRET="your-super-secret-jwt-key-here"  # Must match Platform
```

### CORS

```bash
ALLOWED_ORIGINS="http://localhost:3002,https://governsai.com,https://your-domain.com"
```

### Service URLs

```bash
PLATFORM_URL="http://localhost:3002"
WEBSOCKET_URL="ws://localhost:3000/ws"
PLATFORM_WEBHOOK_URL="http://localhost:3002/api/governs/webhook"
```

### Webhook Configuration

```bash
# Must match Platform exactly
WEBHOOK_SECRET="dev-secret-key-change-in-production"
```

### Performance

```bash
MAX_CONNECTIONS=10000
MESSAGE_RATE_LIMIT=1000
HEARTBEAT_INTERVAL=30000
CONNECTION_TIMEOUT=60000
```

### Cache

```bash
CACHE_MAX_SIZE=10000
CACHE_EXPIRY_MS=1800000
```

### Security

```bash
API_RATE_LIMIT=100
ENABLE_RATE_LIMITING=true
ENABLE_CORS=true
ENABLE_HELMET=true
```

### Monitoring

```bash
ENABLE_METRICS=true
METRICS_PORT=9090
LOG_LEVEL="info"
LOG_FORMAT="json"
```

---

## Required for Context Memory Feature

To enable the unified context memory system, ensure these variables are set:

### Platform

1. ✅ `DATABASE_URL` - PostgreSQL with pgvector extension
2. ✅ `PRECHECK_API_KEY` - For PII detection
3. ✅ `PRECHECK_URL` - Precheck service endpoint
4. ✅ Embedding provider (one of):
   - `OPENAI_API_KEY` (recommended)
   - `OLLAMA_BASE_URL` + `OLLAMA_EMBEDDING_MODEL`
   - `HUGGINGFACE_API_KEY` + `HUGGINGFACE_EMBEDDING_MODEL`
   - `COHERE_API_KEY`
5. ✅ `WEBHOOK_SECRET` - For secure webhook communication

### WebSocket Service

1. ✅ `PLATFORM_WEBHOOK_URL` - Platform webhook endpoint
2. ✅ `WEBHOOK_SECRET` - Must match Platform's secret
3. ✅ `DATABASE_URL` - Same database as Platform

---

## Setup Checklist

### Initial Setup

- [ ] PostgreSQL installed and running
- [ ] pgvector extension enabled: `CREATE EXTENSION IF NOT EXISTS vector;`
- [ ] Run migrations: `pnpm db:migrate`
- [ ] Set `WEBHOOK_SECRET` to a secure random string (same in Platform and WebSocket)
- [ ] Choose and configure one embedding provider
- [ ] Configure Precheck service URL and API key

### Development

```bash
# Platform
cd apps/platform
cp .env.example .env  # Create from docs/environment-variables.md
pnpm dev

# WebSocket Service
cd apps/websocket-service
cp env.example .env
pnpm dev
```

### Production

- [ ] Use strong secrets for `WEBHOOK_SECRET`, `NEXTAUTH_SECRET`, `JWT_SECRET`
- [ ] Set `NODE_ENV=production`
- [ ] Use production database URLs
- [ ] Enable HTTPS for all service URLs
- [ ] Set restrictive CORS origins
- [ ] Configure production email provider
- [ ] Use production-grade embedding provider (OpenAI recommended)
- [ ] Enable monitoring and metrics

---

## Troubleshooting

### Context Save Not Working

1. Check `WEBHOOK_SECRET` matches in Platform and WebSocket
2. Verify `PLATFORM_WEBHOOK_URL` is correct and accessible
3. Check WebSocket service logs for keyword detection
4. Verify Platform webhook receives `context.save` events

### Embedding Errors

1. Verify embedding provider credentials are correct
2. Check `EMBEDDING_PROVIDER` matches your configured provider
3. For Ollama: ensure service is running and model is pulled
4. Test with OpenAI as fallback (most reliable)

### pgvector Issues

1. Verify extension is installed: `SELECT * FROM pg_extension WHERE extname = 'vector';`
2. Run migration manually if needed: `pnpm db:migrate`
3. Check PostgreSQL version >= 11 (pgvector requirement)

### Webhook Signature Failures

1. Ensure `WEBHOOK_SECRET` is identical in both services
2. Check system clocks are synchronized (timestamp validation)
3. Verify no middleware is modifying request body

