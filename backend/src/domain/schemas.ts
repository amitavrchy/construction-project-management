import { BadRequestException } from "@nestjs/common";
import { z } from "zod";
const text = z.string().trim().min(1).max(200);
const note = z.string().trim().max(2000).default("");
const money = z.number().int().min(0).max(1_000_000_000);
const qty = z.number().positive().max(1_000_000).multipleOf(0.001);
export const date = z.iso.date();
export const roles = [
  "COMPANY_ADMIN",
  "PROJECT_MANAGER",
  "SITE_ENGINEER",
  "STORE_KEEPER",
  "ACCOUNTANT",
  "CONTRACTOR",
  "LABOR_SUPERVISOR",
] as const;
export const projectSchema = z
  .object({
    name: text,
    code: text,
    address: text,
    startsOn: date,
    endsOn: date,
  })
  .strict()
  .refine((v) => v.endsOn >= v.startsOn, "End date must follow start date");
export const schemas = {
  boq: z
    .object({
      code: text,
      description: text,
      unit: text,
      quantity: qty,
      rateMinor: money,
      costCode: text,
    })
    .strict(),
  budget: z
    .object({ name: text, amountMinor: money, costCode: text, note })
    .strict(),
  material: z
    .object({
      sku: text,
      name: text,
      unit: text,
      minimum: z.number().nonnegative().default(0),
    })
    .strict(),
  supplier: z.object({ name: text, phone: text, address: note }).strict(),
  receipt: z
    .object({
      siteId: text,
      materialId: text,
      supplierId: text,
      invoiceNo: text,
      quantity: qty,
      costMinor: money,
    })
    .strict(),
  requisition: z
    .object({
      siteId: text,
      materialId: text,
      quantity: qty,
      neededOn: date,
      costCode: text,
      note,
    })
    .strict(),
  issue: z.object({ requisitionId: text, quantity: qty }).strict(),
  return: z.object({ issueId: text, quantity: qty, note }).strict(),
  transfer: z
    .object({
      siteId: text,
      destinationSiteId: text,
      materialId: text,
      quantity: qty,
      note,
    })
    .strict(),
  worker: z
    .object({
      name: text,
      trade: text,
      dailyRateMinor: money,
      payBasis: z
        .enum(["DAILY", "HOURLY", "MONTHLY", "CONTRACT"])
        .default("DAILY"),
      hourlyRateMinor: money.default(0),
      monthlyRateMinor: money.default(0),
      unitRateMinor: money.default(0),
      phone: note,
      gang: text,
    })
    .strict()
    .refine(
      (w) =>
        w.payBasis === "DAILY" ||
        (w.payBasis === "HOURLY"
          ? w.hourlyRateMinor
          : w.payBasis === "MONTHLY"
            ? w.monthlyRateMinor
            : w.unitRateMinor) > 0,
      "Set a positive rate for the selected pay basis",
    ),
  attendance: z
    .object({
      workerId: text,
      siteId: text,
      date,
      status: z.enum(["PRESENT", "HALF", "ABSENT"]),
      otHours: z.number().min(0).max(16).default(0),
      shift: z.enum(["DAY", "NIGHT"]).default("DAY"),
    })
    .strict(),
  wage: z
    .object({
      name: text,
      siteId: text,
      periodStart: date,
      periodEnd: date,
      costCode: text,
    })
    .strict()
    .refine((v) => v.periodEnd >= v.periodStart, "Invalid wage period"),
  contractor: z.object({ name: text, phone: text, trade: text }).strict(),
  workorder: z
    .object({
      title: text,
      contractorId: text,
      boqId: text,
      quantity: qty,
      rateMinor: money,
      retentionBps: z.number().int().min(0).max(5000),
      taxBps: z.number().int().min(0).max(5000),
      costCode: text,
      defectsUntil: date,
    })
    .strict(),
  bill: z
    .object({
      workorderId: text,
      billNo: text,
      quantity: qty,
      advanceMinor: money.default(0),
      penaltyMinor: money.default(0),
    })
    .strict(),
  progress: z
    .object({
      boqId: text,
      quantity: z.number().nonnegative().max(1_000_000),
      note,
      photo: z.string().max(3_000_000).default(""),
    })
    .strict(),
  document: z
    .object({
      name: text,
      category: z.enum(["DRAWING", "NOC", "CONTRACT", "REPORT", "OTHER"]),
      fileName: text,
      content: z.string().max(6_000_000),
    })
    .strict(),
  variation: z
    .object({
      boqId: text,
      additionalQuantity: qty,
      deltaAmountMinor: money,
      reason: text,
    })
    .strict(),
};
export type Kind = keyof typeof schemas;
export function parseRecord(kind: string, data: unknown): any {
  if (!(kind in schemas)) throw new BadRequestException("Unknown record type");
  return schemas[kind as Kind].parse(data);
}
