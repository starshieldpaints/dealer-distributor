ARG NODE_VERSION=20.17.0

FROM node:${NODE_VERSION}-slim AS base
ENV NODE_ENV=production
WORKDIR /app

FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json tsconfig.json ./
COPY migrations ./migrations
COPY scripts ./scripts
RUN npm ci

FROM deps AS builder
COPY src ./src
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/migrations ./migrations
COPY --from=deps /app/scripts ./scripts
EXPOSE 4000
CMD ["node", "dist/server.js"]
