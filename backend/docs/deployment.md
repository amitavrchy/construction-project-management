# Deployment

The frontend and backend are independent npm applications. There is no root package manifest or workspace installation. Use Node.js 24, PostgreSQL 17 and Redis 7.

## Node services

From the repository root:

```text
npm ci --prefix backend
npm ci --prefix frontend
npm run db:generate --prefix backend
npm run db:migrate --prefix backend
npm run build --prefix backend
npm run build --prefix frontend
npm run start --prefix backend
npm run start --prefix frontend
```

Run the last two commands as separate supervised services. Configure `backend/.env` from `backend/.env.example` or supply environment variables. The frontend uses `API_URL` at build time for the internal API proxy. Set HTTPS public `APP_URL`, matching `CORS_ORIGINS`, a strong JWT secret and database credentials. Production API cookies require HTTPS. Put a reverse proxy in front of the web server; do not expose PostgreSQL/Redis publicly.

## Containers

Both Dockerfiles use the repository root as build context. Dockerfile-specific ignore files exclude environment secrets, dependencies and build output.

```text
docker build -f backend/Dockerfile -t sitecraft-api .
docker build -f frontend/Dockerfile -t sitecraft-web .
```

For Compose, set `POSTGRES_PASSWORD`, `JWT_SECRET` and `APP_URL` in backend/.env or the process environment, then run:

```text
docker compose -f backend/compose.yaml -f backend/compose.production.yaml build
docker compose -f backend/compose.yaml -f backend/compose.production.yaml up -d postgres redis
docker compose -f backend/compose.yaml -f backend/compose.production.yaml run --rm api npm run db:migrate
docker compose -f backend/compose.yaml -f backend/compose.production.yaml up -d api web
```

The explicit Compose project name preserves the existing local PostgreSQL/Redis volumes after the folder move. Changing an environment password does not rotate an existing PostgreSQL role password. Run migrations before new application code. Test PostgreSQL backups/restores; file bodies currently live in the database too.

Run `npm run verify --prefix backend`, both package audits and `npm run test:e2e --prefix frontend` before release. The GitHub Actions template lives under backend/ci; it cannot run automatically while the root is limited to frontend/backend. Provider credentials for email, SMS, object storage or bank settlement are not configured. Production installations should add shared login rate limits, restricted database roles and object storage according to their scale and requirements.
