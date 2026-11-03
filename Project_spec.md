# Construction Project Management — Project Spec

> Stack: **Next.js + NestJS + Prisma + PostgreSQL + Redis/BullMQ**  
> Bangladesh construction sites: material requisition/stock, labor attendance & wages, contractor bills, BOQ, budget vs actual cost, progress reports.

---

## 1. Overview & Goals

### Product
Run building/infrastructure projects: BOQ & budget, site material store, requisitions from engineers, labor muster roll & wages, contractor measurement bills (RA bills), daily progress, and cost control dashboards.

### Engineering goals
- BOQ → budget heads → actual cost rollup (materials + labor + contractor).
- Material stock per site with GRN/issue/return; prevent negative stock.
- Labor attendance → wage calculation (daily/monthly/contract).
- Contractor running account bills with retention & TDS-like withhold (configurable).
- Progress % by work item; photo evidence.

### Non-goals
- Full AutoCAD/BIM.
- Heavy equipment IoT telematics (manual log OK).

---

## 2. User Roles & Permissions (RBAC)

| Role | Permissions |
|------|-------------|
| `COMPANY_ADMIN` | Projects, users, rate cards |
| `PROJECT_MANAGER` | Budget, approvals, reports |
| `SITE_ENGINEER` | Requisitions, progress, attendance |
| `STORE_KEEPER` | GRN, issue, stock |
| `ACCOUNTANT` | Contractor bills, wages payment status |
| `CONTRACTOR` (portal) | Submit bills, see approvals |
| `LABOR_SUPERVISOR` | Muster attendance |

Approval matrix by amount thresholds.

---

## 3. Feature Modules

1. Companies, projects, sites, work breakdown  
2. BOQ & budget versions  
3. Material catalog, suppliers, site stock  
4. Requisition → issue workflow  
5. Labor gangs, attendance, wages  
6. Contractors, work orders, RA bills  
7. Daily progress & photos  
8. Budget vs actual & variance alerts  
9. Document vault (drawings, NOCs)  
10. Reports / exports  

---

## 4. Advanced Business Logic

### 4.1 BOQ & budget
```
BOQ item: code, description, unit, qty, rate → amount
Budget version locked when APPROVED; revisions create new version with diff
Actual = material issues (valued at moving avg cost) + labor wages posted + approved contractor bills
Variance = actual - budget; alert if > threshold%
```

### 4.2 Material flow
```
Purchase/GRN → SiteStock(batch optional)
Requisition(REQUESTED→APPROVED) → Issue (decrements stock) linked to BOQ/cost code
Return unused → stock in
Transfer between sites with in-transit state
```
Moving average cost updated on GRN.

### 4.3 Labor wages
```
dailyWage = attendanceDays * rate (or hours * hourly)
overtime = otHours * otMultiplier * rate
period payroll run per project/site
```
Muster uniqueness `(worker, site, date)`.

### 4.4 Contractor RA bill
```
Bill items against work order BOQ qty:
  thisBillQty <= remainingQty (ordered - previously certified)
  gross = qty * rate
  deductions: retention% + advance recovery + withhold tax% + penalties
  netPayable = gross - deductions
```
States with PM + Accounts approvals.

### 4.5 Progress
- Site engineer updates `%` or qty done per BOQ item; cannot exceed 100% without variation order.
- Photos required above % jump threshold.

### 4.6 Edge cases
- Issue without stock → block or allow with PM override (backorder).  
- Double GRN of same supplier invoice number.  
- Retention release after defects liability period job.  
- Concurrent requisition approvals depleting same stock.  
- Currency BDT; round paisa on wage totals.  
- Night shift attendance spanning dates.

---

## 5. State Machines

**Project**: `PLANNING → ACTIVE → ON_HOLD → COMPLETED | CANCELLED`  
**BudgetVersion**: `DRAFT → SUBMITTED → APPROVED | REJECTED`  
**Requisition**: `DRAFT → SUBMITTED → APPROVED → PARTIAL_ISSUED → ISSUED | REJECTED | CANCELLED`  
**ContractorBill**: `DRAFT → SUBMITTED → PM_APPROVED → ACCOUNTS_APPROVED → PAID | REJECTED`  
**WageRun**: `DRAFT → CALCULATED → APPROVED → PAID`  
**VariationOrder**: `DRAFT → APPROVED | REJECTED`

