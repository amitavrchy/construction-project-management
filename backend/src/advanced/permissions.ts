import { ForbiddenException } from "@nestjs/common";
import { Actor } from "../domain/access";
import { Context, list } from "../domain/context";
export async function requiredApprover(
  c: Context,
  kind: string,
  value: number,
) {
  const rules = (await list(c, "approvalrule"))
    .filter(
      (r) =>
        r.status === "ACTIVE" &&
        r.data.kind === kind &&
        value >= r.data.thresholdMinor,
    )
    .sort((a, b) => b.data.thresholdMinor - a.data.thresholdMinor);
  return rules[0]?.data.requiredRole || "PROJECT_MANAGER";
}
export const managers = ["COMPANY_ADMIN", "PROJECT_MANAGER"];
export const advancedWriters: Record<string, string[]> = {
  purchaseorder: [...managers, "STORE_KEEPER"],
  delivery: ["COMPANY_ADMIN", "STORE_KEEPER"],
  materialrequest: [...managers, "SITE_ENGINEER"],
  dispatch: ["COMPANY_ADMIN", "STORE_KEEPER"],
  contractpackage: managers,
  measurementbill: ["COMPANY_ADMIN", "ACCOUNTANT", "CONTRACTOR"],
  budgetrelease: managers,
  task: [...managers, "SITE_ENGINEER"],
  risk: [...managers, "SITE_ENGINEER"],
  rfi: [...managers, "SITE_ENGINEER"],
  dailyreport: [...managers, "SITE_ENGINEER"],
  equipment: [...managers, "STORE_KEEPER"],
  equipmentlog: ["COMPANY_ADMIN", "SITE_ENGINEER", "STORE_KEEPER"],
  approvalrule: ["COMPANY_ADMIN"],
  payment: ["ACCOUNTANT"],
  comment: [
    ...managers,
    "SITE_ENGINEER",
    "STORE_KEEPER",
    "ACCOUNTANT",
    "LABOR_SUPERVISOR",
    "CONTRACTOR",
  ],
};
export function assertAdvancedWrite(actor: Actor, kind: string) {
  if (!advancedWriters[kind]?.includes(actor.role))
    throw new ForbiddenException(
      "Your project role cannot perform this action",
    );
}
advancedWriters.batchreturn = ["COMPANY_ADMIN", "STORE_KEEPER"];
advancedWriters.retentionpayment = ["ACCOUNTANT"];
advancedWriters.worklog = [
  "COMPANY_ADMIN",
  "SITE_ENGINEER",
  "LABOR_SUPERVISOR",
];
advancedWriters.schedulebaseline = managers;
