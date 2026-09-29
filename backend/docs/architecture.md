# Architecture and invariants

Relational Prisma models hold companies, users, projects, sites, memberships, stock, immutable API cost entries and audits. `Record` stores project-scoped domain aggregates, strict Zod payloads, unique project/kind/reference keys, status and revision numbers. JSON references are validated transactionally rather than enforced as database foreign keys; direct database mutation is an administrative capability, not an application API.

## Advanced transactions

Multi-line purchase orders, material requests, deliveries, batch issues, batch returns, contracts, bills, budgets and schedule snapshots are durable aggregates. A failure on any inventory or ledger line rolls back the entire operation. Invoice references are checked across old GRNs and advanced deliveries. Interactive project snapshots use Repeatable Read for coherent financial reporting. Material request valuation uses current site stock costs; changed approval thresholds or higher valuations require reauthorization before dispatch. Transactions run at Serializable isolation with bounded retry on serialization conflicts. Each cost ledger source is unique.

Contract packages reserve approved BOQ scope. Non-rejected draft/submitted bills reserve remaining contract quantities, while preserving previously measured and cumulative quantities. Accounts certification posts gross cost per cost code once. Net payable applies retention, withholding, advance recovery and penalties. Payment records cannot exceed outstanding net; retention needs a fully paid bill and an expired defects period, and cannot release twice. Payments never post the project cost again.

Budget releases contain all cost heads and differences from their prior approved version. An approval supersedes the former baseline and old approved head budgets. Concurrent stale revisions cannot supersede a newer approved budget. Task edits validate hierarchy and dependency cycles. Approved schedule snapshots freeze dates and cost weights; live physical completion drives EV against these weights. Missing approved snapshots are explicitly labeled live planning estimates. PV follows calendar-day baseline dates; actuals follow ledger posting dates. CPM uses finish-to-start calendar-day durations; baseline overlaps and project-window overruns are displayed.

Daily wages use recorded days plus OT; hourly wages use eight-hour base days and half-day fractions; monthly wages prorate paid attendance against each month's calendar days. Contract-paid workers require independently approved measured piecework; payroll uses each work log's snapshotted cost. Payroll periods block later attendance/work logs and overlapping wage runs. Calculated wage breakdowns retain their rates and source totals.

## Security and collaboration

Every action checks current user activity, company ownership and project membership before role permission. Contractors see only assigned orders, bills and payment records. Session cookies are HttpOnly and SameSite=Lax; production requires Secure cookies over HTTPS. Supplied mutation Origins must match configured origins. Login attempt limits are per process; use a shared limiter when scaling replicas.

Advanced edits and decisions include expectedVersion. Stale clients receive conflict errors, rather than overwriting another person's work. Approval thresholds determine PM versus company authorization; Accounts remains a separate stage. Originators cannot approve their own financial records. RFI answers require the assignee or a manager. Comments, decisions, before/after changes and notification read states persist in the project. Audit reads have project scoping, cursor pagination and date/action filters. Files use a protected project endpoint and private/no-store caching; snapshot JSON omits image/PDF bodies.

## Routes

Existing `/api/auth`, `/api/projects`, quick-entry `/records`, reports and team routes remain compatible. Catalog updates use `PATCH /projects/:id/records/:recordId` with an expected version. Files use `GET /projects/:id/files/:recordId`.

| Advanced route under `/api/projects/:projectId/advanced` | Purpose                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------ |
| `POST /records/:kind`                                    | Validated aggregate creation                                 |
| `PATCH /records/:id`                                     | Version-checked draft/operational edits                      |
| `POST /records/:id/transition`                           | Guarded submission, approval or operational state change     |
| `GET /analytics`                                         | EVM, budget/costs, trajectory, CPM, risk and cash indicators |
| `GET /people`                                            | Active project people for owner/assignee fields              |
| `GET /audit`                                             | Cursor-paginated audit, optional action/from/to filters      |
| `GET /exports/:kind`                                     | Safe CSV register export                                     |
| `POST /notifications/:id/read`                           | Per-user notification acknowledgement                        |

BullMQ runs daily digests at 08:00 Asia/Dhaka and prior-month payroll preparation on the first day. Cache endpoints remain optional and degrade to PostgreSQL when Redis reads fail; durable jobs require Redis. No automatic bank payment, external email/SMS delivery or S3 connection is configured.

Money is integer BDT paisa; stock quantities have three decimal places. Monetary results are checked before storage; current signed integer stock/ledger fields require a BigInt migration for individual values above roughly BDT 20 million. JSON aggregates should be normalized into dedicated line tables before large-scale enterprise imports or analytics workloads. General file storage currently caps documents at 4 MB and photos at 2 MB.
