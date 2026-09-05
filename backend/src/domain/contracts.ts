import { Context, Data, getRecord, list } from './context';
import { billTotal } from './money';
export async function contracts(c: Context, kind: string, d: Data): Promise<Data> {
  if (kind === 'workorder') { await getRecord(c, d.contractorId, 'contractor'); await getRecord(c, d.boqId, 'boq'); }
  if (kind === 'bill') {
    const order = await getRecord(c, d.workorderId, 'workorder');
    if (c.actor.role === 'CONTRACTOR' && c.actor.contractorId !== order.data.contractorId) throw new Error('Work order is not assigned to your contractor account');
    const committed = (await list(c, 'bill')).filter(r => r.data.workorderId === order.id && r.status !== 'REJECTED').reduce((s, r) => s + r.data.quantity, 0);
    if (committed + d.quantity > order.data.quantity) throw new Error('Bill quantity exceeds remaining work order quantity');
    return { ...d, contractorId: order.data.contractorId, costCode: order.data.costCode, ...billTotal(d.quantity, order.data.rateMinor, order.data.retentionBps, order.data.taxBps, d.advanceMinor, d.penaltyMinor), defectsUntil: order.data.defectsUntil };
  }
  return d;
}
