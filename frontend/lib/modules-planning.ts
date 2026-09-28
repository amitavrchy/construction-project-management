import { Module } from "./types";
export const planning: Record<string, Module> = {
  boq: {
    title: "Bill of quantities",
    singular: "BOQ item",
    subtitle: "A clear foundation for every quantity and cost.",
    columns: [
      "code",
      "description",
      "quantity",
      "unit",
      "rateMinor",
      "costCode",
    ],
    fields: [
      { key: "code", label: "Item code" },
      { key: "description", label: "Description" },
      {
        key: "unit",
        label: "Unit",
        options: ["m³", "m²", "kg", "ton", "bag", "piece", "day", "lot"],
      },
      { key: "quantity", label: "Planned quantity", type: "number" },
      { key: "rateMinor", label: "Unit rate (BDT)", type: "money" },
      { key: "costCode", label: "Cost code" },
    ],
  },
  budget: {
    title: "Budgets & revisions",
    singular: "budget version",
    subtitle: "Plan confidently. Approve deliberately. Keep every revision.",
    columns: ["name", "costCode", "amountMinor", "versionNumber"],
    fields: [
      { key: "name", label: "Version name" },
      { key: "costCode", label: "Cost code" },
      { key: "amountMinor", label: "Budget (BDT)", type: "money" },
      {
        key: "note",
        label: "Revision notes",
        type: "textarea",
        optional: true,
      },
    ],
  },
  variation: {
    title: "Variation orders",
    singular: "variation",
    subtitle: "Keep changes in scope visible and approved.",
    columns: ["boqId", "additionalQuantity", "deltaAmountMinor", "reason"],
    fields: [
      { key: "boqId", label: "BOQ item", ref: "boq" },
      {
        key: "additionalQuantity",
        label: "Additional quantity",
        type: "number",
      },
      {
        key: "deltaAmountMinor",
        label: "Additional budget (BDT)",
        type: "money",
      },
      { key: "reason", label: "Reason", type: "textarea" },
    ],
  },
};
