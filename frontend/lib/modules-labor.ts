import { Module } from "./types";
export const labor: Record<string, Module> = {
  worker: {
    title: "People on site",
    singular: "worker",
    subtitle: "Your workforce, trades, gangs and agreed daily rates.",
    columns: ["name", "trade", "gang", "payBasis", "dailyRateMinor", "phone"],
    fields: [
      { key: "name", label: "Worker name" },
      {
        key: "trade",
        label: "Trade",
        options: [
          "Mason",
          "Carpenter",
          "Steel fixer",
          "Electrician",
          "Plumber",
          "General labor",
        ],
      },
      { key: "gang", label: "Gang / team" },
      {
        key: "payBasis",
        label: "Pay basis",
        options: ["DAILY", "HOURLY", "MONTHLY", "CONTRACT"],
      },
      {
        key: "hourlyRateMinor",
        label: "Hourly rate (BDT, hourly workers)",
        type: "money",
        default: 0,
      },
      {
        key: "monthlyRateMinor",
        label: "Monthly rate (BDT, calendar-day proration)",
        type: "money",
        default: 0,
      },
      {
        key: "unitRateMinor",
        label: "Piecework unit rate (BDT, contract workers)",
        type: "money",
        default: 0,
      },
      { key: "dailyRateMinor", label: "Daily rate (BDT)", type: "money" },
      { key: "phone", label: "Phone", optional: true },
    ],
  },
  attendance: {
    title: "Daily attendance",
    singular: "attendance",
    subtitle:
      "A mobile friendly muster roll, including night shifts and overtime.",
    columns: ["workerId", "siteId", "date", "status", "otHours", "shift"],
    fields: [
      { key: "workerId", label: "Worker", ref: "worker" },
      { key: "siteId", label: "Site", ref: "site" },
      { key: "date", label: "Shift start date (Dhaka)", type: "date" },
      {
        key: "status",
        label: "Attendance",
        options: ["PRESENT", "HALF", "ABSENT"],
      },
      { key: "otHours", label: "Overtime hours", type: "number", default: 0 },
      { key: "shift", label: "Shift", options: ["DAY", "NIGHT"] },
    ],
  },
  wage: {
    title: "Wages & payroll",
    singular: "wage run",
    subtitle: "Attendance becomes accurate wages, with a clear approval trail.",
    columns: ["name", "siteId", "periodStart", "periodEnd", "amountMinor"],
    fields: [
      { key: "name", label: "Payroll period name" },
      { key: "siteId", label: "Site", ref: "site" },
      { key: "periodStart", label: "Period start", type: "date" },
      { key: "periodEnd", label: "Period end", type: "date" },
      { key: "costCode", label: "Labor cost code" },
    ],
  },
};