---

## 6. Prisma Schema Draft

```prisma
model Company { id String @id @default(cuid()) name String }
model User { id String @id @default(cuid()) fullName String role String passwordHash String? phone String? }
model Project {
  id String @id @default(cuid())
  companyId String
  code String
  name String
  status String
  startsOn DateTime? @db.Date
  @@unique([companyId, code])
}
model Site {
  id String @id @default(cuid())
  projectId String
  name String
  address String?
  lat Float?
  lng Float?
}
model ProjectMember {
  id String @id @default(cuid())
  projectId String
  userId String
  role String
  @@unique([projectId, userId])
}
model BoqItem {
  id String @id @default(cuid())
  projectId String
  code String
  description String
  unit String
  qty Decimal @db.Decimal(14,3)
  rateMinor Int
  @@unique([projectId, code])
}
model BudgetVersion {
  id String @id @default(cuid())
  projectId String
  version Int
  status String
  @@unique([projectId, version])
}
model BudgetLine {
  id String @id @default(cuid())
  budgetVersionId String
  costCode String
  boqItemId String?
  amountMinor Int
}
model Material {
  id String @id @default(cuid())
  companyId String
  sku String
  name String
  unit String
  @@unique([companyId, sku])
}
model SiteStock {
  id String @id @default(cuid())
  siteId String
  materialId String
  qtyOnHand Decimal @db.Decimal(14,3)
  avgCostMinor Int @default(0)
  @@unique([siteId, materialId])
}
model Supplier { id String @id @default(cuid()) companyId String name String }
model GoodsReceipt {
  id String @id @default(cuid())
  siteId String
  supplierId String
  invoiceNo String?
  receivedAt DateTime @default(now())
  @@unique([supplierId, invoiceNo])
}
model GoodsReceiptLine {
  id String @id @default(cuid())
  grnId String
  materialId String
  qty Decimal @db.Decimal(14,3)
  costMinor Int
}
model Requisition {
  id String @id @default(cuid())
  siteId String
  requestedBy String
  status String
  neededOn DateTime? @db.Date
}
model RequisitionLine {
  id String @id @default(cuid())
  requisitionId String
  materialId String
  qtyRequested Decimal @db.Decimal(14,3)
  qtyIssued Decimal @db.Decimal(14,3) @default(0)
  boqItemId String?
  costCode String?
}
model StockIssue {
  id String @id @default(cuid())
  requisitionId String?
  siteId String
  materialId String
  qty Decimal @db.Decimal(14,3)
  costMinor Int
  issuedAt DateTime @default(now())
}
model Worker {
  id String @id @default(cuid())
  companyId String
  name String
  trade String?
  dailyRateMinor Int?
}
model Attendance {
  id String @id @default(cuid())
  siteId String
  workerId String
  date DateTime @db.Date
  status String // PRESENT HALF ABSENT
  otHours Decimal @db.Decimal(4,2) @default(0)
  @@unique([siteId, workerId, date])
}
model WageRun {
  id String @id @default(cuid())
  projectId String
  periodStart DateTime @db.Date
  periodEnd DateTime @db.Date
  status String
}
model WageLine {
  id String @id @default(cuid())
  wageRunId String
  workerId String
  amountMinor Int
  breakdown Json
}
model Contractor {
  id String @id @default(cuid())
  companyId String
  name String
  phone String?
}
model WorkOrder {
  id String @id @default(cuid())
  projectId String
  contractorId String
  title String
  retentionBps Int @default(500)
  withholdTaxBps Int @default(0)
  status String
}
model WorkOrderItem {
  id String @id @default(cuid())
  workOrderId String
  boqItemId String?
  description String
  unit String
  qty Decimal @db.Decimal(14,3)
  rateMinor Int
}
model ContractorBill {
  id String @id @default(cuid())
  workOrderId String
  billNo String
  status String
  grossMinor Int
  retentionMinor Int
  taxMinor Int
  advanceRecoveryMinor Int @default(0)
  netMinor Int
  @@unique([workOrderId, billNo])
}
model ContractorBillLine {
  id String @id @default(cuid())
  billId String
  workOrderItemId String
  qty Decimal @db.Decimal(14,3)
  amountMinor Int
}
model ProgressEntry {
  id String @id @default(cuid())
  projectId String
  boqItemId String
  qtyDone Decimal @db.Decimal(14,3)
  percent Decimal @db.Decimal(5,2)
  note String?
  at DateTime @default(now())
  byUserId String
}
model ProgressPhoto {
  id String @id @default(cuid())
  progressEntryId String
  url String
}
model VariationOrder {
  id String @id @default(cuid())
  projectId String
  status String
  deltaAmountMinor Int
  reason String
}
model CostLedgerEntry {
  id String @id @default(cuid())
  projectId String
  costCode String
  sourceType String
  sourceId String
  amountMinor Int
  at DateTime @default(now())
  @@index([projectId, costCode])
}
```

