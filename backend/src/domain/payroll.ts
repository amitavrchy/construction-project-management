import { Data } from "./context";
import { minor, wage } from "./money";
export function workerPay(
  worker: Data,
  entries: Data[],
  worklogs: Data[],
  multiplierBps = 15000,
) {
  const days = entries.reduce(
      (n, e) =>
        n + (e.status === "PRESENT" ? 1 : e.status === "HALF" ? 0.5 : 0),
      0,
    ),
    otHours = entries.reduce((n, e) => n + e.otHours, 0),
    basis = worker.payBasis || "DAILY";
  let amount = 0,
    rate = worker.dailyRateMinor || 0,
    units = 0;
  if (basis === "DAILY") amount = wage(days, rate, otHours, multiplierBps);
  if (basis === "HOURLY") {
    rate = worker.hourlyRateMinor;
    amount = minor(days * 8 * rate + (otHours * rate * multiplierBps) / 10000);
  }
  if (basis === "MONTHLY") {
    rate = worker.monthlyRateMinor;
    for (const entry of entries) {
      const [year, month] = entry.date.split("-").map(Number);
      const calendarDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const fraction =
        entry.status === "PRESENT" ? 1 : entry.status === "HALF" ? 0.5 : 0;
      amount +=
        (rate / calendarDays) * fraction +
        (((entry.otHours * rate) / calendarDays / 8) * multiplierBps) / 10000;
    }
    amount = minor(amount);
  }
  if (basis === "CONTRACT") {
    rate = worker.unitRateMinor;
    units = worklogs.reduce((n, l) => n + l.quantity, 0);
    amount = minor(worklogs.reduce((n, l) => n + l.totalMinor, 0));
  }
  return {
    payBasis: basis,
    days,
    otHours,
    units,
    rateMinor: rate,
    amountMinor: amount,
  };
}
