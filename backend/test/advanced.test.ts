import "reflect-metadata";
import { config } from "dotenv";
config({ quiet: true });
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Db } from "../src/db";
import { ProjectsService } from "../src/projects.service";
import { AdvancedService } from "../src/advanced/service";
import { Actor } from "../src/domain/access";
import { criticalPath, earnedValue } from "../src/advanced/planning";
import { Data } from "../src/domain/context";
import { workerPay } from "../src/domain/payroll";
test("hourly monthly and contract labor use explicit pay bases", () => {
  assert.equal(
    workerPay(
      { payBasis: "HOURLY", hourlyRateMinor: 10000 },
      [{ status: "HALF", otHours: 2, date: "2026-11-01" }],
      [],
    ).amountMinor,
    70000,
  );
  assert.equal(
    workerPay(
      { payBasis: "MONTHLY", monthlyRateMinor: 3000000 },
      [
        { status: "PRESENT", otHours: 0, date: "2026-11-01" },
        { status: "HALF", otHours: 0, date: "2026-11-02" },
      ],
      [],
    ).amountMinor,
    150000,
  );
  assert.equal(
    workerPay(
      { payBasis: "CONTRACT", unitRateMinor: 50000 },
      [],
      [{ quantity: 3, totalMinor: 150000 }],
    ).amountMinor,
    150000,
  );
});
test("critical path computes parallel float and rejects cycles", () => {
  const a = {
      id: "a",
      status: "BACKLOG",
      data: { startsOn: "2026-01-01", endsOn: "2026-01-02", dependencies: [] },
    },
    b = {
      id: "b",
      status: "BACKLOG",
      data: {
        startsOn: "2026-01-03",
        endsOn: "2026-01-05",
        dependencies: ["a"],
      },
    },
    c = {
      id: "c",
      status: "BACKLOG",
      data: {
        startsOn: "2026-01-03",
        endsOn: "2026-01-03",
        dependencies: ["a"],
      },
    };
  const result = criticalPath([a, b, c]);
  assert.equal(result.durationDays, 5);
  assert.equal(result.tasks.find((t) => t.id === "c")!.slackDays, 2);
  assert.equal(result.tasks.find((t) => t.id === "a")!.critical, true);
  assert.throws(() =>
    criticalPath([{ ...a, data: { ...a.data, dependencies: ["b"] } }, b]),
  );
});
test("earned value uses baseline dates and explicit physical completion", () => {
  const result = earnedValue(
    [
      {
        id: "t",
        status: "IN_PROGRESS",
        data: {
          startsOn: "2026-01-01",
          endsOn: "2026-01-10",
          budgetMinor: 100000,
          percent: 30,
        },
      },
    ],
    100000,
    50000,
    "2026-01-05",
  );
  assert.equal(result.planned, 50000);
  assert.equal(result.earned, 30000);
  assert.equal(result.cpi, 0.6);
  assert.equal(result.spi, 0.6);
  assert.equal(result.forecast, 166667);
  assert.equal(earnedValue([], 100, 0, "2026-01-01").forecast, null);
});
test(
  "advanced workflows are transactional, scoped and revision protected",
  { skip: !process.env.DATABASE_URL },
  async (t) => {
    const db = new Db(),
      projects = new ProjectsService(db),
      advanced = new AdvancedService(db, projects);
    const companyId = randomUUID();
    const admin: Actor = { id: randomUUID(), companyId, role: "COMPANY_ADMIN" },
      pm: Actor = { id: randomUUID(), companyId, role: "PROJECT_MANAGER" },
      accountant: Actor = { id: randomUUID(), companyId, role: "ACCOUNTANT" },
      engineer: Actor = { id: randomUUID(), companyId, role: "SITE_ENGINEER" },
      store: Actor = { id: randomUUID(), companyId, role: "STORE_KEEPER" };
    let projectId = "",
      siteId = "";
    try {
      await db.company.create({
        data: { id: companyId, name: "Advanced integration" },
      });
      for (const a of [admin, pm, accountant, engineer, store])
        await db.user.create({
          data: {
            id: a.id,
            companyId,
            name: a.role,
            email: `${a.id}@test.invalid`,
            role: a.role,
            passwordHash: "unused",
          },
        });
      const p = await projects.createProject(admin, {
        name: "Advanced build",
        code: "ADV",
        address: "Dhaka",
        startsOn: "2026-01-01",
        endsOn: "2027-12-31",
      });
      projectId = p.id;
      siteId = p.sites[0].id;
      for (const a of [pm, accountant, engineer, store])
        await db.member.create({
          data: { userId: a.id, projectId, role: a.role },
        });
      const create = (kind: string, data: Data, actor = admin) =>
        advanced.create(actor, projectId, kind, data);
      async function act(
        id: string,
        action: string,
        actor = pm,
        note = "Verified against source records",
      ) {
        const r = await db.record.findUniqueOrThrow({ where: { id } });
        return advanced.transition(actor, projectId, id, {
          action,
          expectedVersion: r.version,
          note,
        });
      }
      const supplier = await projects.create(admin, projectId, "supplier", {
        name: "Test supplier",
        phone: "01700000000",
        address: "Dhaka",
      });
      const m1 = await projects.create(admin, projectId, "material", {
          name: "Cement",
          sku: "CEM",
          unit: "bag",
          minimum: 2,
        }),
        m2 = await projects.create(admin, projectId, "material", {
          name: "Steel",
          sku: "STL",
          unit: "kg",
          minimum: 1,
        });
      let order: any, dispatch: any, bill: any;
      await t.test(
        "approval threshold matrix and originator segregation are enforced",
        async () => {
          await create("approvalrule", {
            name: "Large purchase",
            kind: "purchaseorder",
            thresholdMinor: 100000,
            requiredRole: "COMPANY_ADMIN",
            note: "",
          });
          order = await create(
            "purchaseorder",
            {
              reference: "PO-001",
              siteId,
              supplierId: supplier.id,
              expectedOn: "2026-11-10",
              note: "",
              lines: [
                {
                  materialId: m1.id,
                  quantity: 10,
                  costMinor: 10000,
                  costCode: "C",
                },
                {
                  materialId: m2.id,
                  quantity: 5,
                  costMinor: 20000,
                  costCode: "S",
                },
              ],
            },
            store,
          );
          await act(order.id, "SUBMITTED", store);
          await assert.rejects(() => act(order.id, "APPROVED", pm));
          await assert.rejects(() => act(order.id, "APPROVED", store));
          await act(order.id, "APPROVED", admin);
        },
      );
      await t.test(
        "concurrent deliveries cannot over-receive either line",
        async () => {
          const r = await db.record.findUniqueOrThrow({
            where: { id: order.id },
          });
          const lines = (r.data as any).lines.map((l: Data) => ({
            lineId: l.lineId,
            quantity: l.quantity,
          }));
          const values = await Promise.allSettled([
            create(
              "delivery",
              {
                purchaseorderId: r.id,
                invoiceNo: "INV-A",
                receivedOn: "2026-11-03",
                note: "",
                lines,
              },
              store,
            ),
            create(
              "delivery",
              {
                purchaseorderId: r.id,
                invoiceNo: "INV-B",
                receivedOn: "2026-11-03",
                note: "",
                lines,
              },
              store,
            ),
          ]);
          assert.equal(
            values.filter((v) => v.status === "fulfilled").length,
            1,
          );
          assert.equal(
            (await db.record.findUniqueOrThrow({ where: { id: r.id } })).status,
            "RECEIVED",
          );
          const stocks = await db.stock.findMany({ where: { siteId } });
          assert.equal(
            stocks.reduce((s, r) => s + Number(r.quantity), 0),
            15,
          );
        },
      );
      let request: any;
      await t.test(
        "multi-line dispatch rolls back earlier lines when a later stock line fails",
        async () => {
          request = await create(
            "materialrequest",
            {
              reference: "REQ-001",
              siteId,
              neededOn: "2026-11-03",
              note: "",
              lines: [
                {
                  materialId: m1.id,
                  quantity: 4,
                  costMinor: 10000,
                  costCode: "C",
                },
                {
                  materialId: m2.id,
                  quantity: 8,
                  costMinor: 20000,
                  costCode: "S",
                },
              ],
            },
            engineer,
          );
          await act(request.id, "SUBMITTED", engineer);
          await act(request.id, "APPROVED", pm);
          const rows = (request.data as any).lines;
          await assert.rejects(() =>
            create(
              "dispatch",
              {
                requestId: request.id,
                note: "",
                lines: rows.map((l: Data) => ({
                  lineId: l.lineId,
                  quantity: l.quantity,
                })),
              },
              store,
            ),
          );
          const stock = await db.stock.findUniqueOrThrow({
            where: { siteId_materialId: { siteId, materialId: m1.id } },
          });
          assert.equal(Number(stock.quantity), 10);
          assert.equal(await db.ledger.count({ where: { projectId } }), 0);
          dispatch = await create(
            "dispatch",
            {
              requestId: request.id,
              note: "",
              lines: rows.map((l: Data) => ({ lineId: l.lineId, quantity: 2 })),
            },
            store,
          );
          assert.equal(
            (await db.record.findUniqueOrThrow({ where: { id: request.id } }))
              .status,
            "PARTIAL_ISSUED",
          );
          assert.equal(await db.ledger.count({ where: { projectId } }), 2);
        },
      );
      await t.test(
        "batch returns reverse original line costs and block excess quantity",
        async () => {
          const line = (dispatch.data as any).lines[0];
          await create(
            "batchreturn",
            {
              dispatchId: dispatch.id,
              note: "Unused",
              lines: [{ lineId: line.lineId, quantity: 1 }],
            },
            store,
          );
          assert.equal(
            (
              await db.ledger.aggregate({
                where: { projectId },
                _sum: { amountMinor: true },
              })
            )._sum.amountMinor,
            50000,
          );
          await assert.rejects(() =>
            create(
              "batchreturn",
              {
                dispatchId: dispatch.id,
                note: "",
                lines: [{ lineId: line.lineId, quantity: 2 }],
              },
              store,
            ),
          );
        },
      );
      let contract: any;
      await t.test(
        "multi-BOQ measurement bills reserve quantities and calculate aggregate deductions",
        async () => {
          const contractor = await projects.create(
            admin,
            projectId,
            "contractor",
            { name: "Contractor", phone: "01700000000", trade: "Civil" },
          );
          const boq1 = await projects.create(admin, projectId, "boq", {
              code: "B1",
              description: "Concrete",
              unit: "m3",
              quantity: 100,
              rateMinor: 100000,
              costCode: "C",
            }),
            boq2 = await projects.create(admin, projectId, "boq", {
              code: "B2",
              description: "Steel fixing",
              unit: "kg",
              quantity: 100,
              rateMinor: 200000,
              costCode: "S",
            });
          contract = await create("contractpackage", {
            reference: "WO-001",
            title: "Structure",
            contractorId: contractor.id,
            retentionBps: 500,
            taxBps: 300,
            advanceLimitMinor: 50000,
            defectsUntil: "2020-01-01",
            note: "",
            lines: [
              {
                boqId: boq1.id,
                quantity: 10,
                rateMinor: 100000,
                costCode: "C",
              },
              {
                boqId: boq2.id,
                quantity: 10,
                rateMinor: 200000,
                costCode: "S",
              },
            ],
          });
          await act(contract.id, "SUBMITTED", admin);
          await act(contract.id, "APPROVED", pm);
          const lines = (contract.data as any).lines;
          bill = await create(
            "measurementbill",
            {
              contractpackageId: contract.id,
              reference: "RA-001",
              measuredOn: "2026-11-03",
              advanceMinor: 10000,
              penaltyMinor: 10000,
              note: "",
              lines: lines.map((l: Data) => ({
                lineId: l.lineId,
                quantity: 4,
              })),
            },
            accountant,
          );
          assert.equal((bill.data as any).gross, 1200000);
          assert.equal((bill.data as any).retention, 60000);
          assert.equal((bill.data as any).net, 1084000);
          await assert.rejects(() =>
            create(
              "measurementbill",
              {
                contractpackageId: contract.id,
                reference: "RA-002",
                measuredOn: "2026-11-03",
                advanceMinor: 0,
                penaltyMinor: 0,
                note: "",
                lines: [{ lineId: lines[0].lineId, quantity: 7 }],
              },
              accountant,
            ),
          );
        },
      );
      await t.test(
        "certification posts each cost code once and prevents stale approval",
        async () => {
          await act(bill.id, "SUBMITTED", accountant);
          const submitted = await db.record.findUniqueOrThrow({
            where: { id: bill.id },
          });
          await act(bill.id, "PM_APPROVED", pm);
          await assert.rejects(() =>
            advanced.transition(pm, projectId, bill.id, {
              action: "PM_APPROVED",
              expectedVersion: submitted.version,
              note: "",
            }),
          );
          await assert.rejects(() =>
            act(bill.id, "ACCOUNTS_APPROVED", accountant),
          );
          const other: Actor = {
            id: randomUUID(),
            companyId,
            role: "ACCOUNTANT",
          };
          await db.user.create({
            data: {
              ...other,
              name: "Second accountant",
              email: `${other.id}@test.invalid`,
              passwordHash: "unused",
            },
          });
          await db.member.create({
            data: { projectId, userId: other.id, role: other.role },
          });
          await act(bill.id, "ACCOUNTS_APPROVED", other);
          assert.equal(
            await db.ledger.count({
              where: { projectId, sourceType: "MEASURED_CONTRACT_COST" },
            }),
            2,
          );
        },
      );
      await t.test(
        "partial settlements prevent overpayment and release retention only once",
        async () => {
          await create(
            "payment",
            {
              billId: bill.id,
              reference: "PAY-001",
              date: "2026-11-03",
              amountMinor: 500000,
              method: "BANK",
              note: "",
            },
            accountant,
          );
          assert.equal(
            (await db.record.findUniqueOrThrow({ where: { id: bill.id } }))
              .status,
            "PARTIALLY_PAID",
          );
          await assert.rejects(() =>
            create(
              "payment",
              {
                billId: bill.id,
                reference: "PAY-OVER",
                date: "2026-11-03",
                amountMinor: 600000,
                method: "BANK",
                note: "",
              },
              accountant,
            ),
          );
          await create(
            "payment",
            {
              billId: bill.id,
              reference: "PAY-002",
              date: "2026-11-03",
              amountMinor: 584000,
              method: "BANK",
              note: "",
            },
            accountant,
          );
          await create(
            "retentionpayment",
            {
              billId: bill.id,
              reference: "RET-001",
              date: "2026-11-03",
              note: "",
            },
            accountant,
          );
          await assert.rejects(() =>
            create(
              "retentionpayment",
              {
                billId: bill.id,
                reference: "RET-002",
                date: "2026-11-03",
                note: "",
              },
              accountant,
            ),
          );
        },
      );
      await t.test(
        "full budget revision locks baseline and rejects concurrent stale revision approval",
        async () => {
          const b = await create("budgetrelease", {
            name: "Baseline",
            reason: "Initial",
            previousId: "",
            lines: [
              { costCode: "C", amountMinor: 2000000 },
              { costCode: "S", amountMinor: 3000000 },
            ],
          });
          await act(b.id, "SUBMITTED", admin);
          await act(b.id, "APPROVED", pm);
          await assert.rejects(() =>
            advanced.edit(admin, projectId, b.id, {
              expectedVersion: 3,
              name: "Bad",
              reason: "x",
              previousId: "",
              lines: [{ costCode: "C", amountMinor: 1 }],
            }),
          );
          const revisions = [];
          for (let i = 0; i < 2; i++)
            revisions.push(
              await create("budgetrelease", {
                name: `R${i}`,
                reason: "Change",
                previousId: b.id,
                lines: [{ costCode: "C", amountMinor: 2500000 }],
              }),
            );
          for (const r of revisions) await act(r.id, "SUBMITTED", admin);
          await act(revisions[0].id, "APPROVED", pm);
          await assert.rejects(() => act(revisions[1].id, "APPROVED", pm));
          assert.equal(
            (await advanced.analytics(admin, projectId)).evm.budget,
            2500000,
          );
        },
      );
      await t.test(
        "task cycles, predecessor completion and optimistic edits are enforced",
        async () => {
          const taskData = {
            code: "T1",
            title: "Foundation",
            startsOn: "2026-01-01",
            endsOn: "2026-01-05",
            ownerId: engineer.id,
            parentId: "",
            dependencies: [],
            budgetMinor: 1000000,
            percent: 0,
            priority: "HIGH",
            note: "",
          };
          const first = await create("task", taskData, engineer),
            second = await create(
              "task",
              {
                ...taskData,
                code: "T2",
                title: "Columns",
                dependencies: [first.id],
              },
              engineer,
            );
          await assert.rejects(() =>
            advanced.edit(engineer, projectId, first.id, {
              ...taskData,
              expectedVersion: first.version,
              dependencies: [second.id],
            }),
          );
          await act(second.id, "IN_PROGRESS", engineer);
          await assert.rejects(() => act(second.id, "DONE", engineer));
          await act(first.id, "IN_PROGRESS", engineer);
          await act(first.id, "DONE", engineer);
          await act(second.id, "DONE", engineer);
          assert.equal(
            (await advanced.analytics(admin, projectId)).criticalPath
              .durationDays,
            10,
          );
        },
      );
      await t.test(
        "RFI answer and notification read state are durable and per user",
        async () => {
          const rfi = await create(
            "rfi",
            {
              reference: "RFI-1",
              title: "Cover detail",
              question: "Confirm concrete cover",
              assignedTo: pm.id,
              dueOn: "2026-11-10",
              priority: "HIGH",
              note: "",
            },
            engineer,
          );
          await assert.rejects(() => act(rfi.id, "ANSWERED", engineer, "40mm"));
          await act(rfi.id, "ANSWERED", pm, "40 mm as approved drawing");
          const r = await db.record.findUniqueOrThrow({
            where: { id: rfi.id },
          });
          assert.equal((r.data as any).answer, "40 mm as approved drawing");
          const n = await db.record.findFirstOrThrow({
            where: { projectId, kind: "notification" },
          });
          await advanced.markRead(engineer, projectId, n.id);
          const notification = await db.record.findUniqueOrThrow({
            where: { id: n.id },
          });
          assert.deepEqual((notification.data as any).readBy, [engineer.id]);
        },
      );
      await t.test(
        "equipment costs post only after independent approval",
        async () => {
          const asset = await create(
            "equipment",
            {
              code: "EQ-1",
              name: "Mixer",
              type: "MIXER",
              hourlyRateMinor: 10000,
              fuelRateMinor: 1000,
              note: "",
            },
            store,
          );
          const log = await create(
            "equipmentlog",
            {
              equipmentId: asset.id,
              siteId,
              date: "2026-11-03",
              hours: 8,
              fuelLitres: 10,
              costCode: "C",
              note: "",
            },
            engineer,
          );
          assert.equal((log.data as any).totalMinor, 90000);
          await act(log.id, "SUBMITTED", engineer);
          await act(log.id, "APPROVED", pm);
          await assert.rejects(() => act(log.id, "APPROVED", pm));
          assert.equal(
            await db.ledger.count({ where: { projectId, sourceId: log.id } }),
            1,
          );
        },
      );
      await t.test(
        "certified piecework enters payroll once and locks subsequent work in the period",
        async () => {
          const worker = await projects.create(admin, projectId, "worker", {
            name: "Pieceworker",
            trade: "Mason",
            dailyRateMinor: 0,
            payBasis: "CONTRACT",
            unitRateMinor: 50000,
            gang: "A",
            phone: "",
          });
          const log = await create(
            "worklog",
            {
              reference: "LAB-001",
              workerId: worker.id,
              siteId,
              date: "2026-11-15",
              quantity: 3,
              description: "Measured brickwork units",
              note: "",
            },
            engineer,
          );
          await assert.rejects(() =>
            projects.create(admin, projectId, "wage", {
              name: "Uncertified",
              siteId,
              periodStart: "2026-11-15",
              periodEnd: "2026-11-15",
              costCode: "LABOR",
            }),
          );
          await act(log.id, "SUBMITTED", engineer);
          await act(log.id, "APPROVED", pm);
          const run = await projects.create(admin, projectId, "wage", {
            name: "Certified piecework",
            siteId,
            periodStart: "2026-11-15",
            periodEnd: "2026-11-15",
            costCode: "LABOR",
          });
          assert.equal((run.data as Data).amountMinor, 150000);
          await assert.rejects(() =>
            create(
              "worklog",
              {
                reference: "LAB-002",
                workerId: worker.id,
                siteId,
                date: "2026-11-15",
                quantity: 1,
                description: "Late work",
                note: "",
              },
              engineer,
            ),
          );
        },
      );
      await t.test(
        "approved schedule baseline freezes financial weights while physical progress remains live",
        async () => {
          const b = await create("schedulebaseline", {
            name: "B1",
            reason: "Approved original plan",
          });
          await act(b.id, "SUBMITTED", admin);
          await act(b.id, "APPROVED", pm);
          const before = await advanced.analytics(admin, projectId);
          const task = await db.record.findFirstOrThrow({
            where: { projectId, kind: "task" },
          });
          await act(task.id, "IN_PROGRESS", engineer);
          const d = task.data as Data;
          await advanced.edit(engineer, projectId, task.id, {
            code: d.code,
            title: d.title,
            startsOn: "2026-03-01",
            endsOn: "2026-04-01",
            ownerId: d.ownerId,
            parentId: d.parentId,
            dependencies: d.dependencies,
            budgetMinor: 100,
            percent: 25,
            priority: d.priority,
            note: d.note,
            expectedVersion: (
              await db.record.findUniqueOrThrow({ where: { id: task.id } })
            ).version,
          });
          const after = await advanced.analytics(admin, projectId);
          assert.equal(after.evm.planned, before.evm.planned);
          assert.ok(after.evm.earned >= 250000);
          assert.equal(after.baselineName, "B1");
          assert.equal(
            after.timeSeries.filter((p) => p.actual !== null).at(-1)?.actual,
            after.evm.actual,
          );
          await assert.rejects(() =>
            advanced.edit(admin, projectId, b.id, {
              name: "Forbidden",
              reason: "x",
              expectedVersion: 3,
            }),
          );
        },
      );
      await t.test(
        "advanced routes cannot mutate legacy approvals or other projects",
        async () => {
          const budget = await projects.create(admin, projectId, "budget", {
            name: "Legacy draft",
            amountMinor: 1,
            costCode: "X",
            note: "",
          });
          await assert.rejects(() =>
            advanced.transition(pm, projectId, budget.id, {
              action: "SUBMITTED",
              expectedVersion: budget.version,
              note: "",
            }),
          );
          const other = await projects.createProject(admin, {
            name: "Other",
            code: "OTHER",
            address: "Dhaka",
            startsOn: "2026-01-01",
            endsOn: "2027-01-01",
          });
          await assert.rejects(() =>
            advanced.create(engineer, other.id, "dailyreport", {
              siteId,
              date: "2026-11-03",
              weather: "CLEAR",
              workSummary: "x",
              workersCount: 1,
              equipmentHours: 0,
              safetyIncidents: 0,
              delays: "",
              note: "",
            }),
          );
        },
      );
    } finally {
      const ids = (
        await db.project.findMany({
          where: { companyId },
          select: { id: true },
        })
      ).map((p) => p.id);
      await db.audit.deleteMany({ where: { projectId: { in: ids } } });
      await db.ledger.deleteMany({ where: { projectId: { in: ids } } });
      await db.stock.deleteMany({
        where: { site: { projectId: { in: ids } } },
      });
      await db.record.deleteMany({ where: { projectId: { in: ids } } });
      await db.member.deleteMany({ where: { projectId: { in: ids } } });
      await db.site.deleteMany({ where: { projectId: { in: ids } } });
      await db.project.deleteMany({ where: { companyId } });
      await db.user.deleteMany({ where: { companyId } });
      await db.company.deleteMany({ where: { id: companyId } });
      await db.$disconnect();
    }
  },
);
