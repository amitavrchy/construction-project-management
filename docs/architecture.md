# Architecture

Relational Prisma models hold companies, users, projects, sites, memberships, stock, ledger and audit. The `Record` model holds project-scoped domain aggregates with strict Zod payload validation, unique `(projectId, kind, key)` references and indexed states.

This deliberately differs from the specification's draft of one table per aggregate. Inventory and ledger retain transactional invariants; JSON domain references are validated in the API rather than database foreign keys. The initial workflow treats each budget record as a versioned cost head and each receipt/requisition/work order/bill as a single line. Create multiple records for multiple materials or BOQ items. Normalize line tables before large multi-line imports or enterprise analytics.

Currency is integer BDT paisa; quantities have three decimal places. Individual monetary results must fit signed 32-bit paisa (approximately BDT 21.47 million per posted value). Larger individual transactions require migrating money fields to BigInt and updating JSON serialization.

## Transaction rules

- GRN updates stock and weighted moving average together; supplier/invoice record keys prevent duplicates within a project.
- Issues check approved remaining requisition quantity and stock, decrement inventory, update partial/full issue state and insert a ledger debit in one serializable transaction.
- Returns cannot exceed original issues and post reversal entries at original issue cost. Transfers hold stock in transit until destination receipt.
- Non-rejected bills reserve ordered quantity, preventing simultaneous overbilling. Accounts approval posts gross cost once; retention/tax affect payable, not project cost.
- Wage runs snapshot rate breakdowns, freeze their attendance period and block overlaps. Approval posts cost once; payment does not double-post.
- Approved budget revisions preserve the source. Draft edits record amount differences; approval supersedes the previous cost head.
- Serializable conflicts retry up to four times. Bulk attendance rolls back entirely on duplicates or invalid rows.

## Authentication and access

Eight-hour HS256 sessions use HttpOnly, SameSite=Lax cookies; production requires HTTPS for Secure cookies. Mutation Origins must match `CORS_ORIGINS` when supplied. Every request verifies the user, company and project membership before role permissions. Contractor snapshots omit stock, ledger and audit and expose only assigned records.

PM and Accounts approvals require separate roles/people. Originators cannot approve their own financial records. Login attempt limits apply per API process; multi-replica deployments should use a shared gateway/Redis limiter and deliberate trusted-proxy configuration. There is no public registration or email password recovery; admins provision accounts.

## REST API

All routes start with `/api`. JSON writes use same-origin session cookies. CSV endpoints return attachment downloads. Validation errors return `{ message, statusCode }`.

| Route                                                  | Purpose                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| `GET /health`                                          | Process readiness                                            |
| `POST /auth/login`, `/auth/logout`, `/auth/password`   | Session/password actions                                     |
| `GET /auth/me`                                         | Current user without password hash                           |
| `GET/POST /projects`                                   | Assigned projects / admin creation                           |
| `GET /projects/:id`                                    | Scoped project snapshot                                      |
| `PATCH /projects/:id/status`                           | Guarded lifecycle transition                                 |
| `POST /projects/:id/sites`                             | Add site                                                     |
| `POST /projects/:id/records/:kind`                     | Create validated domain record                               |
| `POST /projects/:id/records/:recordId/transition`      | Submit/approve/reject/pay/receive                            |
| `POST /projects/:id/attendance/bulk`                   | Atomic 1–200 muster rows                                     |
| `POST /projects/:id/budgets/:recordId/revise`          | Copy approved budget into draft                              |
| `PATCH /projects/:id/budgets/:recordId`                | Edit draft and calculate diff                                |
| `POST /projects/:id/bills/:recordId/release-retention` | Eligible retention settlement                                |
| `GET /projects/:id/boq-tree`                           | Cost-code BOQ tree, 60-second cache                          |
| `GET /projects/:id/stock-snapshot`                     | 10-second stock cache                                        |
| `GET /projects/:id/reports/:report`                    | CSV: budget-vs-actual, material-register, attendance, ledger |
| `GET/POST /team`                                       | Company directory / provisioning                             |
| `POST /team/:userId/memberships`                       | Assign existing member to project                            |

There are no ledger edit/delete endpoints. Corrections require explicit reversals. Payment states record external settlement; the application does not send funds to banks.

## Jobs and cache

BullMQ runs daily at 08:00 Asia/Dhaka. Audit digests contain variance alerts, overdue requisitions and retention reminders. On the first day of each month, sites with prior-month attendance and no overlapping run receive a calculated payroll draft awaiting Accounts approval. Stable scheduler IDs survive restarts.

Redis cache keys include project IDs and authorization runs before reads. The interactive snapshot reads PostgreSQL directly to reflect successful writes immediately; optional BOQ/stock endpoints have short TTLs. Cache errors fall back to PostgreSQL; background jobs require Redis.
