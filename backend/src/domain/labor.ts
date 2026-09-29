import { Context, Data, getRecord, requireSite, list } from "./context";
import { wage, minor } from "./money";
import { workerPay } from "./payroll";
export async function labor(c: Context, kind: string, d: Data): Promise<Data> {
  if (kind === "attendance") {
    await requireSite(c, d.siteId);
    await getRecord(c, d.workerId, "worker");
    const runs = await list(c, "wage");
    if (
      runs.some(
        (r) =>
          r.data.siteId === d.siteId &&
          d.date >= r.data.periodStart &&
          d.date <= r.data.periodEnd,
      )
    )
      throw new Error("Attendance period already belongs to a wage run");
    if (d.status === "ABSENT" && d.otHours > 0)
      throw new Error("Absent workers cannot record overtime");
  }
  if (kind === "wage") {
    await requireSite(c, d.siteId);
    const runs = await list(c, "wage");
    if (
      runs.some(
        (r) =>
          r.data.siteId === d.siteId &&
          d.periodStart <= r.data.periodEnd &&
          d.periodEnd >= r.data.periodStart,
      )
    )
      throw new Error("Overlapping wage period");
    const attendance = (await list(c, "attendance")).filter(
      (r) =>
        r.data.siteId === d.siteId &&
        r.data.date >= d.periodStart &&
        r.data.date <= d.periodEnd,
    );
    const worklogs = (await list(c, "worklog")).filter(
      (r) =>
        r.status === "APPROVED" &&
        r.data.siteId === d.siteId &&
        r.data.date >= d.periodStart &&
        r.data.date <= d.periodEnd,
    );
    if (!attendance.length && !worklogs.length)
      throw new Error(
        "No attendance or certified piecework in selected period",
      );
    const breakdown: Data[] = [];
    for (const worker of await list(c, "worker")) {
      const entries = attendance.filter((a) => a.data.workerId === worker.id);
      const logs = worklogs.filter((r) => r.data.workerId === worker.id);
      if (!entries.length && !logs.length) continue;
      const days = entries.reduce(
        (s, r) =>
          s +
          (r.data.status === "PRESENT"
            ? 1
            : r.data.status === "HALF"
              ? 0.5
              : 0),
        0,
      );
      const otHours = entries.reduce((s, r) => s + r.data.otHours, 0);
      const pay = workerPay(
        worker.data,
        entries.map((e) => e.data),
        logs.map((l) => l.data),
        Number(process.env.OT_MULTIPLIER_BPS || 15000),
      );
      breakdown.push({
        workerId: worker.id,
        name: worker.data.name,
        ...pay,
      });
    }
    return {
      ...d,
      breakdown,
      amountMinor: minor(breakdown.reduce((s, r) => s + r.amountMinor, 0)),
    };
  }
  return d;
}
