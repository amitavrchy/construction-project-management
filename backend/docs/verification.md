# Sitecraft local audit and verification

Date: 2026-11-09. Branch: `harden/deployment-readiness`. The repository was clean on inspection. Only this project and the two RivalScope repositories were changed. No hosting provisioning, billing activation, public deployment, push, history rewriting or visibility change occurred.

## Verified security changes

- Sessions carry a database-backed version. Password changes and logout revoke older JWTs; login reads current user state. Passwords are bounded by bcrypt's UTF-8 byte limit rather than character count. Pre-existing unversioned sessions expire on rollout.
- Login protection moved from an in-process map to atomic expiring Redis counters by account and IP, with hashed keys and fail-closed behavior. Redis is required at startup. Production uses exact HTTPS origins and proxy-aware secure cookies; mutating requests without an allowed Origin are rejected.
- Private API responses receive no-store headers. Datastore health now includes Redis as well as PostgreSQL. Scheduled jobs stop before API dependencies disconnect; Redis URL credentials/database/TLS options are handled. Duplicate digest execution writes one transactional marker/audit. Financial jobs still create drafts/reminders, not bank payments.
- Internal errors no longer return raw exception messages. Expected domain validation errors are explicit HTTP exceptions so financial/approval feedback remains actionable. Upload checks validate canonical base64, decoded byte limits and permitted file signatures, in addition to existing tenant/role checks, protected file routes and MIME restrictions.
- Production Docker runtime is non-root, supports the assigned port, has a health check and guarded migration/seed entrypoint. Persistent PostgreSQL/Redis remain external. Files are stored in PostgreSQL, not container uploads.
- Seed provenance, fixed advanced scenario date, rerun protection and a no-overwrite real-admin bootstrap were added. New production sample passwords are random and discarded; existing accounts/passwords are preserved and require separate operator review. Frontend calls are bounded, startup delays are visible, private records revalidate on focus, and a confirmed write followed by refresh failure is described accurately.

Reviewed company/project/contractor authorization, strict payload/reference checks, financial state transitions/serializable writes, payments/retention/payroll, uploads/downloads, CSV export, cookie/CORS behavior, Redis jobs, dependency trees and deployment configuration. Existing financial tests were actually run against PostgreSQL, rather than trusting earlier audit claims. No dynamic SQL injection or outbound user-controlled HTTP request path was found in the reviewed flows; the static health SQL contains no user input. React rendering and protected typed file downloads remain the relevant XSS boundaries. Signature checks are not malware scanning.

Tracked-source and all-branch history pattern scans found no provider-key/private-key matches for the patterns examined. Local/example connection strings were identified without printing credentials. **Rotate database/JWT/seed-account credentials externally if any publicly documented defaults or reused development credentials were deployed.** Existing databases do not rotate passwords when environment settings change. No cloud credential inventory was available. Pattern scans are incomplete and do not establish that no secrets exist. No history was erased.

## Actual results

| Check | Outcome |
| --- | --- |
| Both `npm ci` installs | Passed |
| Prisma generation and migrations | Passed on fresh isolated PostgreSQL 17, including session revocation migration |
| Backend typecheck/build | Passed |
| Backend tests, configured DB/Redis/jobs DB | 51 passed, zero skips/failures |
| Critical test coverage | Concurrent inventory issues/deliveries; rollback; independent approvals; quantity reservations; duplicate ledger/payment/retention prevention; payroll locks; project/contractor isolation; HTTP Origin/cache/session/rate checks; hidden internal errors; upload validation; Redis duplicate digest |
| Frontend typecheck | Passed |
| Frontend default Windows build | Blocked by host Application Control native SWC policy; no host policy was disabled |
| Frontend Windows Webpack build | Passed |
| Frontend normal Linux Docker build | Passed with Turbopack |
| Playwright browser suite | 3 passed: advanced registers/planning/procurement, desktop save/search/export/upload, mobile contractor restrictions |
| Both `npm audit` scans | 0 reported findings initially and on final scans |
| Seed/rerun snapshot verification | Passed in local development database and isolated production-mode seed database; passwords/IDs/business rows unchanged |
| Production seed | Full base/advanced workflows passed with random discarded sample passwords |
| Admin bootstrap | Created separate isolated company/account; second invocation correctly refused overwrite |
| Docker backend build/runtime | Passed; UID 1000, nondefault assigned port, health 200, no-store header, graceful termination exit 0 |
| Persistence | Separate named PostgreSQL/Redis volumes verified; API replacement does not contain their data |
| Whole-project `format:check` | Failed on pre-existing formatting drift (initially 47 backend/51 frontend files); changed JS/TS files formatted separately. No ESLint script exists in either package |

Browser tests were run with generated synthetic credentials in isolated test databases; no production writes or bank calls occurred. Keep the persistent local demonstration volume. Test traces are ignored because they may contain synthetic credentials/session data.

Not verified: actual Render/Netlify account resources, paid-plan/region quote and approval, production database/Redis credentials, production backup restore, provider services/bank integrations, OS container CVEs, sustained load/large-data performance, malicious-file scanning, actual live HTTPS proxy/cookie/cache behavior. Financial transaction amounts remain bounded integer minor units; larger transaction support needs an explicit data migration. Shared-IP rate limits require tuning after verifying the deployed proxy chain. Sleeping free backends cannot guarantee scheduled work. No statement here means all vulnerabilities are eliminated.

See [deployment](deployment.md) and [seed provenance](seed-data.md). The inventory below records changed files; use `git log main..HEAD --oneline` for commits.

## Changed-file inventory

- `backend/.env.example`
- `backend/Dockerfile`
- `backend/README.md`
- `backend/docs/deployment.md`
- `backend/docs/seed-data.md`
- `backend/docs/verification.md`
- `backend/package.json`
- `backend/prisma/migrations/20261109090000_session_revocation/migration.sql`
- `backend/prisma/schema.prisma`
- `backend/prisma/seed-advanced.ts`
- `backend/prisma/seed.ts`
- `backend/scripts/bootstrap-admin.mjs`
- `backend/scripts/entrypoint.sh`
- `backend/scripts/verify-seed.mjs`
- `backend/src/advanced/contracts.ts`
- `backend/src/advanced/controller.ts`
- `backend/src/advanced/materials.ts`
- `backend/src/advanced/planning.ts`
- `backend/src/advanced/schemas.ts`
- `backend/src/advanced/service.ts`
- `backend/src/auth.ts`
- `backend/src/cache.ts`
- `backend/src/domain/approvals.ts`
- `backend/src/domain/context.ts`
- `backend/src/domain/contracts.ts`
- `backend/src/domain/inventory.ts`
- `backend/src/domain/labor.ts`
- `backend/src/domain/money.ts`
- `backend/src/domain/progress.ts`
- `backend/src/domain/schemas.ts`
- `backend/src/domain/states.ts`
- `backend/src/errors.ts`
- `backend/src/jobs.ts`
- `backend/src/main.ts`
- `backend/src/projects.controller.ts`
- `backend/src/projects.service.ts`
- `backend/src/session-security.ts`
- `backend/src/team.controller.ts`
- `backend/src/uploads.ts`
- `backend/test/errors.test.ts`
- `backend/test/http-security.test.ts`
- `backend/test/jobs.test.ts`
- `backend/test/session-security.test.ts`
- `backend/test/uploads.test.ts`
- `frontend/README.md`
- `frontend/components/login.tsx`
- `frontend/components/provider.tsx`
- `frontend/components/workspace.tsx`
- `frontend/lib/api.ts`
- `frontend/netlify.toml`
- `frontend/next.config.ts`
