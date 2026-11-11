# syntax=docker/dockerfile:1
# Build context: repository root (docker build -f frontend/Dockerfile .)
FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
# The browser always calls same-origin /api/*; Next.js proxies it to API_URL.
# Rewrites are resolved at build time, so API_URL must be passed as a build arg.
ARG API_URL=http://api:4000
ENV API_URL=$API_URL
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_OPTIONS=--max-old-space-size=256
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
