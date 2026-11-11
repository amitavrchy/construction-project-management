# EC2 deployment (Sitecraft)

Every push to `main` (or a manual *Run workflow*) runs `.github/workflows/deploy.yml`:

1. Builds `backend/Dockerfile` and `frontend/Dockerfile` (context = repo root) with Buildx + GHA cache and
   pushes `ghcr.io/amitavrchy/sitecraft-backend` and `ghcr.io/amitavrchy/sitecraft-frontend`
   tagged `latest` and the commit SHA.
2. SSHes to the server (`EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY` secrets), copies
   `deploy/docker-compose.prod.yml` to `/opt/apps/sitecraft/docker-compose.yml`, logs in to GHCR with the
   workflow token, pulls, runs `npx prisma migrate deploy` in a one-off backend container,
   `docker compose up -d`, then `docker image prune -f`.

| Service  | Container            | Host port        | Public URL                                    |
|----------|----------------------|------------------|-----------------------------------------------|
| frontend | `sitecraft-frontend` | `127.0.0.1:3001` | https://sitecraft.13.203.3.1.sslip.io          |
| backend  | `sitecraft-backend`  | `127.0.0.1:4001` | https://api.sitecraft.13.203.3.1.sslip.io/api  |

The browser only talks to the frontend origin: `/api/*` is proxied by Next.js to
`http://sitecraft-backend:4000` over the `apps-net` Docker network (`API_URL` build arg).

## One-time server setup

```bash
sudo mkdir -p /opt/apps/sitecraft && sudo chown ubuntu:ubuntu /opt/apps/sitecraft
cp .env.example /opt/apps/sitecraft/.env   # fill in values, then: chmod 600 /opt/apps/sitecraft/.env
```

The `shared-postgres` container must have a `sitecraft` role and database, and the `apps-net` network must exist.

## Seeding the first users (once)

```bash
cd /opt/apps/sitecraft
docker compose run --rm -e SEED_PASSWORD='<at least 12 chars>' backend npx tsx prisma/seed.ts
# optional demo project data:
docker compose run --rm backend npx tsx prisma/seed-advanced.ts
```

The seed is idempotent (it skips when the company already exists). Login: `admin@sitecraft.local`.
