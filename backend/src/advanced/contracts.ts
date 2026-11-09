import { BadRequestException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Context, Data, getRecord, list } from "../domain/context";
import { minor, billTotal } from "../domain/money";
export async function advancedContracts(
  c: Context,
  kind: string,
  d: Data,
  id?: string,
): Promise<Data> {
  if (kind === "contractpackage") {
    await getRecord(c, d.contractorId, "contractor");
    const lines = [];
    for (const line of d.lines) {
      const boq = await getRecord(c, line.boqId, "boq");
      if (line.costCode !== boq.data.costCode)
        throw new BadRequestException(
          "Contract cost code must match the selected BOQ item",
        );
      const ordered =
        (await list(c, "contractpackage"))
          .filter((r) => r.id !== id && r.status !== "REJECTED")
          .reduce(
            (n, r) =>
              n +
              r.data.lines
                .filter((l: Data) => l.boqId === line.boqId)
                .reduce((s: number, l: Data) => s + l.quantity, 0),
            0,
          ) +
        (await list(c, "workorder"))
          .filter((r) => r.data.boqId === line.boqId)
          .reduce((n, r) => n + r.data.quantity, 0);
      const varied = (await list(c, "variation"))
        .filter((r) => r.status === "APPROVED" && r.data.boqId === line.boqId)
        .reduce((n, r) => n + r.data.additionalQuantity, 0);
      if (
        Math.round((ordered + line.quantity) * 1000) >
        Math.round((boq.data.quantity + varied) * 1000)
      )
        throw new BadRequestException(
          "Contract packages exceed the approved BOQ quantity",
        );
      lines.push({
        ...line,
        lineId: randomUUID(),
        description: boq.data.description,
        unit: boq.data.unit,
        amountMinor: minor(line.quantity * line.rateMinor),
      });
    }
    return {
      ...d,
      lines,
      totalMinor: minor(lines.reduce((s, l) => s + l.amountMinor, 0)),
    };
  }
  if (kind === "measurementbill") {
    const order = await getRecord(c, d.contractpackageId, "contractpackage");
    if (order.status !== "APPROVED")
      throw new BadRequestException("Contract package must be approved");
    if (
      c.actor.role === "CONTRACTOR" &&
      c.actor.contractorId !== order.data.contractorId
    )
      throw new BadRequestException(
        "This contract is not assigned to your account",
      );
    const bills = (await list(c, "measurementbill")).filter(
      (r) => r.data.contractpackageId === order.id && r.status !== "REJECTED",
    );
    const recovered = bills.reduce((s, r) => s + r.data.advanceMinor, 0);
    if (recovered + d.advanceMinor > order.data.advanceLimitMinor)
      throw new BadRequestException(
        "Advance recovery exceeds the contract advance limit",
      );
    const lines = [];
    for (const line of d.lines) {
      const source = order.data.lines.find(
        (l: Data) => l.lineId === line.lineId,
      );
      if (!source)
        throw new BadRequestException(
          "Measurement line is not in this contract",
        );
      const previous = bills.reduce(
        (s, r) =>
          s +
          r.data.lines
            .filter((l: Data) => l.lineId === line.lineId)
            .reduce((n: number, l: Data) => n + l.quantity, 0),
        0,
      );
      if (
        Math.round((previous + line.quantity) * 1000) >
        Math.round(source.quantity * 1000)
      )
        throw new BadRequestException(
          `Measurement exceeds remaining quantity: ${source.description}`,
        );
      lines.push({
        ...source,
        quantity: line.quantity,
        previousQuantity: previous,
        cumulativeQuantity:
          Math.round((previous + line.quantity) * 1000) / 1000,
        amountMinor: minor(line.quantity * source.rateMinor),
      });
    }
    const gross = minor(lines.reduce((s, l) => s + l.amountMinor, 0)),
      totals = billTotal(
        1,
        gross,
        order.data.retentionBps,
        order.data.taxBps,
        d.advanceMinor,
        d.penaltyMinor,
      );
    return {
      ...d,
      lines,
      contractorId: order.data.contractorId,
      ...totals,
      totalMinor: totals.gross,
      paidMinor: 0,
      defectsUntil: order.data.defectsUntil,
    };
  }
  if (kind === "payment") {
    const bill = await getRecord(c, d.billId, "measurementbill");
    if (!["ACCOUNTS_APPROVED", "PARTIALLY_PAID"].includes(bill.status))
      throw new BadRequestException(
        "Bill must be Accounts-approved with an outstanding balance",
      );
    if ((bill.data.paidMinor || 0) + d.amountMinor > bill.data.net)
      throw new BadRequestException("Payment exceeds outstanding net payable");
    const paidMinor = (bill.data.paidMinor || 0) + d.amountMinor;
    await c.tx.record.update({
      where: { id: bill.id },
      data: {
        data: { ...bill.data, paidMinor },
        status: paidMinor === bill.data.net ? "PAID" : "PARTIALLY_PAID",
        version: { increment: 1 },
      },
    });
    return {
      ...d,
      contractorId: bill.data.contractorId,
      outstandingMinor: bill.data.net - paidMinor,
    };
  }
  if (kind === "retentionpayment") {
    const bill = await getRecord(c, d.billId, "measurementbill");
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
    }).format(new Date());
    if (
      bill.status !== "PAID" ||
      !bill.data.retention ||
      bill.data.retentionReleasedOn ||
      bill.data.defectsUntil > today
    )
      throw new BadRequestException("Retention is not eligible for release");
    await c.tx.record.update({
      where: { id: bill.id },
      data: {
        data: {
          ...bill.data,
          retentionReleasedOn: d.date,
          retentionReference: d.reference,
        },
        version: { increment: 1 },
      },
    });
    return {
      ...d,
      amountMinor: bill.data.retention,
      contractorId: bill.data.contractorId,
    };
  }
  return d;
}
