import { Context, Data, getRecord, requireSite, list, cost } from "./context";
import { movingAverage, minor } from "./money";
export async function inventory(
  c: Context,
  kind: string,
  d: Data,
  id: string,
): Promise<Data> {
  if (["receipt", "requisition", "transfer"].includes(kind)) {
    await requireSite(c, d.siteId);
    await getRecord(c, d.materialId, "material");
  }
  if (kind === "receipt") {
    await getRecord(c, d.supplierId, "supplier");
    const duplicate = (await list(c, "receipt")).some(
      (r) =>
        r.data.supplierId === d.supplierId &&
        r.data.invoiceNo.toLowerCase() === d.invoiceNo.toLowerCase(),
    );
    if (duplicate)
      throw new Error("Supplier invoice has already been received");
    const where = {
      siteId_materialId: { siteId: d.siteId, materialId: d.materialId },
    };
    const stock = await c.tx.stock.findUnique({ where });
    const averageCostMinor = movingAverage(
      Number(stock?.quantity || 0),
      stock?.averageCostMinor || 0,
      d.quantity,
      d.costMinor,
    );
    await c.tx.stock.upsert({
      where,
      create: {
        siteId: d.siteId,
        materialId: d.materialId,
        quantity: d.quantity,
        averageCostMinor,
      },
      update: { quantity: { increment: d.quantity }, averageCostMinor },
    });
  }
  if (kind === "issue") {
    const req = await getRecord(c, d.requisitionId, "requisition");
    if (!["APPROVED", "PARTIAL_ISSUED"].includes(req.status))
      throw new Error("Requisition must be approved before issue");
    const issued = Number(req.data.issued || 0);
    if (issued + d.quantity > req.data.quantity)
      throw new Error("Issue exceeds remaining requisition quantity");
    const where = {
      siteId_materialId: {
        siteId: req.data.siteId,
        materialId: req.data.materialId,
      },
    };
    const stock = await c.tx.stock.findUnique({ where });
    if (!stock || Number(stock.quantity) < d.quantity)
      throw new Error("Insufficient stock. Receive materials before issuing.");
    const value = minor(d.quantity * stock.averageCostMinor);
    await c.tx.stock.update({
      where,
      data: { quantity: { decrement: d.quantity } },
    });
    await c.tx.record.update({
      where: { id: req.id },
      data: {
        status:
          issued + d.quantity >= req.data.quantity
            ? "ISSUED"
            : "PARTIAL_ISSUED",
        data: { ...req.data, issued: issued + d.quantity },
      },
    });
    await cost(c, "MATERIAL_ISSUE", id, value, req.data.costCode);
    return {
      ...d,
      siteId: req.data.siteId,
      materialId: req.data.materialId,
      costMinor: stock.averageCostMinor,
      amountMinor: value,
      costCode: req.data.costCode,
    };
  }
  if (kind === "return") {
    const issue = await getRecord(c, d.issueId, "issue");
    const returned = (await list(c, "return"))
      .filter((r) => r.data.issueId === issue.id)
      .reduce((s, r) => s + r.data.quantity, 0);
    if (d.quantity + returned > issue.data.quantity)
      throw new Error("Return exceeds originally issued quantity");
    const where = {
      siteId_materialId: {
        siteId: issue.data.siteId,
        materialId: issue.data.materialId,
      },
    };
    const stock = await c.tx.stock.findUniqueOrThrow({ where });
    const averageCostMinor = movingAverage(
      Number(stock.quantity),
      stock.averageCostMinor,
      d.quantity,
      issue.data.costMinor,
    );
    await c.tx.stock.update({
      where,
      data: { quantity: { increment: d.quantity }, averageCostMinor },
    });
    await cost(
      c,
      "MATERIAL_RETURN",
      id,
      -minor(d.quantity * issue.data.costMinor),
      issue.data.costCode,
    );
  }
  if (kind === "transfer") {
    await requireSite(c, d.destinationSiteId);
    if (d.destinationSiteId === d.siteId)
      throw new Error("Choose a different destination site");
    const where = {
      siteId_materialId: { siteId: d.siteId, materialId: d.materialId },
    };
    const stock = await c.tx.stock.findUnique({ where });
    if (!stock || Number(stock.quantity) < d.quantity)
      throw new Error("Insufficient transfer stock");
    await c.tx.stock.update({
      where,
      data: { quantity: { decrement: d.quantity } },
    });
    return { ...d, costMinor: stock.averageCostMinor };
  }
  return d;
}
