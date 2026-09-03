export function minor(value: number) {
  if (!Number.isFinite(value) || Math.abs(value) > 2_000_000_000) throw new Error('Amount exceeds supported range');
  return Math.round(value);
}
export function billTotal(qty: number, rate: number, retentionBps: number, taxBps: number, advance = 0, penalty = 0) {
  const gross = minor(qty * rate), retention = minor(gross * retentionBps / 10000), tax = minor(gross * taxBps / 10000);
  const net = gross - retention - tax - advance - penalty;
  if (net < 0) throw new Error('Deductions exceed gross bill');
  return { gross, retention, tax, advance, penalty, net };
}
export function wage(days: number, dailyRate: number, overtimeHours: number, multiplierBps = 15000) {
  return minor(days * dailyRate + overtimeHours * dailyRate / 8 * multiplierBps / 10000);
}
export function movingAverage(oldQty: number, oldCost: number, received: number, cost: number) {
  if (received <= 0) throw new Error('Receipt quantity must be positive');
  return minor((oldQty * oldCost + received * cost) / (oldQty + received));
}
