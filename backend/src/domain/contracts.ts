import { Context, Data, getRecord, list } from "./context";
import { billTotal } from "./money";
export async function contracts(
  c: Context,
  kind: string,
  d: Data,
): Promise<Data> {
  if (kind === "workorder") {
    await getRecord(c, d.contractorId, "contractor");
    const boq = await getRecord(c, d.boqId, "boq");
    if (d.costCode !== boq.data.costCode)
      throw new Error("Work order cost code must match its BOQ");
    const reserved =
      (await list(c, "workorder"))
        .filter((r) => r.data.boqId === d.boqId)
        .reduce((n, r) => n + r.data.quantity, 0) +
      (await list(c, "contractpackage"))
        .filter((r) => r.status !== "REJECTED")
        .reduce(
          (n, r) =>
            n +
            r.data.lines
              .filter((l: Data) => l.boqId === d.boqId)
              .reduce((s: number, l: Data) => s + l.quantity, 0),
          0,
        );
    const extra = (await list(c, "variation"))
      .filter((r) => r.status === "APPROVED" && r.data.boqId === d.boqId)
      .reduce((n, r) => n + r.data.additionalQuantity, 0);
    if (
      Math.round((reserved + d.quantity) * 1000) >
      Math.round((boq.data.quantity + extra) * 1000)
    )
      throw new Error("Work order exceeds remaining approved BOQ quantity");
  }
  if (kind === "bill") {
    const order = await getRecord(c, d.workorderId, "workorder");
    if (
      c.actor.role === "CONTRACTOR" &&
      c.actor.contractorId !== order.data.contractorId
    )
      throw new Error("Work order is not assigned to your contractor account");
    const committed = (await list(c, "bill"))
      .filter((r) => r.data.workorderId === order.id && r.status !== "REJECTED")
      .reduce((s, r) => s + r.data.quantity, 0);
    if (committed + d.quantity > order.data.quantity)
      throw new Error("Bill quantity exceeds remaining work order quantity");
    return {
      ...d,
      contractorId: order.data.contractorId,
      costCode: order.data.costCode,
      ...billTotal(
        d.quantity,
        order.data.rateMinor,
        order.data.retentionBps,
        order.data.taxBps,
        d.advanceMinor,
        d.penaltyMinor,
      ),
      defectsUntil: order.data.defectsUntil,
    };
  }
  return d;
}
