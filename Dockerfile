# GovernsAI Dashboard Monorepo Dockerfile
# Builds both the Platform (Next.js) and WebSocket Service (Node.js)

FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm@10.12.4

# ==========================================
# Dependencies Stage
# ==========================================
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/platform/package.json ./apps/platform/
COPY apps/websocket-service/package.json ./apps/websocket-service/
COPY packages/common-utils/package.json ./packages/common-utils/
COPY packages/db/package.json ./packages/db/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/layout/package.json ./packages/layout/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/ui/package.json ./packages/ui/

# Copy Prisma schema file (needed for postinstall script)
COPY packages/db/schema.prisma ./packages/db/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ==========================================
# Builder Stage
# ==========================================
FROM base AS builder
WORKDIR /app

# Copy everything from deps stage (includes node_modules and initial Prisma generation)
COPY --from=deps /app ./

# Copy all source files (this will overwrite with actual source code)
COPY . .

# Generate Prisma client
RUN pnpm run generate

# Build the monorepo
RUN pnpm run build

# ==========================================
# Platform Runner Stage - Using Debian for Prisma compatibility
# ==========================================
FROM node:20-slim AS platform-runner
WORKDIR /app

ENV NODE_ENV=production

# Install runtime dependencies
# - wget: for health checks
# - openssl: required for Prisma engine
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Copy built platform app (standalone includes all necessary node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/apps/platform/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/platform/.next/static ./apps/platform/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/platform/public ./apps/platform/public

# Copy workspace db package (contains Prisma client exports and generated files)
COPY --from=builder --chown=nextjs:nodejs /app/packages/db ./packages/db

USER nextjs

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/api/health || exit 1

CMD ["node", "apps/platform/server.js"]

# ==========================================
# WebSocket Runner Stage - Using Debian for Prisma compatibility
# ==========================================
FROM node:20-slim AS websocket-runner
WORKDIR /app

ENV NODE_ENV=production

# Install runtime dependencies
# - wget: for health checks
# - openssl: required for Prisma engine
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nodejs-user

# Copy dependencies and source for websocket service
COPY --from=builder --chown=nodejs-user:nodejs /app/apps/websocket-service ./apps/websocket-service
COPY --from=builder --chown=nodejs-user:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs-user:nodejs /app/packages/db ./packages/db

USER nodejs-user

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3003/health || exit 1

CMD ["node", "apps/websocket-service/src/server.js"]
