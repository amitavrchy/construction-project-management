import { BadRequestException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  Context,
  Data,
  getRecord,
  requireSite,
  list,
  cost,
} from "../domain/context";
import { movingAverage, minor } from "../domain/money";
import { requiredApprover } from "./permissions";
export async function advancedMaterials(
  c: Context,
  kind: string,
  d: Data,
  id: string,
): Promise<Data> {
  if (["purchaseorder", "materialrequest"].includes(kind)) {
    await requireSite(c, d.siteId);
    if (kind === "purchaseorder") await getRecord(c, d.supplierId, "supplier");
    const lines = [];
    for (const line of d.lines) {
      const material = await getRecord(c, line.materialId, "material");
      const stock =
        kind === "materialrequest"
          ? await c.tx.stock.findUnique({
              where: {
                siteId_materialId: {
                  siteId: d.siteId,
                  materialId: line.materialId,
                },
              },
            })
          : null;
      const costMinor = stock ? stock.averageCostMinor : line.costMinor;
      lines.push({
        ...line,
        lineId: randomUUID(),
        materialName: material.data.name,
        unit: material.data.unit,
        costMinor,
        amountMinor: minor(line.quantity * costMinor),
        received: 0,
        issued: 0,
      });
    }
    return {
      ...d,
      lines,
      totalMinor: minor(lines.reduce((s, l) => s + l.amountMinor, 0)),
    };
  }
  if (kind === "delivery") {
    const order = await getRecord(c, d.purchaseorderId, "purchaseorder");
    if (!["APPROVED", "PARTIAL_RECEIVED"].includes(order.status))
      throw new BadRequestException(
        "Purchase order must be approved and have remaining quantities",
      );
    const duplicates = [
      ...(await list(c, "delivery")),
      ...(await list(c, "receipt")),
    ].some(
      (r) =>
        r.data.supplierId === order.data.supplierId &&
        r.data.invoiceNo?.toLowerCase() === d.invoiceNo.toLowerCase(),
    );
    if (duplicates)
      throw new BadRequestException("Supplier invoice was already received");
    const lines = [];
    const updated = order.data.lines.map((l: Data) => ({ ...l }));
    for (const line of d.lines) {
      const source = updated.find((l: Data) => l.lineId === line.lineId);
      if (
        !source ||
        Math.round((source.received + line.quantity) * 1000) >
          Math.round(source.quantity * 1000)
      )
        throw new BadRequestException(
          "Delivery exceeds remaining purchase order quantity",
        );
      const where = {
        siteId_materialId: {
          siteId: order.data.siteId,
          materialId: source.materialId,
        },
      };
      const stock = await c.tx.stock.findUnique({ where });
      const averageCostMinor = movingAverage(
        Number(stock?.quantity || 0),
        stock?.averageCostMinor || 0,
        line.quantity,
        source.costMinor,
      );
      await c.tx.stock.upsert({
        where,
        create: {
          ...where.siteId_materialId,
          quantity: line.quantity,
          averageCostMinor,
        },
        update: { quantity: { increment: line.quantity }, averageCostMinor },
      });
      source.received =
        Math.round((source.received + line.quantity) * 1000) / 1000;
      lines.push({
        ...source,
        quantity: line.quantity,
        amountMinor: minor(line.quantity * source.costMinor),
      });
    }
    await c.tx.record.update({
      where: { id: order.id },
      data: {
        data: { ...order.data, lines: updated },
        status: updated.every((l: Data) => l.received >= l.quantity)
          ? "RECEIVED"
          : "PARTIAL_RECEIVED",
        version: { increment: 1 },
      },
    });
    return {
      ...d,
      siteId: order.data.siteId,
      supplierId: order.data.supplierId,
      lines,
      totalMinor: minor(lines.reduce((s, l) => s + l.amountMinor, 0)),
    };
  }
  if (kind === "dispatch") {
    const request = await getRecord(c, d.requestId, "materialrequest");
    if (!["APPROVED", "PARTIAL_ISSUED"].includes(request.status))
      throw new BadRequestException("Material request must be approved");
    let currentValue = 0;
    for (const line of request.data.lines) {
      const stock = await c.tx.stock.findUnique({
        where: {
          siteId_materialId: {
            siteId: request.data.siteId,
            materialId: line.materialId,
          },
        },
      });
      currentValue +=
        line.quantity * (stock?.averageCostMinor || line.costMinor);
    }
    if (
      (await requiredApprover(c, "materialrequest", currentValue)) ===
        "COMPANY_ADMIN" &&
      request.data.approvedRole !== "COMPANY_ADMIN"
    )
      throw new BadRequestException(
        "Valuation or approval policy changed. Reauthorize this material request before issuing.",
      );
    const updated = request.data.lines.map((l: Data) => ({ ...l })),
      lines = [];
    for (let i = 0; i < d.lines.length; i++) {
      const line = d.lines[i],
        source = updated.find((l: Data) => l.lineId === line.lineId);
      if (
        !source ||
        Math.round((source.issued + line.quantity) * 1000) >
          Math.round(source.quantity * 1000)
      )
        throw new BadRequestException(
          "Issue exceeds outstanding request quantity",
        );
      const where = {
        siteId_materialId: {
          siteId: request.data.siteId,
          materialId: source.materialId,
        },
      };
      const stock = await c.tx.stock.findUnique({ where });
      if (!stock || Number(stock.quantity) < line.quantity)
        throw new BadRequestException(
          `Insufficient stock for ${source.materialName}`,
        );
      const amountMinor = minor(line.quantity * stock.averageCostMinor);
      await c.tx.stock.update({
        where,
        data: { quantity: { decrement: line.quantity } },
      });
      await cost(
        c,
        "BATCH_MATERIAL_ISSUE",
        `${id}:${i}`,
        amountMinor,
        source.costCode,
      );
      source.issued = Math.round((source.issued + line.quantity) * 1000) / 1000;
      lines.push({
        ...source,
        quantity: line.quantity,
        costMinor: stock.averageCostMinor,
        amountMinor,
      });
    }
    await c.tx.record.update({
      where: { id: request.id },
      data: {
        data: { ...request.data, lines: updated },
        status: updated.every((l: Data) => l.issued >= l.quantity)
          ? "ISSUED"
          : "PARTIAL_ISSUED",
        version: { increment: 1 },
      },
    });
    return {
      ...d,
      siteId: request.data.siteId,
      lines,
      totalMinor: minor(lines.reduce((s, l) => s + l.amountMinor, 0)),
    };
  }
  if (kind === "batchreturn") {
    const dispatch = await getRecord(c, d.dispatchId, "dispatch");
    const prior = (await list(c, "batchreturn")).filter(
      (r) => r.data.dispatchId === dispatch.id,
    );
    const lines = [];
    for (let i = 0; i < d.lines.length; i++) {
      const line = d.lines[i],
        source = dispatch.data.lines.find(
          (l: Data) => l.lineId === line.lineId,
        );
      const returned = prior.reduce(
        (n, r) =>
          n +
          r.data.lines
            .filter((l: Data) => l.lineId === line.lineId)
            .reduce((sum: number, l: Data) => sum + l.quantity, 0),
        0,
      );
      if (
        !source ||
        Math.round((returned + line.quantity) * 1000) >
          Math.round(source.quantity * 1000)
      )
        throw new BadRequestException(
          "Return exceeds original dispatch quantity",
        );
      const where = {
        siteId_materialId: {
          siteId: dispatch.data.siteId,
          materialId: source.materialId,
        },
      };
      const stock = await c.tx.stock.findUniqueOrThrow({ where });
      const averageCostMinor = movingAverage(
        Number(stock.quantity),
        stock.averageCostMinor,
        line.quantity,
        source.costMinor,
      );
      await c.tx.stock.update({
        where,
        data: { quantity: { increment: line.quantity }, averageCostMinor },
      });
      const amountMinor = minor(line.quantity * source.costMinor);
      await cost(
        c,
        "BATCH_MATERIAL_RETURN",
        `${id}:${i}`,
        -amountMinor,
        source.costCode,
      );
      lines.push({ ...source, quantity: line.quantity, amountMinor });
    }
    return {
      ...d,
      lines,
      siteId: dispatch.data.siteId,
      totalMinor: -minor(lines.reduce((n, l) => n + l.amountMinor, 0)),
    };
  }
  return d;
}
