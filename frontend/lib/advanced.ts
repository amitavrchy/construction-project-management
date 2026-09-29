import { Field } from "./types";
export type AdvancedField = Field & { multi?: boolean };
export type AdvancedModule = {
  title: string;
  singular: string;
  description: string;
  fields: AdvancedField[];
  columns: string[];
  lines?: "materials" | "contract" | "budget" | "quantities";
  source?: string;
};
const note: AdvancedField = {
  key: "note",
  label: "Notes",
  type: "textarea",
  optional: true,
};
const reference: AdvancedField = {
  key: "reference",
  label: "Reference number",
};
export const advancedModules: Record<string, AdvancedModule> = {
  schedulebaseline: {
    title: "Schedule baselines",
    singular: "schedule baseline",
    description:
      "Capture the entire work plan. Approval freezes the dates and cost weights used by earned-value reporting.",
    fields: [
      { key: "name", label: "Baseline name" },
      { key: "reason", label: "Baseline reason", type: "textarea" },
    ],
    columns: ["name", "versionNumber", "totalMinor"],
  },
  worklog: {
    title: "Certified piecework",
    singular: "piecework log",
    description:
      "Measure contract-paid labor, certify units and include them once in payroll.",
    fields: [
      reference,
      { key: "workerId", label: "Contract-paid worker", ref: "contractworker" },
      { key: "siteId", label: "Site", ref: "site" },
      { key: "date", label: "Work date", type: "date" },
      { key: "quantity", label: "Completed units", type: "number" },
      { key: "description", label: "Work measurement", type: "textarea" },
      note,
    ],
    columns: [
      "reference",
      "workerName",
      "date",
      "quantity",
      "unitRateMinor",
      "totalMinor",
    ],
  },
  batchreturn: {
    title: "Batch material returns",
    singular: "batch return",
    description:
      "Return unused issued materials at their original valuation and reverse cost.",
    fields: [
      { key: "dispatchId", label: "Original batch issue", ref: "dispatch" },
      note,
    ],
    columns: ["dispatchId", "siteId", "totalMinor"],
    lines: "quantities",
    source: "dispatchId",
  },
  retentionpayment: {
    title: "Retention releases",
    singular: "retention release",
    description:
      "Release certified retention once the defects liability period has expired.",
    fields: [
      reference,
      { key: "billId", label: "Eligible paid bill", ref: "retentionbill" },
      { key: "date", label: "Settlement date", type: "date" },
      note,
    ],
    columns: ["reference", "billId", "date", "amountMinor"],
  },
  purchaseorder: {
    title: "Purchase orders",
    singular: "purchase order",
    description:
      "Plan delivery, approve spend and receive against ordered quantities.",
    fields: [
      reference,
      { key: "siteId", label: "Receiving site", ref: "site" },
      { key: "supplierId", label: "Supplier", ref: "supplier" },
      { key: "expectedOn", label: "Expected delivery", type: "date" },
      note,
    ],
    columns: ["reference", "supplierId", "expectedOn", "totalMinor"],
    lines: "materials",
  },
  delivery: {
    title: "Order deliveries",
    singular: "order delivery",
    description:
      "Multi-material goods receipts with invoice and over-delivery protection.",
    fields: [
      {
        key: "purchaseorderId",
        label: "Approved purchase order",
        ref: "purchaseorder",
      },
      { key: "invoiceNo", label: "Supplier invoice" },
      { key: "receivedOn", label: "Received on", type: "date" },
      note,
    ],
    columns: ["invoiceNo", "purchaseorderId", "receivedOn", "totalMinor"],
    lines: "quantities",
    source: "purchaseorderId",
  },
  materialrequest: {
    title: "Material requests",
    singular: "material request",
    description:
      "Request an entire work package with line-by-line cost allocation.",
    fields: [
      reference,
      { key: "siteId", label: "Site", ref: "site" },
      { key: "neededOn", label: "Needed on", type: "date" },
      note,
    ],
    columns: ["reference", "siteId", "neededOn", "totalMinor"],
    lines: "materials",
  },
  dispatch: {
    title: "Batch stock issues",
    singular: "batch issue",
    description:
      "Issue several materials atomically and post their actual costs.",
    fields: [
      {
        key: "requestId",
        label: "Approved material request",
        ref: "materialrequest",
      },
      note,
    ],
    columns: ["requestId", "siteId", "totalMinor"],
    lines: "quantities",
    source: "requestId",
  },
  contractpackage: {
    title: "Contract packages",
    singular: "contract package",
    description:
      "Multi-BOQ scope, measured rates and contract deduction controls.",
    fields: [
      reference,
      { key: "title", label: "Package title" },
      { key: "contractorId", label: "Contractor", ref: "contractor" },
      {
        key: "retentionBps",
        label: "Retention (basis points)",
        type: "number",
        default: 500,
      },
      {
        key: "taxBps",
        label: "Withholding (basis points)",
        type: "number",
        default: 300,
      },
      {
        key: "advanceLimitMinor",
        label: "Advance recovery limit (BDT)",
        type: "money",
        default: 0,
      },
      { key: "defectsUntil", label: "Defects liability ends", type: "date" },
      note,
    ],
    columns: ["reference", "title", "contractorId", "totalMinor"],
    lines: "contract",
  },
  measurementbill: {
    title: "Measurement bills",
    singular: "measurement bill",
    description:
      "Certify cumulative work, retain agreed deductions and track outstanding payments.",
    fields: [
      reference,
      {
        key: "contractpackageId",
        label: "Approved contract package",
        ref: "contractpackage",
      },
      { key: "measuredOn", label: "Measurement date", type: "date" },
      {
        key: "advanceMinor",
        label: "Advance recovery (BDT)",
        type: "money",
        default: 0,
      },
      {
        key: "penaltyMinor",
        label: "Penalty (BDT)",
        type: "money",
        default: 0,
      },
      note,
    ],
    columns: [
      "reference",
      "contractpackageId",
      "gross",
      "retention",
      "tax",
      "net",
      "paidMinor",
    ],
    lines: "quantities",
    source: "contractpackageId",
  },
  payment: {
    title: "Payment register",
    singular: "payment",
    description:
      "Record partial settlements with an external bank, cash or cheque reference.",
    fields: [
      reference,
      { key: "billId", label: "Approved bill", ref: "measurementbill" },
      { key: "date", label: "Payment date", type: "date" },
      { key: "amountMinor", label: "Payment amount (BDT)", type: "money" },
      {
        key: "method",
        label: "Method",
        options: ["BANK", "CASH", "CHEQUE", "MOBILE_BANKING"],
      },
      note,
    ],
    columns: [
      "reference",
      "billId",
      "date",
      "method",
      "amountMinor",
      "outstandingMinor",
    ],
  },
  budgetrelease: {
    title: "Budget versions",
    singular: "budget version",
    description:
      "One version for the entire project, with cost-head changes and immutable approvals.",
    fields: [
      { key: "name", label: "Version name" },
      { key: "reason", label: "Reason for this budget", type: "textarea" },
      {
        key: "previousId",
        label: "Revise approved version",
        ref: "budgetrelease",
        optional: true,
      },
    ],
    columns: ["name", "versionNumber", "totalMinor", "deltaMinor"],
    lines: "budget",
  },
  task: {
    title: "Work breakdown",
    singular: "work item",
    description: "Dependencies, accountable owners and measured progress.",
    fields: [
      { key: "code", label: "WBS code" },
      { key: "title", label: "Work item title" },
      { key: "startsOn", label: "Planned start", type: "date" },
      { key: "endsOn", label: "Planned finish", type: "date" },
      {
        key: "ownerId",
        label: "Responsible person",
        ref: "person",
        optional: true,
      },
      {
        key: "parentId",
        label: "Parent work item",
        ref: "task",
        optional: true,
      },
      {
        key: "dependencies",
        label: "Finish-to-start predecessors",
        ref: "task",
        multi: true,
        optional: true,
      },
      { key: "budgetMinor", label: "Planned cost (BDT)", type: "money" },
      {
        key: "percent",
        label: "Physical completion (%)",
        type: "number",
        default: 0,
      },
      {
        key: "priority",
        label: "Priority",
        options: ["MEDIUM", "HIGH", "CRITICAL", "LOW"],
      },
      note,
    ],
    columns: ["code", "title", "ownerId", "endsOn", "percent", "priority"],
  },
  risk: {
    title: "Risk register",
    singular: "risk",
    description:
      "Prioritize by probability × impact and track mitigations to closure.",
    fields: [
      { key: "title", label: "Risk title" },
      {
        key: "category",
        label: "Category",
        options: [
          "COST",
          "SCHEDULE",
          "SAFETY",
          "QUALITY",
          "SUPPLY",
          "ENVIRONMENT",
        ],
      },
      {
        key: "probability",
        label: "Probability (1–5)",
        type: "number",
        default: 3,
      },
      { key: "impact", label: "Impact (1–5)", type: "number", default: 3 },
      { key: "ownerId", label: "Risk owner", ref: "person", optional: true },
      { key: "dueOn", label: "Review date", type: "date" },
      { key: "mitigation", label: "Mitigation plan", type: "textarea" },
      note,
    ],
    columns: ["title", "category", "score", "ownerId", "dueOn"],
  },
  rfi: {
    title: "Requests for information",
    singular: "RFI",
    description:
      "Route questions, record authoritative answers and keep a decision thread.",
    fields: [
      reference,
      { key: "title", label: "Subject" },
      { key: "question", label: "Question", type: "textarea" },
      { key: "assignedTo", label: "Assign to", ref: "person", optional: true },
      { key: "dueOn", label: "Response due", type: "date" },
      {
        key: "priority",
        label: "Priority",
        options: ["MEDIUM", "HIGH", "CRITICAL", "LOW"],
      },
      note,
    ],
    columns: ["reference", "title", "assignedTo", "dueOn", "priority"],
  },
  dailyreport: {
    title: "Site diary",
    singular: "daily report",
    description:
      "A daily site record of output, weather, manpower, delays and safety.",
    fields: [
      { key: "siteId", label: "Site", ref: "site" },
      { key: "date", label: "Report date", type: "date" },
      {
        key: "weather",
        label: "Weather",
        options: ["CLEAR", "CLOUDY", "RAIN", "STORM"],
      },
      { key: "workSummary", label: "Work completed", type: "textarea" },
      {
        key: "workersCount",
        label: "People on site",
        type: "number",
        default: 0,
      },
      {
        key: "equipmentHours",
        label: "Equipment hours",
        type: "number",
        default: 0,
      },
      {
        key: "safetyIncidents",
        label: "Safety incidents",
        type: "number",
        default: 0,
      },
      {
        key: "delays",
        label: "Delays and constraints",
        type: "textarea",
        optional: true,
      },
      note,
    ],
    columns: [
      "date",
      "siteId",
      "weather",
      "workersCount",
      "equipmentHours",
      "safetyIncidents",
    ],
  },
  equipment: {
    title: "Equipment register",
    singular: "equipment asset",
    description: "Owned and hired plant, with hourly and fuel cost rates.",
    fields: [
      { key: "code", label: "Asset code" },
      { key: "name", label: "Equipment name" },
      {
        key: "type",
        label: "Equipment type",
        options: [
          "EXCAVATOR",
          "CRANE",
          "MIXER",
          "GENERATOR",
          "VEHICLE",
          "OTHER",
        ],
      },
      { key: "hourlyRateMinor", label: "Hourly cost (BDT)", type: "money" },
      {
        key: "fuelRateMinor",
        label: "Fuel cost per litre (BDT)",
        type: "money",
      },
      note,
    ],
    columns: ["code", "name", "type", "hourlyRateMinor", "fuelRateMinor"],
  },
  equipmentlog: {
    title: "Plant utilization",
    singular: "equipment log",
    description: "Review runtime and fuel use before posting equipment costs.",
    fields: [
      { key: "equipmentId", label: "Equipment", ref: "equipment" },
      { key: "siteId", label: "Site", ref: "site" },
      { key: "date", label: "Operating date", type: "date" },
      { key: "hours", label: "Operating hours", type: "number" },
      {
        key: "fuelLitres",
        label: "Fuel consumed (litres)",
        type: "number",
        default: 0,
      },
      { key: "costCode", label: "Cost code" },
      note,
    ],
    columns: ["equipmentName", "date", "hours", "fuelLitres", "totalMinor"],
  },
  approvalrule: {
    title: "Approval matrix",
    singular: "approval rule",
    description:
      "Amount thresholds determine whether PM or company approval is required.",
    fields: [
      { key: "name", label: "Rule name" },
      {
        key: "kind",
        label: "Applies to",
        options: [
          "purchaseorder",
          "materialrequest",
          "contractpackage",
          "measurementbill",
          "budgetrelease",
          "equipmentlog",
        ],
      },
      {
        key: "thresholdMinor",
        label: "Applies from amount (BDT)",
        type: "money",
      },
      {
        key: "requiredRole",
        label: "Required approver",
        options: ["PROJECT_MANAGER", "COMPANY_ADMIN"],
      },
      note,
    ],
    columns: ["name", "kind", "thresholdMinor", "requiredRole"],
  },
};
export const sections: Record<
  string,
  { title: string; subtitle: string; modules: string[] }
