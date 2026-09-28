import { Data } from "./domain/context";
export function budgetReport(
  records: { id?: string; kind: string; status: string; data: unknown }[],
  ledger: { costCode: string; amountMinor: number }[],
) {
  const approved = records.filter(
    (r) => r.kind === "budget" && r.status === "APPROVED",
  );
  const codes = new Set([
    ...approved.map((r) => (r.data as Data).costCode as string),
    ...records
      .filter((r) => r.kind === "variation" && r.status === "APPROVED")
      .map(
        (r) =>
          records.find(
            (b) => b.kind === "boq" && b.id === (r.data as Data).boqId,
          )?.data as Data | undefined,
      )
      .filter((d): d is Data => !!d)
      .map((d) => d.costCode as string),
    ...ledger.map((l) => l.costCode),
  ]);
  return [...codes].map((costCode) => {
    const budget = approved
      .filter((r) => (r.data as Data).costCode === costCode)
      .reduce((s, r) => s + (r.data as Data).amountMinor, 0);
    const variation = records
      .filter(
        (r) =>
          r.kind === "variation" &&
          r.status === "APPROVED" &&
          records.some(
            (b) =>
              b.kind === "boq" &&
              (b.data as Data).costCode === costCode &&
              (r.data as Data).boqId === b.id,
          ),
      )
      .reduce((s, r) => s + (r.data as Data).deltaAmountMinor, 0);
    const totalBudget = budget + variation;
    const actual = ledger
      .filter((l) => l.costCode === costCode)
      .reduce((s, l) => s + l.amountMinor, 0);
    return {
      costCode,
      budget: totalBudget,
      actual,
      variance: actual - totalBudget,
      utilization: totalBudget ? Math.round((actual / totalBudget) * 100) : 0,
      alert:
        actual >
        totalBudget *
          (1 + Number(process.env.VARIANCE_ALERT_BPS || 1000) / 10000),
    };
  });
}
export function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "No records\r\n";
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (v: unknown) => {
    let s = typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [
    headers.map(cell).join(","),
    ...rows.map((r) => headers.map((h) => cell(r[h])).join(",")),
  ].join("\r\n");
}
