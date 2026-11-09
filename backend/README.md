# Sitecraft ? construction project control

The repository has exactly two application directories: `frontend/` and `backend/`. Git metadata remains in `.git`. All source, specifications, documentation, tests, infrastructure and package configuration live inside these two directories. Each application has its own package manifest, dependency installation and lockfile.

## Quick start from the repository root

Requires Node.js 24, npm and Docker Desktop with Linux containers.

```powershell
npm ci --prefix backend
npm ci --prefix frontend
npm run setup --prefix backend
# Set SEED_PASSWORD (12+ characters) in backend/.env.
docker compose -f backend/compose.yaml up -d
npm run db:generate --prefix backend
npm run db:migrate --prefix backend
npm run db:seed --prefix backend
```

Start the two applications in separate terminals:

```powershell
npm run dev --prefix backend
npm run dev --prefix frontend
```

Open **http://localhost:3000**. The API uses port 4000, PostgreSQL 55432, Redis 6379. Login as **admin@sitecraft.local** with `SEED_PASSWORD`. Other seed accounts are `pm`, `engineer`, `store`, `accounts`, `supervisor`, and `contractor` at `@sitecraft.local`. They initially share the seed password; change it in Settings. Existing seed data and passwords are preserved on repeat runs. These are synthetic demonstration identities, not real users/customers. New production sample accounts have random discarded passwords. See [seed provenance](docs/seed-data.md); create a real protected administrator with the separate bootstrap command in the deployment guide.

## Advanced product areas

| Area                  | Working behavior                                                                                                                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Control room          | Ledger actuals, approved financial baseline, earned/planned value, CPI/SPI, EAC/ETC/VAC, monthly planned/actual cost trajectory, cash, commitments and risk exposure                                                                   |
| Planning              | WBS hierarchy, accountable owners, priorities, finish-to-start dependencies, cycle detection, calendar-day critical path and float, baseline conflict warnings, timeline and drag/drop or keyboard execution board                     |
| Schedule baselines    | Immutable approved task/date/cost snapshots, revision history, stale-baseline protection; EV uses live completion against frozen baseline weights                                                                                      |
| Budget versions       | Full project versions with multiple cost heads, previous values, removed heads, total differences, submission, independent approval and superseded versions                                                                            |
| Procurement           | Multi-line purchase orders and material requests, configurable approval thresholds, partial goods receipts, invoice protection, atomic stock issues, batch returns and moving-average valuation                                        |
| Commercial            | Multi-BOQ contracts, remaining quantity reservations, measured/cumulative quantities, retention/tax/advance/penalty deductions, PM?Accounts certification, partial payment references, overpayment protection and retention settlement |
| Workforce             | Daily, hourly, monthly calendar-day prorated and certified piecework wages; bulk muster, night shift dates, overtime, unique attendance, payroll overlap and source-period locks                                                       |
| Site intelligence     | Daily weather/manpower/delay/safety diaries, plant register, runtime/fuel logs and independent cost approval                                                                                                                           |
| Coordination          | Probability?impact risk register, mitigation owners, risk matrix, assigned RFIs, recorded answers, closure/reopening and discussion threads                                                                                            |
| Approvals and audit   | Cross-module inbox, author/approver segregation, amount/role policy matrix, optimistic record revisions, per-user notification read states and cursor-paginated audit with date/action filters                                         |
| Documents and reports | Protected PDF/photo downloads outside project snapshots, BOQ progress evidence, CSV registers, ledger exports and print styles                                                                                                         |
| Navigation            | Global Ctrl/Cmd+K record/page search, direct record links, remembered project selection and a contractor portal restricted to assigned records                                                                                         |

All financial writes are validated in serializable transactions. Store issues, approved wages, certified contractor work and approved equipment logs post sourced cost entries once; returns post reversals. Approval actions preserve decision notes. Payment records describe externally settled funds; the app does not send money to banks.

Existing quick-entry screens remain available alongside the advanced workflows. Daily/weekly stock operations and older project records continue to contribute to shared cost reports. The homepage now opens the advanced control room; the earlier dashboard is available at `/overview`.

## Verification

```powershell
npm run verify --prefix backend
npm audit --prefix backend
npm audit --prefix frontend
npm exec --prefix frontend -- playwright install chromium
npm run test:e2e --prefix frontend
```

`verify` checks both TypeScript applications, runs PostgreSQL integration tests and builds both applications. Playwright starts the production API and frontend itself, then stops them. It expects the seed and a completed build. Screenshots/traces are in `frontend/artifacts/` and `frontend/test-results/`. Browser tests create uniquely named demonstration records; integration tests create and remove separate temporary company/project data.

The backend suite covers concurrent delivery and stock issues, rollback of multi-line operations, returns, bills/deductions, independent approvals, quantity reservations, partial settlements, retention, payroll bases, certified piecework, task cycles/float, frozen schedule baselines, budget revisions, stale edits, RFI answers and project/contractor access. Database integration tests are skipped if DATABASE_URL is absent; use backend/.env or supply the variable when running the full suite.

## Infrastructure and boundaries

The Render/Netlify account, plan and credentials must be approved before provisioning or public deployment. See [verification results](docs/verification.md) and [deployment](docs/deployment.md), [architecture](docs/architecture.md), the [original specification](Project_spec.md) and the [frontend guide](../frontend/README.md).

To keep the root strictly limited to two folders, the GitHub Actions workflow is stored as a **template** at `backend/ci/workflows/ci.yml`. GitHub does not automatically execute nested workflow templates. Local verification remains executable with `npm run verify --prefix backend`; automatic GitHub Actions would require a root `.github/workflows` directory, which is intentionally absent under the requested layout.

Daily 08:00 Asia/Dhaka BullMQ digests record variance, overdue and retention reminders; monthly payroll drafts await Accounts approval. Redis provides optional BOQ/stock caches. No external email/SMS, S3, bank or public hosting account has been connected. Files currently live in PostgreSQL as validated PDF/image data URLs: 4 MB documents and 2 MB photos. The authenticated file endpoint streams them without putting file bodies into every project snapshot.

The specification's relational stock/ledger models coexist with project-scoped JSON domain aggregates, validated by strict schemas and transactional reference checks. There are no financial delete endpoints. Monetary transaction values remain bounded by signed integer paisa limits; migrate ledger and stock cost fields to BigInt before supporting individual transactions above roughly BDT 20 million. Monthly payroll prorates recorded paid attendance by calendar days, rather than assuming paid weekends. S-curves use actual posting dates and do not invent historical earned-value measurements.

The original 60 delivery commits retain owner-requested September 2026 metadata dates. Subsequent upgrades are separate commits. Development occurred in November 2026; metadata dates are not a development-time claim.

For the separately authorized disposable one-container Render Free preview, use [FREE-PREVIEW.md](FREE-PREVIEW.md). The external-store production Docker target remains unchanged.
