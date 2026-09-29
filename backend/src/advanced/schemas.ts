import { z } from "zod";
const text = z.string().trim().min(1).max(300),
  note = z.string().trim().max(4000).default(""),
  id = text;
const cash = z.number().int().min(0).max(2_000_000_000),
  qty = z.number().positive().max(1_000_000).multipleOf(0.001),
  date = z.iso.date();
const unique = (lines: any[], key: string) =>
  new Set(lines.map((l) => l[key])).size === lines.length;
const materials = z
  .array(
    z
      .object({
        materialId: id,
        quantity: qty,
        costMinor: cash,
        costCode: text,
      })
      .strict(),
  )
  .min(1)
  .max(100)
  .refine((l) => unique(l, "materialId"), "Each material may appear only once");
const quantities = z
  .array(z.object({ lineId: id, quantity: qty }).strict())
  .min(1)
  .max(100)
  .refine((l) => unique(l, "lineId"), "Duplicate line");
export const advancedSchemas = {
  schedulebaseline: z.object({ name: text, reason: text }).strict(),
  worklog: z
    .object({
      reference: text,
      workerId: id,
      siteId: id,
      date,
      quantity: qty,
      description: text,
      note,
    })
    .strict(),
  purchaseorder: z
    .object({
      reference: text,
      siteId: id,
      supplierId: id,
      expectedOn: date,
      note,
      lines: materials,
    })
    .strict(),
  delivery: z
    .object({
      purchaseorderId: id,
      invoiceNo: text,
      receivedOn: date,
      lines: quantities,
      note,
    })
    .strict(),
  materialrequest: z
    .object({
      reference: text,
      siteId: id,
      neededOn: date,
      note,
      lines: materials,
    })
    .strict(),
  dispatch: z.object({ requestId: id, lines: quantities, note }).strict(),
  batchreturn: z.object({ dispatchId: id, lines: quantities, note }).strict(),
  contractpackage: z
    .object({
      reference: text,
      title: text,
      contractorId: id,
      retentionBps: z.number().int().min(0).max(5000),
      taxBps: z.number().int().min(0).max(5000),
      defectsUntil: date,
      advanceLimitMinor: cash,
      note,
      lines: z
        .array(
          z
            .object({
              boqId: id,
              quantity: qty,
              rateMinor: cash,
              costCode: text,
            })
            .strict(),
        )
        .min(1)
        .max(100)
        .refine((l) => unique(l, "boqId"), "Each BOQ item may appear once"),
    })
    .strict(),
  measurementbill: z
    .object({
      contractpackageId: id,
      reference: text,
      measuredOn: date,
      advanceMinor: cash,
      penaltyMinor: cash,
      note,
      lines: quantities,
    })
    .strict(),
  budgetrelease: z
    .object({
      name: text,
      reason: text,
      previousId: z.string().default(""),
      lines: z
        .array(z.object({ costCode: text, amountMinor: cash }).strict())
        .min(1)
        .max(100)
        .refine((l) => unique(l, "costCode"), "Duplicate cost head"),
    })
    .strict(),
  task: z
    .object({
      code: text,
      title: text,
      startsOn: date,
      endsOn: date,
      ownerId: z.string().default(""),
      parentId: z.string().default(""),
      dependencies: z.array(id).max(50).default([]),
      budgetMinor: cash,
      percent: z.number().min(0).max(100).default(0),
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
      note,
    })
    .strict()
    .refine((d) => d.endsOn >= d.startsOn, "Finish must follow start"),
  risk: z
    .object({
      title: text,
      category: z.enum([
        "COST",
        "SCHEDULE",
        "SAFETY",
        "QUALITY",
        "SUPPLY",
        "ENVIRONMENT",
      ]),
      probability: z.number().int().min(1).max(5),
      impact: z.number().int().min(1).max(5),
      ownerId: z.string().default(""),
      dueOn: date,
      mitigation: text,
      note,
    })
    .strict(),
  rfi: z
    .object({
      reference: text,
      title: text,
      question: text,
      assignedTo: z.string().default(""),
      dueOn: date,
      priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
      note,
    })
    .strict(),
  dailyreport: z
    .object({
      siteId: id,
      date,
      weather: z.enum(["CLEAR", "CLOUDY", "RAIN", "STORM"]),
      workSummary: text,
      workersCount: z.number().int().min(0).max(10000),
      equipmentHours: z.number().nonnegative().max(10000),
      safetyIncidents: z.number().int().min(0).max(10000),
      delays: note,
      note,
    })
    .strict(),
  equipment: z
    .object({
      code: text,
      name: text,
      type: z.enum([
        "EXCAVATOR",
        "CRANE",
        "MIXER",
        "GENERATOR",
        "VEHICLE",
        "OTHER",
      ]),
      hourlyRateMinor: cash,
      fuelRateMinor: cash,
      note,
    })
    .strict(),
  equipmentlog: z
    .object({
      equipmentId: id,
      siteId: id,
      date,
      hours: z.number().positive().max(24),
      fuelLitres: z.number().nonnegative().max(10000),
      costCode: text,
      note,
    })
    .strict(),
  approvalrule: z
    .object({
      name: text,
      kind: z.enum([
        "purchaseorder",
        "materialrequest",
        "contractpackage",
        "measurementbill",
        "budgetrelease",
        "equipmentlog",
      ]),
      thresholdMinor: cash,
      requiredRole: z.enum(["PROJECT_MANAGER", "COMPANY_ADMIN"]),
      note,
    })
    .strict(),
  payment: z
    .object({
      billId: id,
      reference: text,
      date,
      amountMinor: cash.refine((n) => n > 0, "Payment must be positive"),
      method: z.enum(["BANK", "CASH", "CHEQUE", "MOBILE_BANKING"]),
      note,
    })
    .strict(),
  retentionpayment: z
    .object({ billId: id, reference: text, date, note })
    .strict(),
  comment: z.object({ recordId: id, text: text }).strict(),
};
export type AdvancedKind = keyof typeof advancedSchemas;
export function parseAdvanced(kind: string, input: unknown): any {
  if (!(kind in advancedSchemas)) throw new Error("Unknown advanced module");
  return advancedSchemas[kind as AdvancedKind].parse(input);
}
export const commandSchema = z
  .object({
    action: z.string().min(1),
    expectedVersion: z.number().int().positive(),
    note: z.string().max(4000).default(""),
  })
  .strict();
