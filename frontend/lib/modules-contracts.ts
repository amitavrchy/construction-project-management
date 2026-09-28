import { Module } from "./types";
export const contracts: Record<string, Module> = {
  contractor: {
    title: "Contractor directory",
    singular: "contractor",
    subtitle: "Good partnerships. Clear responsibilities.",
    columns: ["name", "trade", "phone"],
    fields: [
      { key: "name", label: "Company / contractor name" },
      { key: "trade", label: "Specialty" },
      { key: "phone", label: "Phone" },
    ],
  },
  workorder: {
    title: "Work orders",
    singular: "work order",
    subtitle: "Agree on scope, rates and deductions before work begins.",
    columns: ["title", "contractorId", "boqId", "quantity", "rateMinor"],
    fields: [
      { key: "title", label: "Work order title" },
      { key: "contractorId", label: "Contractor", ref: "contractor" },
      { key: "boqId", label: "BOQ item", ref: "boq" },
      { key: "quantity", label: "Ordered quantity", type: "number" },
      { key: "rateMinor", label: "Rate (BDT)", type: "money" },
      {
        key: "retentionBps",
        label: "Retention (basis points; 500 = 5%)",
        type: "number",
        default: 500,
      },
      {
        key: "taxBps",
        label: "Withholding (basis points)",
        type: "number",
        default: 0,
      },
      { key: "costCode", label: "Cost code" },
      { key: "defectsUntil", label: "Defects liability ends", type: "date" },
    ],
  },
  bill: {
    title: "Contractor bills",
    singular: "RA bill",
    subtitle: "Measure, certify and pay. Retention and tax, accounted for.",
    columns: [
      "billNo",
      "workorderId",
      "quantity",
      "gross",
      "retention",
      "tax",
      "net",
    ],
    fields: [
      { key: "workorderId", label: "Work order", ref: "workorder" },
      { key: "billNo", label: "Bill number" },
      { key: "quantity", label: "This bill quantity", type: "number" },
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
    ],
  },
  progress: {
    title: "Daily progress",
    singular: "progress update",
    subtitle:
      "Turn site activity into measurable progress with photo evidence.",
    columns: ["boqId", "quantity", "percent", "note"],
    fields: [
      { key: "boqId", label: "BOQ item", ref: "boq" },
      {
        key: "quantity",
        label: "Cumulative quantity completed",
        type: "number",
      },
      {
        key: "note",
        label: "What happened on site?",
        type: "textarea",
        optional: true,
      },
      {
        key: "photo",
        label: "Site photo (required for >15% jump)",
        type: "file",
        optional: true,
      },
    ],
  },
  document: {
    title: "Document vault",
    singular: "document",
    subtitle:
      "Drawings, approvals and contracts, right where your team needs them.",
    columns: ["name", "category", "fileName"],
    fields: [
      { key: "name", label: "Document name" },
      {
        key: "category",
        label: "Category",
        options: ["DRAWING", "NOC", "CONTRACT", "REPORT", "OTHER"],
      },
      { key: "content", label: "PDF or image (max 4 MB)", type: "file" },
      { key: "fileName", label: "File name (filled on upload)" },
    ],
  },
};
