import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Actor } from "./access";
export type Tx = Prisma.TransactionClient;
export type Data = Record<string, any>;
export type Context = { tx: Tx; projectId: string; actor: Actor };
export async function getRecord(c: Context, id: string, kind?: string) {
  const record = await c.tx.record.findFirst({
    where: { id, projectId: c.projectId, ...(kind ? { kind } : {}) },
  });
  if (!record)
    throw new BadRequestException(
      `${kind || "Record"} not found in this project`,
    );
  return { ...record, data: record.data as Data };
}
export async function requireSite(c: Context, id: string) {
  if (!(await c.tx.site.findFirst({ where: { id, projectId: c.projectId } })))
    throw new BadRequestException("Site does not belong to this project");
}
export async function list(c: Context, kind: string) {
  return (
    await c.tx.record.findMany({ where: { projectId: c.projectId, kind } })
  ).map((r) => ({ ...r, data: r.data as Data }));
}
export async function cost(
  c: Context,
  sourceType: string,
  sourceId: string,
  amountMinor: number,
  costCode: string,
) {
  await c.tx.ledger.create({
    data: {
      projectId: c.projectId,
      sourceType,
      sourceId,
      amountMinor,
      costCode,
    },
  });
}
export async function audit(
  c: Context,
  action: string,
  entityId: string,
  detail: Data = {},
) {
  await c.tx.audit.create({
    data: {
      projectId: c.projectId,
      actorId: c.actor.id,
      action,
      entityId,
      detail,
    },
  });
}