> = {
  procurement: {
    title: "Procurement & stores",
    subtitle: "From an approved order to a fully costed material issue.",
    modules: [
      "purchaseorder",
      "delivery",
      "materialrequest",
      "dispatch",
      "batchreturn",
    ],
  },
  commercial: {
    title: "Commercial control",
    subtitle: "Measured contracts, certified bills and traceable settlements.",
    modules: [
      "contractpackage",
      "measurementbill",
      "payment",
      "retentionpayment",
    ],
  },
  "budget-versions": {
    title: "Budget control",
    subtitle: "The full financial baseline, reviewed and versioned.",
    modules: ["budgetrelease"],
  },
  risks: {
    title: "Risk management",
    subtitle:
      "Make uncertainty visible. Turn mitigation into accountable work.",
    modules: ["risk"],
  },
  rfis: {
    title: "Design coordination",
    subtitle: "Clear questions. Traceable decisions. Fewer delays.",
    modules: ["rfi"],
  },
  "site-diary": {
    title: "Site intelligence",
    subtitle: "Daily delivery, manpower, safety and plant utilization.",
    modules: ["dailyreport", "equipmentlog", "equipment", "worklog"],
  },
  automation: {
    title: "Approval policy",
    subtitle: "Configure who can authorize project commitments.",
    modules: ["approvalrule"],
  },
};
const managers = ["COMPANY_ADMIN", "PROJECT_MANAGER"];
export const writers: Record<string, string[]> = {
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
};
export function advancedActions(
  kind: string,
  status: string,
  role: string,
): string[] {
  if (kind === "task" && writers.task.includes(role))
    return (
      (
        {
          BACKLOG: ["IN_PROGRESS", "BLOCKED"],
          IN_PROGRESS: ["BLOCKED", "DONE"],
          BLOCKED: ["IN_PROGRESS"],
          DONE: ["IN_PROGRESS"],
        } as Record<string, string[]>
      )[status] || []
    );
  if (kind === "risk" && writers.risk.includes(role))
    return (
      (
        {
          OPEN: ["MITIGATED", "CLOSED"],
          MITIGATED: ["OPEN", "CLOSED"],
          CLOSED: ["OPEN"],
        } as Record<string, string[]>
      )[status] || []
    );
  if (kind === "rfi" && writers.rfi.includes(role))
    return (
      (
        {
          OPEN: ["ANSWERED"],
          ANSWERED: ["OPEN", "CLOSED"],
          CLOSED: ["OPEN"],
        } as Record<string, string[]>
      )[status] || []
    );
  if (status === "DRAFT" && writers[kind]?.includes(role)) return ["SUBMITTED"];
  if (status === "SUBMITTED" && managers.includes(role))
    return kind === "measurementbill"
      ? ["PM_APPROVED", "REJECTED"]
      : ["APPROVED", "REJECTED"];
  if (status === "PM_APPROVED" && role === "ACCOUNTANT")
    return ["ACCOUNTS_APPROVED", "REJECTED"];
  return [];
}
writers.batchreturn = ["COMPANY_ADMIN", "STORE_KEEPER"];
writers.retentionpayment = ["ACCOUNTANT"];
writers.worklog = ["COMPANY_ADMIN", "SITE_ENGINEER", "LABOR_SUPERVISOR"];
writers.schedulebaseline = managers;
export function routeForKind(kind: string) {
  if (["task", "schedulebaseline"].includes(kind)) return "planning";
  for (const [section, config] of Object.entries(sections))
    if (config.modules.includes(kind)) return section;
  return kind;
}
