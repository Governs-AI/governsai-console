FROM node:20-slim AS base

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@10.12.4

WORKDIR /app

# Copy workspace manifests for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/websocket-service/package.json ./apps/websocket-service/

# Copy schema BEFORE install so postinstall prisma generate can find it
COPY packages/db/schema.prisma ./packages/db/schema.prisma

# Install workspace deps (postinstall runs prisma generate here)
RUN pnpm install --frozen-lockfile

# Copy remaining source
COPY packages/db/ ./packages/db/
COPY apps/websocket-service/ ./apps/websocket-service/

# Build @governs-ai/db: prisma generate + tsc → dist/index.js
RUN pnpm --filter @governs-ai/db build

WORKDIR /app/apps/websocket-service

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "src/server.js"]
