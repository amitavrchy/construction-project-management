# Sitecraft: one-container Render Free preview

This disposable preview explicitly replaces the earlier durable-store requirement **for this target only**. One container contains PostgreSQL, Redis, the API and its existing in-process BullMQ jobs. No external database/Redis, paid resource, separate worker, disk, billing enablement or keepalive is needed. No deployment was performed by this task.

Render sleep pauses the processes and jobs. Cold starts initialize stores, migrate and seed, so they take time. A restart, redeploy, spin-down or container replacement can erase the filesystem, including users, files, financial records and queues. Persistence, always-on schedules and missed-job catch-up are not promised. Use synthetic data only. See [Render Free limitations](https://render.com/docs/free).

## Exact Render settings

| Setting | Value |
| --- | --- |
| Workspace | `Heyhoo` |
| Repository | `amitavrchy/construction-project-management` |
| Branch | `harden/deployment-readiness` |
| Service type / plan | Web Service / Free |
| Runtime | Docker |
| Root Directory | Empty — **not** `backend` |
| Dockerfile path | `./backend/Dockerfile.render.free-preview` |
| Docker build context | `.` — construction-project-management repository root |
| Docker command override | Empty; retain the image entrypoint |
| Pre-deploy command | Empty; guarded startup handles migrations/seeds |
| Health check path | `/api/health` |
| Disk / other services | None |

`backend/Dockerfile` remains the unchanged external-database production target. The preview runs as UID 1000. Only HTTP binds all interfaces on the assigned port; PostgreSQL/Redis bind loopback and are not published. Project documents/images remain in the internal PostgreSQL database and are equally disposable.

## Environment-variable names

Required names, with values supplied privately through Render settings:

- `FREE_PREVIEW`
- `ALLOW_PRODUCTION_SEED`
- `SEED_ON_START`
- `APP_URL`
- `CORS_ORIGINS`
- `PREVIEW_LOGIN_EMAIL`
- `PREVIEW_LOGIN_PASSWORD`

Optional names: `PORT`, `JWT_SECRET`.

Enable all three preview/seed flags explicitly. Use the actual HTTPS frontend origin and exact HTTPS CORS origins. Supply a private valid email and a strong password of at least 16 characters, within bcrypt's 72 UTF-8-byte limit. Do not put credentials in Git, logs or public demo instructions. No public/default admin password is introduced.

Internal datastore credentials, a JWT signing secret and seed-only secret are generated privately under `/preview` if needed. The preview overrides datastore destinations to its own stores. Optional external-provider/mail credentials are removed from application processes. Do not supply external database/Redis destinations or require external SMTP/AI/billing providers for this target.

## Bootstrap and supervision

The entrypoint initializes PostgreSQL 15/Redis, waits for readiness, runs existing guarded migrations and both idempotent synthetic seeds, then creates one explicitly configured private preview operator in the synthetic company. Existing sample roles retain random discarded production passwords. The preview operator has company-admin rights only within that synthetic company, protected by the supplied private password. Existing identities/passwords/business edits are preserved on rerun; changed identity settings/conflicts fail rather than overwriting an account.

Normal login, authorization, project/material writes, approvals and financial checks remain real. Session revocation, Origin protection, Redis login throttling, file validation and no-store responses remain enabled. No bank transfer is sent by a recorded payment. The preview does not add financial delete endpoints or bypass independent approvals. There is no fabricated successful authentication, email, payment or write.

The API starts only after migration/seeding succeeds. Its health check verifies PostgreSQL and Redis, and startup registers the existing in-process scheduler/worker. The supervisor treats a required child exit as failure, stops siblings and exits nonzero. SIGTERM stops the API/jobs before the stores, waits for shutdown and uses bounded escalation. Sleep simply stops work; it is not defeated by pings.

## Memory and verification

The runtime API heap is capped at 96 MiB, initialization at 128 MiB, and Prisma's pool at four connections. PostgreSQL uses 16 MiB shared buffers, 16 connections, 1 MiB work memory, bounded maintenance/autovacuum settings and no query parallelism. Redis uses a 24 MiB budget with `noeviction`; allocation pressure rejects commands rather than evicting BullMQ keys. Internal AOF helps a same-container restart but does not survive filesystem replacement; background snapshot/rewrite forks are disabled.

From the repository root:

```sh
docker build -f backend/Dockerfile.render.free-preview -t sitecraft-free-preview .
node backend/scripts/test-free-preview.mjs
```

The finite harness generates private temporary credentials, runs with 512 MiB RAM/no additional swap and one CPU, and removes only its owned test containers. It verifies migrations/seeds, internal-only store listeners, HTTP port binding, authenticated project/material create/read/update and status workflows, forbidden Origin handling, actual in-process BullMQ digests/duplicate protection without financial posting, restart/reseed/password preservation, fresh replacement/reset, SIGTERM and API-failure supervision. It records cgroup peaks/OOM counters in [FREE-PREVIEW-TEST-RESULTS.json](FREE-PREVIEW-TEST-RESULTS.json).

A dedicated 512 MiB build-container test can use Docker Buildx's `docker-container` driver with `--driver-opt memory=512m`, `--driver-opt memory-swap=512m` and `--buildkitd-config backend/scripts/buildkit.free-preview.toml`. Run `docker buildx build --builder <dedicated-builder-name> --load` with the same Dockerfile/context/tag. Build steps are serialized and the build Node heap is bounded separately. This does not change Render's own builder configuration.

These local tests use one CPU, not Render Free's smaller CPU share. They are not sustained-load, malicious-file or production financial assurance. Actual Render/Netlify HTTPS behavior remains a deployment acceptance check. See the recorded results and test notes; do not treat failed/unrun checks as passes.

## Operator deployment steps

1. Select the pushed branch and exact settings above. Choose only Free. Do not provision PostgreSQL/Redis services, external providers, disks, paid add-ons or separate workers. Leave automatic deployment off until deliberately deploying.
2. Supply the required environment names privately and enable the explicit preview/production-seed opt-ins. Set real frontend HTTPS origins.
3. Deploy manually only when you choose to. Wait for `/api/health`; inspect boot logs on failure. No pre-deploy job or shell access is required because initialization occurs in the container.
4. Set the Netlify frontend's server-only `API_URL` to the actual assigned HTTPS Render backend origin and rebuild. Keep package/base directory `frontend`, `frontend/netlify.toml`, build `npm run build`, publish `.next`, and the existing same-origin proxy. No frontend code change is required.
5. Verify actual proxy health, Secure/HttpOnly cookies, private login, seeded-project access, authorized writes and scheduler operation. Do not publish credentials or describe the fictional company as real business activity.
6. Expect resets on sleep/replacement and schedules only while awake. Do not configure keepalive tricks or promise persistence. A successful local test is not a live deployment.

## Recorded local outcome (2026-11-09)

Final runtime acceptance: **passed**, with a configured 512 MiB memory limit and no additional swap. Peak cgroup memory: **242.5 MiB**. Every recorded phase had zero `oom` and `oom_kill` events. Fresh boot/restart/replacement readiness took 12.3/3.4/7.2 seconds locally with one CPU. These are measured local timings, not Render promises. Both final Docker builds also completed in a dedicated BuildKit container configured with 512 MiB RAM/no extra swap and serialized build steps.

The first startup attempt failed on Windows CRLF shell line endings; the final build normalizes LF and syntax-checks scripts. A default parallel backend test run had 43 passes and 8 failures from write conflicts and dependent fixtures under contention. A serialized backend rerun passed all 51 tests with zero skips. The final 512 MiB image acceptance suite passed independently. Backend typecheck and npm audit also passed. Parallel financial-test stability remains a recorded limitation; no financial invariants were relaxed to make tests pass.

Actual hosted endpoints, Netlify HTTPS cookie/proxy behavior, sustained-load safety and real-world provider integrations remain untested because deployment was explicitly excluded. The existing external-store production Dockerfiles and entrypoints are unchanged. Neither frontend repository/app needed a compatibility code change.
