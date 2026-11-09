import "reflect-metadata";
import { config } from "dotenv";
config({ quiet: true });
import { Db } from "../src/db";
import { ProjectsService } from "../src/projects.service";
import { AdvancedService } from "../src/advanced/service";
import { Actor } from "../src/domain/access";
import { Data } from "../src/domain/context";
const db = new Db(),
  projects = new ProjectsService(db),
  advanced = new AdvancedService(db, projects);
const projectId = "project-greenwood",
  siteId = "site-main";
const actor = (id: string, role: string): Actor => ({
  id: `user-${id}`,
  companyId: "company-sitecraft",
  role,
  ...(role === "CONTRACTOR" ? { contractorId: "contractor-1" } : {}),
});
const admin = actor("admin", "COMPANY_ADMIN"),
  pm = actor("pm", "PROJECT_MANAGER"),
  engineer = actor("engineer", "SITE_ENGINEER"),
  store = actor("store", "STORE_KEEPER"),
  accounts = actor("accounts", "ACCOUNTANT"),
  contractor = actor("contractor", "CONTRACTOR");
const today = "2026-11-09";
async function ensure(kind: string, data: Data, by = admin) {
  const field = data.reference
    ? "reference"
    : data.code
      ? "code"
      : data.name
        ? "name"
        : data.title
          ? "title"
          : null;
  const existing = await db.record.findFirst({
    where: {
      projectId,
      kind,
      ...(field
        ? { data: { path: [field], equals: data[field] } }
        : { key: `${data.siteId}:${data.date}` }),
    },
  });
  return existing || advanced.create(by, projectId, kind, data);
}
async function transition(id: string, status: string, by: Actor) {
  const r = await db.record.findUniqueOrThrow({ where: { id } });
  if (r.status === status) return r;
  return advanced.transition(by, projectId, id, {
    action: status,
    expectedVersion: r.version,
    note: "Verified demonstration workflow",
  });
}
async function approve(kind: string, data: Data, by = admin) {
  let r = await ensure(kind, data, by);
  if (r.status === "DRAFT") r = await transition(r.id, "SUBMITTED", by);
  if (r.status === "SUBMITTED")
    r = await transition(r.id, "APPROVED", by.id === pm.id ? admin : pm);
  return r;
}
async function ensureSchedule() {
  if (
    !(await db.record.findFirst({
      where: { projectId, kind: "schedulebaseline", status: "APPROVED" },
    }))
  )
    await approve("schedulebaseline", {
      name: "Delivery baseline V1",
      reason:
        "Initial dependency schedule and cost weights for earned-value reporting.",
    });
}
async function main() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PRODUCTION_SEED !== "true"
  )
    throw new Error("Explicit production seed approval required");
  const company = await db.company.findUnique({
    where: { id: "company-sitecraft" },
  });
  if (company?.name !== "Sitecraft Synthetic Demonstration Ltd.")
    throw new Error(
      "Synthetic tenant provenance missing; refusing to modify operational data",
    );
  if (!(await db.project.findUnique({ where: { id: projectId } })))
    throw new Error("Run the base seed first");
  if (
    await db.record.findFirst({
      where: { projectId, kind: "system", key: "advanced-demo-v1" },
    })
  ) {
    console.log(
      "Advanced demonstration already exists; operational records preserved.",
    );
    return;
  }
  const heads = [
    ["CIVIL", 180000000],
    ["CONCRETE", 320000000],
    ["STEEL", 240000000],
    ["MASONRY", 95000000],
    ["FINISHING", 140000000],
    ["MEP", 120000000],
    ["LABOR", 90000000],
  ] as const;
  const current = await db.record.findFirst({
    where: { projectId, kind: "budgetrelease", status: "APPROVED" },
  });
  if (!current)
    await approve("budgetrelease", {
      name: "Approved project baseline · V1",
      reason:
        "Consolidate the approved cost heads into a single project financial baseline.",
      previousId: "",
      lines: heads.map(([costCode, amountMinor]) => ({
        costCode,
        amountMinor,
      })),
    });
  await ensure("approvalrule", {
    name: "Company sign-off for commitments above BDT 500,000",
    kind: "purchaseorder",
    thresholdMinor: 50000000,
    requiredRole: "COMPANY_ADMIN",
    note: "Higher-value orders require company authorization.",
  });
  const po = await ensure(
    "purchaseorder",
    {
      reference: "PO-GWR-026",
      siteId,
      supplierId: "supplier-1",
      expectedOn: today,
      note: "Replenishment for the next slab pour.",
      lines: [
        {
          materialId: "material-1",
          quantity: 120,
          costMinor: 58000,
          costCode: "CONCRETE",
        },
        {
          materialId: "material-3",
          quantity: 35,
          costMinor: 220000,
          costCode: "CONCRETE",
        },
      ],
    },
    store,
  );
  if (po.status === "DRAFT") await transition(po.id, "SUBMITTED", store);
  const req = await approve(
    "materialrequest",
    {
      reference: "MR-GWR-014",
      siteId,
      neededOn: today,
      note: "Column and slab package, two materials and separate cost heads.",
      lines: [
        {
          materialId: "material-1",
          quantity: 45,
          costMinor: 58000,
          costCode: "CONCRETE",
        },
        {
          materialId: "material-2",
          quantity: 1,
          costMinor: 9400000,
          costCode: "STEEL",
        },
      ],
    },
    engineer,
  );
  const pkg = await approve("contractpackage", {
    reference: "WO-GWR-STRUCT-02",
    title: "Superstructure concrete package",
    contractorId: "contractor-1",
    retentionBps: 500,
    taxBps: 300,
    advanceLimitMinor: 10000000,
    defectsUntil: "2028-06-30",
    note: "Measured against the approved ground floor BOQ items.",
    lines: [
      { boqId: "boq-8", quantity: 60, rateMinor: 650000, costCode: "CONCRETE" },
      { boqId: "boq-9", quantity: 80, rateMinor: 720000, costCode: "CONCRETE" },
    ],
  });
  let bill = await ensure(
    "measurementbill",
    {
      contractpackageId: pkg.id,
      reference: "RA-GWR-STRUCT-001",
      measuredOn: today,
      advanceMinor: 0,
      penaltyMinor: 0,
      note: "Joint measurement recorded and certified.",
      lines: (pkg.data as Data).lines.map((l: Data, i: number) => ({
        lineId: l.lineId,
        quantity: i ? 15 : 20,
      })),
    },
    contractor,
  );
  if (bill.status === "DRAFT")
    bill = await transition(bill.id, "SUBMITTED", contractor);
  if (bill.status === "SUBMITTED")
    bill = await transition(bill.id, "PM_APPROVED", pm);
  if (bill.status === "PM_APPROVED")
    bill = await transition(bill.id, "ACCOUNTS_APPROVED", accounts);
  await ensure(
    "payment",
    {
      billId: bill.id,
      reference: "PAY-GWR-2026-001",
      date: today,
      amountMinor: 10000000,
      method: "BANK",
      note: "Part settlement against the certified RA bill.",
    },
    accounts,
  );
  const tasks = [
    [
      "WBS-01",
      "Site preparation",
      "2026-01-15",
      "2026-02-05",
      30000000,
      100,
      [],
    ],
    [
      "WBS-02",
      "Excavation and shoring",
      "2026-02-06",
      "2026-03-15",
      80000000,
      100,
      [0],
    ],
    [
      "WBS-03",
      "Ground improvement and drainage",
      "2026-03-16",
      "2026-04-30",
      70000000,
      100,
      [1],
    ],
    [
      "WBS-04",
      "Foundation reinforcement",
      "2026-05-01",
      "2026-06-30",
      240000000,
      100,
      [2],
    ],
    [
      "WBS-05",
      "Footing concrete and curing",
      "2026-07-01",
      "2026-07-31",
      80000000,
      100,
      [3],
    ],
    [
      "WBS-06",
      "Ground floor structure",
      "2026-08-01",
      "2026-11-30",
      110000000,
      65,
      [4],
    ],
    [
      "WBS-07",
      "Upper floor slabs",
      "2026-12-01",
      "2027-02-28",
      130000000,
      0,
      [5],
    ],
    [
      "WBS-08",
      "Masonry and partitions",
      "2027-01-10",
      "2027-03-31",
      95000000,
      0,
      [5],
    ],
    [
      "WBS-09",
      "MEP installation",
      "2027-02-01",
      "2027-05-15",
      120000000,
      0,
      [6, 7],
    ],
    [
      "WBS-10",
      "Finishes and handover",
      "2027-04-01",
      "2027-06-30",
      140000000,
      0,
      [8],
    ],
    [
      "WBS-11",
      "Site labor and logistics",
      "2026-01-15",
      "2027-06-30",
      90000000,
      40,
      [],
    ],
  ] as const;
  const ids: string[] = [];
  for (const [
    code,
    title,
    startsOn,
    endsOn,
    budgetMinor,
    percent,
    deps,
  ] of tasks) {
    let task = await ensure(
      "task",
      {
        code,
        title,
        startsOn,
        endsOn,
        budgetMinor,
        percent: 0,
        ownerId: engineer.id,
        parentId: "",
        dependencies: deps.map((i) => ids[i]),
        priority: code === "WBS-06" ? "CRITICAL" : "MEDIUM",
        note: "Baseline schedule linked to the project cost plan.",
      },
      engineer,
    );
    ids.push(task.id);
    if (percent > 0 && task.status === "BACKLOG")
      task = await transition(task.id, "IN_PROGRESS", engineer);
    if (percent === 100 && task.status !== "DONE")
      await transition(task.id, "DONE", engineer);
    else if (
      percent > 0 &&
      percent < 100 &&
      task.status === "IN_PROGRESS" &&
      (task.data as Data).percent !== percent
    ) {
      const d = task.data as Data;
      const { lastDecisionNote, ...input } = d;
      await advanced.edit(engineer, projectId, task.id, {
        ...input,
        percent,
        expectedVersion: task.version,
      });
    }
  }
  await ensureSchedule();
  for (const [title, category, probability, impact, mitigation] of [
    [
      "Reinforcement supply lead time",
      "SUPPLY",
      4,
      4,
      "Confirm rolling delivery slots and maintain a two-week buffer.",
    ],
    [
      "Unplanned rain during concrete pours",
      "SCHEDULE",
      3,
      4,
      "Prepare covered stockpiles and agree alternate pour windows.",
    ],
    [
      "Unresolved service opening detail",
      "QUALITY",
      3,
      3,
      "Close the design RFI before the slab reinforcement inspection.",
    ],
  ] as const)
    await ensure(
      "risk",
      {
        title,
        category,
        probability,
        impact,
        ownerId: pm.id,
        dueOn: today,
        mitigation,
        note: "",
      },
      engineer,
    );
  await ensure(
    "rfi",
    {
      reference: "RFI-GWR-017",
      title: "Confirm service opening at grid C4",
      question:
        "Please confirm the opening size and additional reinforcement detail before the next slab pour.",
      assignedTo: pm.id,
      dueOn: today,
      priority: "HIGH",
      note: "Coordinate structural and MEP drawings.",
    },
    engineer,
  );
  await ensure(
    "dailyreport",
    {
      siteId,
      date: today,
      weather: "CLEAR",
      workSummary:
        "Column reinforcement inspection completed; slab formwork and material staging continued.",
      workersCount: 38,
      equipmentHours: 12,
      safetyIncidents: 0,
      delays: "Waiting for the C4 service opening detail.",
      note: "Morning toolbox talk completed.",
    },
    engineer,
  );
  const asset = await ensure(
    "equipment",
    {
      code: "EQ-GWR-CR-01",
      name: "Tower crane · TC-01",
      type: "CRANE",
      hourlyRateMinor: 180000,
      fuelRateMinor: 12000,
      note: "Hired plant, daily operator inspection required.",
    },
    store,
  );
  await approve(
    "equipmentlog",
    {
      equipmentId: asset.id,
      siteId,
      date: today,
      hours: 8,
      fuelLitres: 35,
      costCode: "CIVIL",
      note: "Rebar and formwork lifting operations.",
    },
    engineer,
  );
  await db.record.create({
    data: {
      projectId,
      kind: "system",
      key: "advanced-demo-v1",
      status: "POSTED",
      createdBy: admin.id,
      data: { version: 1 },
    },
  });
  console.log(
    "Advanced seed ready: 11 linked tasks, full budget, procurement, measured contracts, payments, risks, RFI, diary and equipment.",
  );
}
main()
  .catch((e) => {
    console.error(
      "Seed failed:",
      e instanceof Error ? e.constructor.name : "Unknown",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
