# syntax=docker/dockerfile:1
# Build context: repository root (docker build -f backend/Dockerfile .)
FROM node:24-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Compile TypeScript with dev dependencies
FROM base AS build
COPY backend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY backend/ ./
RUN npm run db:generate && npm run build

# Production-only node_modules (+ generated Prisma client)
FROM base AS deps
COPY backend/package*.json ./
COPY backend/prisma ./prisma
RUN npm ci --omit=dev --no-audit --no-fund \
  && npx prisma generate \
  && npm cache clean --force

FROM base AS runtime
ENV NODE_ENV=production \
    PORT=4000 \
    NODE_OPTIONS=--max-old-space-size=320
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY backend/package.json backend/tsconfig.json ./
# prisma/ holds the schema + migrations (prisma migrate deploy) and the seed
# scripts; seed-advanced.ts imports from src/, so ship the sources too (small).
COPY backend/prisma ./prisma
COPY backend/src ./src
USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]
