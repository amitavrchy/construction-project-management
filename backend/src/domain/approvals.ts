import { Context, getRecord, list, cost, audit } from "./context";
import { assertTransition } from "./states";
import { canApprove, canWrite } from "./access";
import { movingAverage, minor } from "./money";
export async function approve(c: Context, id: string, target: string) {
  const r = await getRecord(c, id);
  assertTransition(r.kind, r.status, target);
  if (target === "SUBMITTED" || target === "CANCELLED") {
    canWrite(c.actor, r.kind);
    if (c.actor.role === "CONTRACTOR" && r.createdBy !== c.actor.id)
      throw new Error("Cannot submit another contractor bill");
  } else if (r.kind === "transfer") canWrite(c.actor, "transfer");
  else {
    canApprove(c.actor, r.kind, target);
    if (
      ["APPROVED", "PM_APPROVED", "ACCOUNTS_APPROVED"].includes(target) &&
      r.createdBy === c.actor.id
    )
      throw new Error("A different person must approve this record");
    if (target === "ACCOUNTS_APPROVED" && r.data.pmApprovedBy === c.actor.id)
      throw new Error("PM and Accounts approvals must be separate people");
  }
  let data = { ...r.data };
  if (target === "APPROVED" && r.kind === "requisition") {
    const material = await getRecord(c, r.data.materialId, "material");
    const stock = await c.tx.stock.findUnique({
      where: {
        siteId_materialId: { siteId: r.data.siteId, materialId: material.id },
      },
    });
    const value = minor(r.data.quantity * (stock?.averageCostMinor || 0));
    if (
      value >
        Number(process.env.REQUISITION_APPROVAL_LIMIT_MINOR || 10000000) &&
      c.actor.role !== "COMPANY_ADMIN"
    )
      throw new Error(
        "Amount exceeds PM threshold; company admin approval required",
      );
  }
  if (r.kind === "bill" && target === "PM_APPROVED") {
    if (
      r.data.gross >
        Number(process.env.BILL_APPROVAL_LIMIT_MINOR || 100000000) &&
      c.actor.role !== "COMPANY_ADMIN"
    )
      throw new Error("Bill exceeds PM approval threshold");
    data.pmApprovedBy = c.actor.id;
  }
  if (r.kind === "bill" && target === "ACCOUNTS_APPROVED")
    await cost(c, "CONTRACTOR_BILL", id, r.data.gross, r.data.costCode);
  if (r.kind === "wage" && target === "APPROVED")
    await cost(c, "LABOR_WAGE", id, r.data.amountMinor, r.data.costCode);
  if (r.kind === "budget" && target === "APPROVED") {
    data.approvedBy = c.actor.id;
    const previous = (await list(c, "budget")).filter(
      (b) => b.status === "APPROVED" && b.data.costCode === r.data.costCode,
    );
    for (const p of previous)
      await c.tx.record.update({
        where: { id: p.id },
        data: { status: "SUPERSEDED" },
      });
  }
  if (r.kind === "transfer" && target === "RECEIVED") {
    const where = {
      siteId_materialId: {
        siteId: r.data.destinationSiteId,
        materialId: r.data.materialId,
      },
    };
    const stock = await c.tx.stock.findUnique({ where });
    const averageCostMinor = movingAverage(
      Number(stock?.quantity || 0),
      stock?.averageCostMinor || 0,
      r.data.quantity,
      r.data.costMinor,
    );
    await c.tx.stock.upsert({
      where,
      create: {
        siteId: r.data.destinationSiteId,
        materialId: r.data.materialId,
        quantity: r.data.quantity,
        averageCostMinor,
      },
      update: { quantity: { increment: r.data.quantity }, averageCostMinor },
    });
  }
  const result = await c.tx.record.update({
    where: { id },
    data: { status: target, data, version: { increment: 1 } },
  });
  await audit(c, `${r.kind}.${target.toLowerCase()}`, id, {
    from: r.status,
    to: target,
  });
  return result;
}
