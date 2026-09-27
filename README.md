# Sitecraft · Construction, connected.

Construction operations for Bangladesh: Next.js 16 / React 19, NestJS 12, Prisma 6 / PostgreSQL and Redis / BullMQ. Built from [Project_spec.md](./Project_spec.md).

## Local setup

Requires Node.js 24, npm and Docker Desktop (Linux containers).

```powershell
npm ci
npm run setup
# Edit .env to set SEED_PASSWORD (12+ characters), then synchronize:
npm run setup
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open **http://localhost:3000**. API: 4000; PostgreSQL: **55432**; Redis: 6379. Change `API_URL` before building the frontend if the API address changes. `npm run setup` generates a local JWT secret and copies root `.env` to `backend/.env` for Prisma CLI commands.

Login: **admin@sitecraft.local**, password from `SEED_PASSWORD`. Other seed accounts: `pm`, `engineer`, `store`, `accounts`, `supervisor`, `contractor` at `@sitecraft.local`, all with the same initial password. Change passwords in Settings. The seed preserves existing data and does not reset passwords.

## Working modules

- Projects, sites, project lifecycle, company users, project memberships, seven roles and a contractor portal limited to assigned records.
- Twenty seeded BOQ items; approved budgets by cost head, immutable approved values, editable draft revisions and amount differences; approved variation quantities and budget additions.
- Materials, suppliers, duplicate invoice protection, GRN with moving average valuation, requisition approval, partial issues, returns and in-transit transfers. Negative stock is blocked.
- Workers, trades, gangs, rates, individual and atomic bulk attendance, night shift start dates, OT, payroll periods, wage approval and payment. Duplicate attendance and overlapping payroll are blocked.
- Work orders and RA bills with quantity reservation, retention, tax, advance recovery and penalties. PM and Accounts approval require separate people; certified gross costs post once. Retention release is recorded after defects liability ends.
- Cumulative BOQ progress with quantity limits and photo evidence above 15% jumps, plus PDF/image document uploads and downloads.
- Ledger-backed actuals and variance reports, low stock alerts, activity history, safe CSV exports and print styles.
- Daily 08:00 Asia/Dhaka variance/overdue/retention digests in project activity; previous-month payroll preparation on the first day. Jobs retry on failure. Redis-backed BOQ/stock snapshot endpoints.
- Responsive UI, consistent **14px minimum** typography, accessible dialogs, keyboard focus, restrained animation and reduced-motion support.

Admins provision users and projects. Engineers submit requisitions, a different PM/admin approves, and the store keeper issues stock. Contractors/accountants draft RA bills; a PM certifies and a separate accountant approves and records payment. Originators cannot approve their own financial records.

## Verification

```powershell
npm run typecheck
npm test
npm run build
npm audit
npx playwright install chromium
# Keep npm run dev running in a separate terminal:
npm run test:e2e
```

PostgreSQL integration tests create and remove isolated temporary company data. They cover concurrent issues and ledger posting, returns, transfers, invoice uniqueness, bill quantities and deduction math, approval segregation, attendance uniqueness and bulk rollback, wages/OT, budget revisions, retention, progress evidence and project/contractor isolation. Database tests skip when `DATABASE_URL` is absent; CI supplies it.

Playwright verifies desktop routes, rendered text sizes, form submission/search, CSV download and mobile contractor access. It expects the development seed and creates a uniquely named test material. Screenshots and failure traces go to ignored `artifacts/` and `test-results/`. GitHub Actions runs builds, database tests, audit and browser checks.

## Implementation choices

See [architecture](./docs/architecture.md) and [deployment](./docs/deployment.md).

This is a local application and production build; no public deployment has been made. Email/SMS providers and S3 are not configured: scheduled reminders appear in project activity. Documents/photos are validated data URLs stored in PostgreSQL (4 MB documents, 2 MB photos); object storage is a future scaling step. Data refreshes on navigation, mutation or the refresh button; optional Socket.IO is not enabled.

The initial seed includes `OPENING_BALANCE` ledger sources for historical costs and imported baseline progress without photos. New progress records enforce photo evidence. Financial records are append-only through the API; administrative database credentials still control database rows.

## Commit dates

Implementation took place in November 2026. At the owner's request, the **60 implementation commits** use Git author/committer dates spread over **1–30 September 2026**, attributed to `amitavrchy`. These are metadata dates, not a claim that development occurred in September. The original scaffold commit is preserved.
