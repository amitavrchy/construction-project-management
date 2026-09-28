# Deployment

Use Node.js 24, PostgreSQL 17 and Redis 7. Configure values from `.env.example`, strong secrets and an HTTPS public `APP_URL`. Set `CORS_ORIGINS` to the browser origin. Set `API_URL` before the frontend build if its internal API address differs from localhost:4000.

```text
npm ci
npm run db:generate
npm run db:migrate
npm run build
npm run start -w backend
npm run start -w frontend
```

Run the last two commands as separate supervised services. Put an HTTPS reverse proxy in front of port 3000. Production Secure cookies intentionally do not work over plain HTTP. Do not expose databases publicly. Back up PostgreSQL and test restores.

Seeding is for initial evaluation, not upgrades. If using seeded accounts, change every initial password and remove unnecessary evaluation users. Keep `.env` outside version control and Docker build contexts. Omit `REDIS_URL` only when intentionally disabling scheduled work.

## Docker

The Dockerfile provides `api` and `web` targets; the web build embeds its internal API rewrite URL.

```text
docker compose -f compose.yaml -f compose.production.yaml build
docker compose -f compose.yaml -f compose.production.yaml up -d postgres redis
docker compose -f compose.yaml -f compose.production.yaml run --rm api npm run db:migrate
docker compose -f compose.yaml -f compose.production.yaml up -d api web
```

Set `POSTGRES_PASSWORD`, `JWT_SECRET` and `APP_URL` first. Changing a password environment variable on an existing PostgreSQL volume does not rotate the actual database password. The API stays on the internal network; web binds localhost:3000 for an HTTPS proxy. Migrate before starting new code.

Run type checking, integration tests, builds, audit and browser checks for each release. Verify thresholds, OT multiplier, PM→Accounts approval, uploads, downloads and the Dhaka job schedule. Documents/photos currently live in PostgreSQL, so database backups include files. Larger installations should use signed object-storage uploads and malware scanning. Email/SMS and bank payment providers are not connected.
