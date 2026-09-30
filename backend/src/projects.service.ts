import {
  Injectable,
  Inject,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Db } from "./db";
import { Actor, canWrite } from "./domain/access";
import { projectSchema, parseRecord } from "./domain/schemas";
import { Context, Data, audit, getRecord } from "./domain/context";
import { inventory } from "./domain/inventory";
import { labor } from "./domain/labor";
import { contracts } from "./domain/contracts";
import { progress } from "./domain/progress";
import { recordKey } from "./domain/keys";
import { approve } from "./domain/approvals";
import { Cache } from "./cache";
@Injectable()
export class ProjectsService {
  constructor(
    @Inject(Db) readonly db: Db,
    @Inject(Cache) private cache?: Cache,
  ) {}
  async stockSnapshot(projectId: string) {
    const load = () =>
      this.db.stock.findMany({ where: { site: { projectId } } });
    return this.cache
      ? this.cache.read(`stock:${projectId}`, 10, load)
      : load();
  }
  async boqTree(actor: Actor, projectId: string) {
    actor = await this.scope(actor, projectId);
    if (actor.role === "CONTRACTOR") throw new ForbiddenException();
    const load = async () => {
      const records = await this.db.record.findMany({
        where: { projectId, kind: "boq" },
      });
      return records.reduce<Record<string, unknown[]>>((tree, r) => {
        const d = r.data as any;
        (tree[d.costCode] ||= []).push({ id: r.id, ...d });
        return tree;
      }, {});
    };
    return this.cache ? this.cache.read(`boq:${projectId}`, 60, load) : load();
  }
  async scope(actor: Actor, projectId: string): Promise<Actor> {
    const project = await this.db.project.findFirst({
      where: { id: projectId, companyId: actor.companyId },
    });
    if (!project) throw new ForbiddenException("Project access denied");
    if (actor.role === "COMPANY_ADMIN") return actor;
    const member = await this.db.member.findUnique({
      where: { projectId_userId: { projectId, userId: actor.id } },
    });
    if (!member) throw new ForbiddenException("Project membership required");
    return { ...actor, role: member.role };
  }
  async projects(actor: Actor) {
    return this.db.project.findMany({
      where: {
        companyId: actor.companyId,
        ...(actor.role !== "COMPANY_ADMIN"
          ? { members: { some: { userId: actor.id } } }
          : {}),
      },
      include: { sites: true },
      orderBy: { createdAt: "desc" },
    });
  }
  async createProject(actor: Actor, input: unknown) {
    if (actor.role !== "COMPANY_ADMIN")
      throw new ForbiddenException("Company admin required");
    const data = projectSchema.parse(input);
    return this.db.project.create({
      data: {
        ...data,
        companyId: actor.companyId,
        sites: { create: { name: "Main site", address: data.address } },
      },
      include: { sites: true },
    });
  }
  async snapshot(actor: Actor, projectId: string) {
    const scoped = await this.scope(actor, projectId);
    return this.db.$transaction(
      async (tx) => {
        const project = await tx.project.findUniqueOrThrow({
          where: { id: projectId },
          include: { sites: true },
        });
        let records = await tx.record.findMany({
          where: { projectId },
          orderBy: { createdAt: "desc" },
        });
        if (scoped.role === "CONTRACTOR")
          records = records.filter((r) => {
            const d = r.data as any;
            return (
              (r.kind === "contractor" && r.id === actor.contractorId) ||
              ([
                "workorder",
                "bill",
                "contractpackage",
                "measurementbill",
                "payment",
                "retentionpayment",
              ].includes(r.kind) &&
                d.contractorId === actor.contractorId)
            );
          });
        records = records.map((r) => {
          const data = r.data as Data;
          if (r.kind === "worker")
            return {
              ...r,
              data: {
                payBasis: "DAILY",
                hourlyRateMinor: 0,
                monthlyRateMinor: 0,
                unitRateMinor: 0,
                ...data,
              },
            };
          if (r.kind === "document") {
            const { content, ...metadata } = data;
            return {
              ...r,
              data: {
                ...metadata,
                downloadUrl: `/api/projects/${projectId}/files/${r.id}`,
              },
            };
          }
          if (r.kind === "progress" && data.photo) {
            const { photo, ...metadata } = data;
            return {
              ...r,
              data: {
                ...metadata,
                photoUrl: `/api/projects/${projectId}/files/${r.id}`,
              },
            };
          }
          return r;
        });
        return {
          project,
          role: scoped.role,
          records,
          stock:
            scoped.role === "CONTRACTOR"
              ? []
              : await tx.stock.findMany({ where: { site: { projectId } } }),
          ledger:
            scoped.role === "CONTRACTOR"
              ? []
              : await tx.ledger.findMany({
                  where: { projectId },
                  orderBy: { createdAt: "desc" },
                }),
          audits:
            scoped.role === "CONTRACTOR"
              ? []
              : await tx.audit.findMany({
                  where: { projectId },
                  take: 50,
                  orderBy: { createdAt: "desc" },
                }),
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
  }
  async create(actor: Actor, projectId: string, kind: string, input: unknown) {
    actor = await this.scope(actor, projectId);
    canWrite(actor, kind);
    const parsed = parseRecord(kind, input);
    const created = await this.db.atomic(async (tx) => {
      const c: Context = { tx, projectId, actor };
      const project = await tx.project.findUniqueOrThrow({
        where: { id: projectId },
      });
      if (["COMPLETED", "CANCELLED"].includes(project.status))
        throw new Error("This project is closed");
      const id = randomUUID();
      let data = await inventory(c, kind, parsed, id);
      data = await labor(c, kind, data);
      data = await contracts(c, kind, data);
      data = await progress(c, kind, data);
      if (
        kind === "document" &&
        !/^data:(application\/pdf|image\/(png|jpeg|webp));base64,[A-Za-z0-9+/=]+$/.test(
          data.content,
        )
      )
        throw new Error("Only PDF, PNG, JPEG or WebP files are supported");
      if (kind === "budget")
        data.versionNumber =
          (await tx.record.count({
            where: {
              projectId,
              kind,
              data: { path: ["costCode"], equals: data.costCode },
            },
          })) + 1;
      const status =
        kind === "wage"
          ? "CALCULATED"
          : kind === "transfer"
            ? "IN_TRANSIT"
            : [
                  "receipt",
                  "issue",
                  "return",
                  "attendance",
                  "progress",
                  "document",
                  "boq",
                  "material",
                  "worker",
                  "contractor",
                  "workorder",
                  "supplier",
                ].includes(kind)
              ? "POSTED"
              : "DRAFT";
      const record = await tx.record.create({
        data: {
          id,
          projectId,
          kind,
          key: recordKey(kind, data, id),
          status,
          data,
          createdBy: actor.id,
        },
      });
      await audit(c, `${kind}.created`, id);
      return record;
    });
    await this.cache?.invalidate(projectId);
    return created;
  }
  async transition(
    actor: Actor,
    projectId: string,
    id: string,
    status: string,
    note = "",
  ) {
    actor = await this.scope(actor, projectId);
    return this.db.atomic(async (tx) => {
      const p = await tx.project.findUniqueOrThrow({
        where: { id: projectId },
      });
      if (["COMPLETED", "CANCELLED"].includes(p.status))
        throw new Error("This project is closed");
      return approve({ tx, projectId, actor }, id, status, note);
    });
  }
  async bulkAttendance(actor: Actor, projectId: string, inputs: unknown[]) {
    actor = await this.scope(actor, projectId);
    canWrite(actor, "attendance");
    if (!Array.isArray(inputs) || inputs.length < 1 || inputs.length > 200)
      throw new Error("Submit between 1 and 200 attendance rows");
    const parsed = inputs.map((input) => parseRecord("attendance", input));
    return this.db.atomic(async (tx) => {
      const c = { tx, projectId, actor };
      const project = await tx.project.findUniqueOrThrow({
        where: { id: projectId },
      });
      if (["COMPLETED", "CANCELLED"].includes(project.status))
        throw new Error("This project is closed");
      const result = [];
      for (const input of parsed) {
        const data = await labor(c, "attendance", input);
        const id = randomUUID();
        result.push(
          await tx.record.create({
            data: {
              id,
              projectId,
              kind: "attendance",
              key: recordKey("attendance", data, id),
              status: "POSTED",
              data,
              createdBy: actor.id,
            },
          }),
        );
      }
      await audit(c, "attendance.bulk_created", projectId, {
        count: result.length,
      });
      return result;
    });
  }
  async editBudget(
    actor: Actor,
    projectId: string,
    id: string,
    input: unknown,
  ) {
    actor = await this.scope(actor, projectId);
    canWrite(actor, "budget");
    const parsed = parseRecord("budget", input);
    return this.db.atomic(async (tx) => {
      const c = { tx, projectId, actor };
      const r = await getRecord(c, id, "budget");
      if (r.status !== "DRAFT")
        throw new Error("Only draft budgets can be edited");
      const p = await tx.project.findUniqueOrThrow({
        where: { id: projectId },
      });
      if (["COMPLETED", "CANCELLED"].includes(p.status))
        throw new Error("This project is closed");
      if (r.data.previousId && parsed.costCode !== r.data.costCode)
        throw new Error("A revision must keep its original cost code");
      const result = await tx.record.update({
        where: { id },
        data: {
          data: {
            ...r.data,
            ...parsed,
            diffMinor:
              parsed.amountMinor -
              (r.data.previousAmountMinor || r.data.amountMinor),
          },
          version: { increment: 1 },
        },
      });
      await audit(c, "budget.edited", id, {
        previousAmountMinor: r.data.amountMinor,
        amountMinor: parsed.amountMinor,
      });
      return result;
    });
  }
  async editCatalog(actor: Actor, projectId: string, id: string, input: any) {
    actor = await this.scope(actor, projectId);
    const { expectedVersion, ...payload } = input;
    return this.db.atomic(async (tx) => {
      const c = { tx, projectId, actor };
      const r = await getRecord(c, id);
      if (!["worker", "material", "supplier", "contractor"].includes(r.kind))
        throw new Error("Only catalog records are editable here");
      canWrite(actor, r.kind);
      if (r.version !== expectedVersion)
        throw new ForbiddenException(
          "This record changed. Refresh before editing.",
        );
      const project = await tx.project.findUniqueOrThrow({
        where: { id: projectId },
      });
      if (["COMPLETED", "CANCELLED"].includes(project.status))
        throw new Error("This project is closed");
      const data = parseRecord(r.kind, payload);
      if (
        r.kind === "worker" &&
        (r.data.payBasis || "DAILY") !== data.payBasis
      ) {
        const used = await tx.record.findFirst({
          where: {
            projectId,
            kind: { in: ["attendance", "worklog"] },
            data: { path: ["workerId"], equals: id },
          },
        });
        if (used)
          throw new Error(
            "A worker with attendance or certified work cannot change pay basis",
          );
      }
      const result = await tx.record.update({
        where: { id },
        data: {
          data,
          key: recordKey(r.kind, data, id),
          version: { increment: 1 },
        },
      });
      await audit(c, `${r.kind}.edited`, id, { before: r.data, after: data });
      return result;
    });
  }
  async releaseRetention(actor: Actor, projectId: string, id: string) {
    actor = await this.scope(actor, projectId);
    if (actor.role !== "ACCOUNTANT")
      throw new ForbiddenException("Accounts approval required");
    return this.db.atomic(async (tx) => {
      const c = { tx, projectId, actor };
      const bill = await getRecord(c, id, "bill");
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Dhaka",
      }).format(new Date());
      if (
        bill.status !== "PAID" ||
        !bill.data.retention ||
        bill.data.retentionReleasedOn ||
        bill.data.defectsUntil > today
      )
        throw new Error("Retention is not eligible for release");
      await audit(c, "bill.retention_released", id, {
        amountMinor: bill.data.retention,
      });
      return tx.record.update({
        where: { id },
        data: {
          data: {
            ...bill.data,
            retentionReleasedOn: today,
            retentionReleasedBy: actor.id,
          },
          version: { increment: 1 },
        },
      });
    });
  }
  async reviseBudget(actor: Actor, projectId: string, id: string) {
    actor = await this.scope(actor, projectId);
    canWrite(actor, "budget");
    return this.db.atomic(async (tx) => {
      const c = { tx, projectId, actor };
      const source = await getRecord(c, id, "budget");
      const p = await tx.project.findUniqueOrThrow({
        where: { id: projectId },
      });
      if (["COMPLETED", "CANCELLED"].includes(p.status))
        throw new Error("This project is closed");
      if (source.status !== "APPROVED")
        throw new Error("Only approved budgets can be revised");
      const cloneId = randomUUID();
      const result = await tx.record.create({
        data: {
          id: cloneId,
          key: cloneId,
          kind: "budget",
          projectId,
          createdBy: actor.id,
          data: {
            ...source.data,
            name: `${source.data.name} revision`,
            previousId: id,
            previousAmountMinor: source.data.amountMinor,
            diffMinor: 0,
            versionNumber: (source.data.versionNumber || 1) + 1,
          },
        },
      });
      await audit(c, "budget.revised", cloneId, { previousId: id });
      return result;
    });
  }
}
