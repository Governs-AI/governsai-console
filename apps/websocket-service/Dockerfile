FROM node:20-alpine

RUN npm install -g pnpm

WORKDIR /app

# Copy workspace manifests first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/websocket-service/package.json ./apps/websocket-service/

RUN pnpm install --frozen-lockfile --filter @governs-ai/websocket-service...

# Build db package
COPY packages/db ./packages/db
RUN pnpm --filter @governs-ai/db build

# Copy websocket service source
COPY apps/websocket-service ./apps/websocket-service

WORKDIR /app/apps/websocket-service

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "src/server.js"]
