FROM node:20-slim AS base

RUN npm install -g pnpm@10.12.4
WORKDIR /app

# Copy workspace manifests only (for layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/websocket-service/package.json ./apps/websocket-service/

# Install all workspace deps
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/db/ ./packages/db/
COPY apps/websocket-service/ ./apps/websocket-service/

# Generate Prisma client
RUN pnpm --filter @governs-ai/db generate

WORKDIR /app/apps/websocket-service

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Use node directly — env vars come from Render, not a .env file
CMD ["node", "src/server.js"]
