import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env"), quiet: true });
config({ path: resolve(process.cwd(), "../.env"), quiet: true });
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { randomBytes } from "node:crypto";
const db = new PrismaClient();
async function main() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_PRODUCTION_SEED !== "true"
  )
    throw new Error("Explicit production seed approval required");
  const password = process.env.SEED_PASSWORD;
  if (
    !password ||
    password.length < 12 ||
    Buffer.byteLength(password, "utf8") > 72
  )
    throw new Error("SEED_PASSWORD must contain at least 12 characters");
  if (await db.company.findUnique({ where: { id: "company-sitecraft" } })) {
    console.log("Seed company already exists; data preserved.");
    return;
  }
  await db.$transaction(
    async (tx) => {
      const companyId = "company-sitecraft",
        projectId = "project-greenwood",
        siteId = "site-main";
      await tx.company.create({
        data: { id: companyId, name: "Sitecraft Synthetic Demonstration Ltd." },
      });
      const passwordHash = await hash(
        process.env.NODE_ENV === "production"
          ? randomBytes(48).toString("base64url")
          : password,
        12,
      );
      const users = [
        ["admin", "Amitav Roy Chowdhury", "COMPANY_ADMIN"],
        ["pm", "Nadia Rahman", "PROJECT_MANAGER"],
        ["engineer", "Farhan Ahmed", "SITE_ENGINEER"],
        ["store", "Rafiq Hasan", "STORE_KEEPER"],
        ["accounts", "Samira Islam", "ACCOUNTANT"],
        ["supervisor", "Kamal Uddin", "LABOR_SUPERVISOR"],
        ["contractor", "Rahim Enterprise", "CONTRACTOR"],
      ];
      for (const [id, name, role] of users)
        await tx.user.create({
          data: {
            id: `user-${id}`,
            companyId,
            name,
            email: `${id}@sitecraft.local`,
            passwordHash,
            role,
            ...(role === "CONTRACTOR" ? { contractorId: "contractor-1" } : {}),
          },
        });
      await tx.project.create({
        data: {
          id: projectId,
          companyId,
          name: "Greenwood Residence",
          code: "GWR-2026",
          address: "Bashundhara R/A, Dhaka",
          status: "ACTIVE",
          startsOn: "2026-01-15",
          endsOn: "2027-06-30",
          sites: {
            create: [
              {
                id: siteId,
                name: "Main building",
                address: "Block G, Bashundhara, Dhaka",
              },
              {
                id: "site-annex",
                name: "Annex & utilities",
                address: "Block G, east access road",
              },
            ],
          },
        },
      });
      for (const [id, , role] of users)
        await tx.member.create({
          data: { projectId, userId: `user-${id}`, role },
        });
      const add = (
        id: string,
        kind: string,
        data: any,
        status = "POSTED",
        createdBy = "user-admin",
      ) =>
        tx.record.create({
          data: { id, projectId, kind, key: id, data, status, createdBy },
        });
      const names = [
        "Site preparation & setting out",
        "Earth excavation",
        "Sand filling & compaction",
        "PCC foundation bed",
        "RCC footing concrete",
        "Foundation reinforcement",
        "Foundation formwork",
        "Ground floor columns",
        "Ground floor slab",
        "First floor columns",
        "First floor slab",
        "Brick masonry — exterior",
        "Brick masonry — interior",
        "Internal plastering",
        "External plastering",
        "Electrical conduits",
        "Plumbing & drainage",
        "Floor tiling",
        "Doors & windows",
        "Painting & finishes",
      ];
      const codes = [
        "CIVIL",
        "CIVIL",
        "CIVIL",
        "CONCRETE",
        "CONCRETE",
        "STEEL",
        "FORMWORK",
        "CONCRETE",
        "CONCRETE",
        "CONCRETE",
        "CONCRETE",
        "MASONRY",
        "MASONRY",
        "FINISHING",
        "FINISHING",
        "MEP",
        "MEP",
        "FINISHING",
        "FINISHING",
        "FINISHING",
      ];
      for (let i = 0; i < 20; i++)
        await add(`boq-${i + 1}`, "boq", {
          code: `BOQ-${String(i + 1).padStart(3, "0")}`,
          description: names[i],
          unit: i === 5 ? "ton" : "m³",
          quantity: 100 + i * 10,
          rateMinor: 150000 + i * 20000,
          costCode: codes[i],
        });
      const heads = [
        ["CIVIL", 180000000],
        ["CONCRETE", 320000000],
        ["STEEL", 240000000],
        ["MASONRY", 95000000],
        ["FINISHING", 140000000],
        ["MEP", 120000000],
        ["LABOR", 90000000],
      ] as const;
      for (const [code, amount] of heads)
        await add(
          `budget-${code}`,
          "budget",
          {
            name: `Baseline ${code.toLowerCase()}`,
            costCode: code,
            amountMinor: amount,
            versionNumber: 1,
            note: "Approved project baseline",
          },
          "APPROVED",
          "user-pm",
        );
      await add("supplier-1", "supplier", {
        name: "Shah Cement Industries",
        phone: "+8801711223344",
        address: "Dhaka",
      });
      await add("supplier-2", "supplier", {
        name: "BSRM Steel",
        phone: "+8801811223344",
        address: "Chattogram",
      });
      const materialData = [
        ["CEM-001", "Portland composite cement", "bag", 100, 58000, 420],
        ["STL-016", "16mm reinforcement bar", "ton", 2, 9400000, 8.5],
        ["SND-001", "Sylhet sand", "m³", 20, 220000, 92],
        ["BRK-001", "First class bricks", "piece", 2000, 1250, 1500],
        ["AGG-020", "20mm stone chips", "m³", 15, 360000, 48],
      ] as const;
      for (let i = 0; i < materialData.length; i++) {
        const [sku, name, unit, minimum, cost, quantity] = materialData[i];
        await add(`material-${i + 1}`, "material", {
          sku,
          name,
          unit,
          minimum,
        });
        await tx.stock.create({
          data: {
            siteId,
            materialId: `material-${i + 1}`,
            quantity,
            averageCostMinor: cost,
          },
        });
        await add(`receipt-${i + 1}`, "receipt", {
          siteId,
          materialId: `material-${i + 1}`,
          supplierId: i === 1 ? "supplier-2" : "supplier-1",
          invoiceNo: `INV-2026-${i + 1}`,
          quantity,
          costMinor: cost,
        });
      }
      await add("contractor-1", "contractor", {
        name: "Rahim Enterprise",
        phone: "+8801712345678",
        trade: "Structural concrete",
      });
      await add("contractor-2", "contractor", {
        name: "Dhaka MEP Solutions",
        phone: "+8801812345678",
        trade: "Electrical & plumbing",
      });
      await add("workorder-1", "workorder", {
        title: "Foundation concrete package",
        contractorId: "contractor-1",
        boqId: "boq-5",
        quantity: 140,
        rateMinor: 250000,
        retentionBps: 500,
        taxBps: 300,
        costCode: "CONCRETE",
        defectsUntil: "2028-06-30",
      });
      await add(
        "bill-1",
        "bill",
        {
          workorderId: "workorder-1",
          billNo: "RA-001",
          contractorId: "contractor-1",
          quantity: 30,
          gross: 7500000,
          retention: 375000,
          tax: 225000,
          advance: 0,
          penalty: 0,
          net: 6900000,
          costCode: "CONCRETE",
          defectsUntil: "2028-06-30",
          pmApprovedBy: "user-pm",
        },
        "ACCOUNTS_APPROVED",
        "user-contractor",
      );
      await tx.ledger.create({
        data: {
          projectId,
          costCode: "CONCRETE",
          sourceType: "CONTRACTOR_BILL",
          sourceId: "bill-1",
          amountMinor: 7500000,
        },
      });
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Dhaka",
      }).format(new Date());
      const workers = [
        ["Abdul Karim", "Mason", 95000],
        ["Jamal Hossain", "Steel fixer", 110000],
        ["Shahidul Islam", "Carpenter", 100000],
        ["Rasel Mia", "General labor", 70000],
        ["Mohammad Ali", "Mason", 95000],
        ["Babul Akter", "Electrician", 120000],
      ] as const;
      for (let i = 0; i < workers.length; i++) {
        const [name, trade, rate] = workers[i];
        await add(`worker-${i + 1}`, "worker", {
          name,
          trade,
          dailyRateMinor: rate,
          phone: `0170000000${i}`,
          gang: "Foundation team",
        });
        await tx.record.create({
          data: {
            projectId,
            kind: "attendance",
            key: `${siteId}:worker-${i + 1}:${today}`,
            status: "POSTED",
            createdBy: "user-supervisor",
            data: {
              workerId: `worker-${i + 1}`,
              siteId,
              date: today,
              status: i === 5 ? "HALF" : "PRESENT",
              otHours: i < 2 ? 2 : 0,
              shift: "DAY",
            },
          },
        });
      }
      await add(
        "req-1",
        "requisition",
        {
          siteId,
          materialId: "material-1",
          quantity: 80,
          neededOn: today,
          costCode: "CONCRETE",
          note: "Ground floor slab pour",
        },
        "SUBMITTED",
        "user-engineer",
      );
      await add(
        "req-2",
        "requisition",
        {
          siteId,
          materialId: "material-2",
          quantity: 1.5,
          neededOn: today,
          costCode: "STEEL",
          note: "Column cage reinforcement",
        },
        "APPROVED",
        "user-engineer",
      );
      const percents = [100, 100, 100, 90, 65, 70, 55, 30];
      for (let i = 0; i < percents.length; i++)
        await add(`progress-${i + 1}`, "progress", {
          boqId: `boq-${i + 1}`,
          quantity: ((100 + i * 10) * percents[i]) / 100,
          percent: percents[i],
          approvedQuantity: 100 + i * 10,
          note: "Verified baseline progress from site measurement records",
          photo: "",
        });
      for (const [code, amount] of [
        ["CIVIL", 82000000],
        ["STEEL", 96000000],
        ["MASONRY", 17000000],
        ["FINISHING", 12000000],
        ["LABOR", 34500000],
      ] as const)
        await tx.ledger.create({
          data: {
            projectId,
            costCode: code,
            sourceType: "OPENING_BALANCE",
            sourceId: `opening-${code}`,
            amountMinor: amount,
          },
        });
      for (const action of [
        "project.activated",
        "budget.approved",
        "receipt.created",
        "attendance.created",
        "bill.accounts_approved",
      ])
        await tx.audit.create({
          data: {
            projectId,
            actorId: "user-admin",
            action,
            entityId: projectId,
            detail: { seed: true },
          },
        });
    },
    { timeout: 30000 },
  );
  console.log(
    process.env.NODE_ENV === "production"
      ? "Synthetic seed complete; production sample passwords are random and discarded."
      : "Synthetic seed complete. Local role passwords come from SEED_PASSWORD.",
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
