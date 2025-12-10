# GovernsAI Dashboard Monorepo Dockerfile
# Builds both the Platform (Next.js) and WebSocket Service (Node.js)

# CHANGED: Use slim (Debian) for base to match runner
FROM node:20-slim AS base

# Install pnpm & OpenSSL (needed for Prisma/Argon2 during install)
RUN apt-get update && apt-get install -y openssl ca-certificates python3 make g++ && rm -rf /var/lib/apt/lists/*
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

# Copy Prisma schema file
COPY packages/db/schema.prisma ./packages/db/

# Install dependencies (now builds for Debian/glibc)
RUN pnpm install --frozen-lockfile
# Explicitly rebuild argon2 to be safe
RUN pnpm rebuild argon2

# ==========================================
# Builder Stage
# ==========================================
FROM base AS builder
WORKDIR /app

# Copy everything from deps stage
COPY --from=deps /app ./

# Copy all source files
COPY . .

RUN pnpm rebuild argon2

# Generate Prisma client
RUN pnpm run generate

# Build the monorepo
RUN pnpm run build

# ==========================================
# Platform Runner Stage
# ==========================================
FROM node:20-slim AS platform-runner
WORKDIR /app

ENV NODE_ENV=production

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Copy built platform app
COPY --from=builder --chown=nextjs:nodejs /app/apps/platform/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/platform/.next/static ./apps/platform/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/platform/public ./apps/platform/public

# Copy workspace db package
COPY --from=builder --chown=nextjs:nodejs /app/packages/db ./packages/db

USER nextjs

EXPOSE 3002

# We removed healthcheck temporarily to debug, add back later if needed
# HEALTHCHECK ...

CMD ["node", "apps/platform/server.js"]

# ==========================================
# WebSocket Runner Stage
# ==========================================
FROM node:20-slim AS websocket-runner
WORKDIR /app

ENV NODE_ENV=production

# Install runtime dependencies
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

# HEALTHCHECK ...

CMD ["node", "apps/websocket-service/src/server.js"]