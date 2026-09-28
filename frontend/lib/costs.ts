import { Snapshot } from "./types";
export function costHeads(s: Snapshot) {
  const budgets = s.records.filter(
    (r) => r.kind === "budget" && r.status === "APPROVED",
  );
  const release = s.records.find(
    (r) => r.kind === "budgetrelease" && r.status === "APPROVED",
  );
  const releaseLines: { costCode: string; amountMinor: number }[] =
    release?.data.lines || [];
  const codes = new Set([
    ...budgets.map((r) => r.data.costCode),
    ...releaseLines.map((l) => l.costCode),
    ...s.records
      .filter((r) => r.kind === "variation" && r.status === "APPROVED")
      .map(
        (r) =>
          s.records.find((b) => b.kind === "boq" && b.id === r.data.boqId)?.data
            .costCode,
      )
      .filter(Boolean),
    ...s.ledger.map((r) => r.costCode),
  ]);
  return [...codes].map((code) => {
    const base = release
      ? releaseLines
          .filter((l) => l.costCode === code)
          .reduce((s, l) => s + l.amountMinor, 0)
      : budgets
          .filter((r) => r.data.costCode === code)
          .reduce((a, r) => a + r.data.amountMinor, 0);
    const variation = s.records
      .filter(
        (r) =>
          r.kind === "variation" &&
          r.status === "APPROVED" &&
          s.records.some(
            (b) => b.id === r.data.boqId && b.data.costCode === code,
          ),
      )
      .reduce((a, r) => a + r.data.deltaAmountMinor, 0);
    return {
      code,
      budget: base + variation,
      actual: s.ledger
        .filter((l) => l.costCode === code)
        .reduce((a, l) => a + l.amountMinor, 0),
    };
  });
}
