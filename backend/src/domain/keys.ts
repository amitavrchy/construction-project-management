import { Data } from './context';
export function recordKey(kind: string, d: Data, id: string) {
  if (kind === 'boq') return d.code.toLowerCase();
  if (kind === 'material') return d.sku.toLowerCase();
  if (kind === 'attendance') return `${d.siteId}:${d.workerId}:${d.date}`;
  if (kind === 'receipt') return `${d.supplierId}:${d.invoiceNo.toLowerCase()}`;
  if (kind === 'bill') return `${d.workorderId}:${d.billNo.toLowerCase()}`;
  return id;
}
