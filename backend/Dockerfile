FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && apt-get clean
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run db:generate && npm run build
FROM node:24-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && apt-get clean
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 4000
CMD ["node","dist/main.js"]
