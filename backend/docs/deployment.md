# Sitecraft deployment runbook

The separately authorized disposable one-container Free target is documented in [FREE-PREVIEW.md](../FREE-PREVIEW.md). This guide still describes the preserved external-store production target.

Prepared locally on 2026-11-09. No hosting resources or public deployments were created. Render workspace **Heyhoo** is approved; actual service plans, regions, persistent PostgreSQL/Redis and credentials still require explicit approval. Prior hosting URLs do not establish account ownership.

## Required topology

Use an always-on Docker backend on Render, persistent PostgreSQL, persistent Redis with a no-eviction policy, and the Next.js frontend on Netlify. The API runs BullMQ scheduled operations; a sleeping free web service cannot guarantee the daily Asia/Dhaka digest or monthly payroll-draft schedule. PostgreSQL contains business records, file bodies, ledger and stock data. Redis contains scheduled work and shared login protection. Neither belongs in the ephemeral API filesystem.

Obtain approval of the exact provider/region/instance plans, database storage and backups, Redis persistence, total monthly charge and trial expiries before provisioning either project. No billing may be enabled implicitly. [Render free PostgreSQL expires after 30 days](https://render.com/docs/free); it is not permanent production storage. A database/Redis pair for either project has not been verified as reusable.

## Environment-variable names

| Purpose | Names |
| --- | --- |
| Required backend | `NODE_ENV`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `APP_URL`, `CORS_ORIGINS` |
| HTTP | `PORT` |
| Financial policy | `VARIANCE_ALERT_BPS`, `OT_MULTIPLIER_BPS`, `REQUISITION_APPROVAL_LIMIT_MINOR`, `BILL_APPROVAL_LIMIT_MINOR` |
| Startup safeguards, normally disabled | `RUN_MIGRATIONS`, `SEED_ON_START`, `ALLOW_PRODUCTION_SEED` |
| Explicit synthetic fixture setup | `SEED_PASSWORD` |
| Real administrator bootstrap, one-off only | `BOOTSTRAP_COMPANY_NAME`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` |
| Netlify server-only build destination | `API_URL` |
| Optional isolated jobs verification | `TEST_JOBS_DATABASE_URL`, `TEST_JOBS_REDIS_URL` |

Store values in provider secret settings. Never commit them or place backend credentials in frontend variables/build arguments. Use production mode, exact HTTPS browser origins, a strong independent JWT signing secret, TLS external database/Redis connections and restricted database permissions. Production startup rejects missing Redis, unsafe origins and weak/placeholder signing secrets. Keep seed startup disabled. Back up the database before applying migrations; the session-version migration invalidates pre-existing unversioned JWT sessions.

## Ordered deployment procedure

1. Review the working branch, verification report and both projects' exact hosting quote. Confirm account and domain ownership. Obtain explicit approval before any paid resource or public deployment; no push/provisioning occurred during this task.
2. Create/select the approved persistent PostgreSQL and Redis services in a colocated region. Configure backups and test a restore to an isolated database. File bodies are part of the PostgreSQL backup. Redis must support the configured BullMQ version and retain scheduled work across restarts.
3. In Render, use this repository with **empty Root Directory**, Docker context repository root, Dockerfile `backend/Dockerfile`, default command `node dist/main.js`, and health path `/api/health`. The image builds the production backend, runs as UID 1000, binds all interfaces using the assigned port, and has a dynamic-port Docker health check.
4. Supply the backend environment variables. Build locally with `docker build -f backend/Dockerfile -t sitecraft-api .`. Run `npm run db:migrate` once in the built image against the approved database via an approved pre-deploy/one-off job. If the chosen plan lacks pre-deploy jobs, use an approved one-off container. Startup migrations are opt-in; avoid running them concurrently on multiple replicas.
5. Run `npm run admin:bootstrap` as a one-off with the bootstrap variables. It creates a real company/administrator with a strong password and refuses to change an existing account. Remove bootstrap variables immediately. Do not use a synthetic company admin to manage a real tenant.
6. Synthetic examples are optional: explicitly authorize production seed execution, supply the seed variable, run `npm run db:seed` once, then remove seed credentials/approval. Production sample accounts have random discarded passwords. Never auto-seed on every boot. Review old seed users separately if importing an existing database. See [provenance](seed-data.md).
7. In Netlify, select this repository, **Package directory `frontend`**, **Base directory `frontend`**, configuration file `frontend/netlify.toml`, build `npm run build`, publish `.next`, Node 24 and the configured Next.js adapter. These paths are relative to the repository root/base as appropriate; do not use a nonexistent root package manifest. Supply the API build destination before building. Netlify uses the adapter output; standalone output is reserved for Docker/local starts. Rebuild after changing the destination.
8. Configure the backend's app/browser origins to the actual Netlify/custom HTTPS origin. The browser calls same-origin `/api`; the Next.js rewrite forwards to Render. Keep host-only HttpOnly/Secure/SameSite Lax cookies through the proxy, preserve the Origin header and allow only approved exact browser origins. Cookie mutations without an Origin are rejected; API automation must intentionally send an approved Origin too. Do not enable wildcard credentialed CORS or arbitrary preview domains. Check proxy IP forwarding before tuning shared IP login limits.
9. Verify live endpoints before declaring success: frontend `/`, proxied/backend `/api/health`, anonymous `/api/auth/me`, real admin login, project creation, company/project/contractor isolation, file upload/download, logout/password session revocation, blocked Origins and login throttling. Check that private API responses have no-store headers through Netlify. Confirm a persisted file/record survives a backend restart.
10. Verify BullMQ scheduler registration, a manual diagnostic digest in an isolated tenant, duplicate-delivery behavior and graceful shutdown. This deployment keeps the scheduler/worker in the API process, so choose an always-on backend. Jobs create reminders/payroll drafts only; Accounts must approve financial work. No banking integration sends funds.
11. Exercise independent approvals, stock issues/returns, partial settlements/retention and payroll through the actual frontend/API with isolated records. Confirm no double ledger entries or overpayments. Preserve the previous image and tested backup. Roll back code only after checking migration compatibility; do not reset a production database.

## Local verification

Each application has its own installation/lockfile. From repository root run `npm ci --prefix backend`, `npm ci --prefix frontend`, `npm run db:generate --prefix backend`, then migrate/seed an isolated PostgreSQL database. Run both type checks, `npm test --prefix backend`, both builds, both `npm audit` commands and `npm run test:e2e --prefix frontend` with isolated test credentials. Never run database/browser tests against production.

The Redis jobs regression requires a separate database whose name ends in `_jobs_test` and a separate Redis test database. Apply migrations there before running with the optional test variables. The browser suite uses a seeded local development database and the supplied seed password; it creates synthetic verification records. Build the API first. Playwright starts/stops its own processes.

On this Windows host, native SWC was blocked by Application Control for Sitecraft's installed version. `npm exec --prefix frontend -- next build --webpack` succeeded; the normal Turbopack build succeeded inside Linux Docker. Do not disable host security policy to run a build. There is no dedicated ESLint command in these Sitecraft packages; `format:check` is formatting validation and currently reports pre-existing untouched-file drift. Changed TypeScript/JavaScript files were formatted separately.

The existing Compose files are for local/self-hosted operation with named volumes; they do not provision Render or Netlify. If using Compose, run migrations explicitly before starting the API. PostgreSQL role-password changes must be performed through database administration; editing an environment variable does not rotate an existing role. No external mail, SMS, object storage or bank account is configured by these files.