---

## 7. REST API

- Projects/sites/members  
- BOQ + budget versions approve  
- Materials, GRN, requisitions, issues  
- Attendance bulk + wage runs  
- Work orders + contractor bills approve/pay  
- Progress entries + photos  
- `GET /reports/budget-vs-actual`  
- `GET /reports/material-register`  
- Contractor portal limited routes  

---

## 8. Real-time

Optional: PM dashboard stock/requisition alerts via Socket.IO.

---

## 9. Jobs

- Budget variance digest daily  
- Retention release reminders  
- Wage period generate draft  
- Overdue requisition escalations  

---

## 10. Security

- Project-scoped access via ProjectMember.  
- Contractor portal only own work orders.  
- Approval segregation PM vs Accounts.  
- Immutable cost ledger entries (reversal entries only).

---

## 11. Caching

- BOQ tree cache per project.  
- Site stock snapshot short TTL.

---

## 12. Testing

- Stock never negative without override.  
- RA bill qty cannot exceed remaining work order qty.  
- Retention/tax net math fixtures.  
- Attendance unique + wage calc OT.  
- Budget variance after material issue + bill.  
- Concurrent issues locking stock.

---

## 13. Folder Structure

```
construction-project-management/
  Project_spec.md
  frontend/  # PM + site engineer mobile-friendly + contractor portal
  backend/
```

---

## 14. Env vars

`DATABASE_URL`, `REDIS_URL`, `JWT_*`, `APP_URL`, `CORS_ORIGINS`, `S3_*`, `SMTP_URL`, `SMS_*`, `REQUISITION_APPROVAL_LIMIT_MINOR`, `BILL_APPROVAL_LIMIT_MINOR`, `VARIANCE_ALERT_BPS`, `OT_MULTIPLIER_BPS`, `ALLOW_NEGATIVE_STOCK`

---

## 15. Milestones

1. Projects/sites/users + BOQ  
2. Budget versions  
3. Material stock GRN/issue/requisition  
4. Labor attendance + wages  
5. Contractor work orders + RA bills  
6. Progress + photos  
7. Budget vs actual dashboards + harden  

---

## 16. Acceptance Criteria

- [ ] Issuing material reduces site stock and posts cost ledger.
- [ ] Contractor bill blocked when qty exceeds remaining.
- [ ] Net payable applies retention and tax correctly.
- [ ] Wage run matches attendance * rates + OT.
- [ ] Approved budget is immutable; changes need new version.
- [ ] Site engineer of project A cannot mutate project B.
- [ ] Seed: 1 project, BOQ 20 items, materials, 2 contractors, sample attendance.

---

## 17. Agent Notes

- CostLedgerEntry is source for actuals; never recompute silently without sources.  
- Mobile-first attendance UI.  
- Asia/Dhaka dates; BDT paisa integers.
