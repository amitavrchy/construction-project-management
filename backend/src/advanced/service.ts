import {
  Injectable,
  Inject,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Db } from "../db";
import { ProjectsService } from "../projects.service";
import { Actor } from "../domain/access";
import {
  Context,
  Data,
  getRecord,
  list,
  audit,
  cost,
  requireSite,
} from "../domain/context";
import { minor } from "../domain/money";
import { parseAdvanced, commandSchema } from "./schemas";
import { assertAdvancedWrite, managers } from "./permissions";
import { advancedMaterials } from "./materials";
import { advancedContracts } from "./contracts";
import { criticalPath, earnedValue } from "./planning";
import { budgetReport } from "../reports";
import { advancedKey } from "./keys";
@Injectable()
export class AdvancedService {
  constructor(
    @Inject(Db) readonly db: Db,
    @Inject(ProjectsService) readonly projects: ProjectsService,
  ) {}
  private async context(
    actor: Actor,
    projectId: string,
    run: (c: Context) => Promise<any>,
  ) {
    actor = await this.projects.scope(actor, projectId);
    return this.db.atomic(async (tx) => {
      const p = await tx.project.findUniqueOrThrow({
        where: { id: projectId },
      });
      if (["COMPLETED", "CANCELLED"].includes(p.status))
        throw new Error("This project is closed");
      return run({ tx, projectId, actor });
    });
  }
  private async validateOwner(c: Context, userId: string) {
    if (!userId) return;
    const user = await c.tx.user.findFirst({
      where: {
        id: userId,
        companyId: c.actor.companyId,
        active: true,
        OR: [
          { role: "COMPANY_ADMIN" },
          { memberships: { some: { projectId: c.projectId } } },
        ],
      },
    });
    if (!user)
      throw new Error("Owner must be an active member of this project");
  }
  private async prepare(c: Context, kind: string, d: Data, id: string) {
    d = await advancedMaterials(c, kind, d, id);
    d = await advancedContracts(c, kind, d, id);
    if (kind === "schedulebaseline") {
      const tasks = await list(c, "task");
      if (!tasks.length)
        throw new Error(
          "Create work items before capturing a schedule baseline",
        );
      const previous = (await list(c, "schedulebaseline")).find(
        (r) => r.status === "APPROVED",
      );
      d = {
        ...d,
        previousId: previous?.id || "",
        tasks: tasks.map((t) => ({ id: t.id, ...t.data })),
        totalMinor: minor(tasks.reduce((n, t) => n + t.data.budgetMinor, 0)),
        versionNumber:
          (await c.tx.record.count({
            where: { projectId: c.projectId, kind: "schedulebaseline" },
          })) + 1,
      };
    }
    if (kind === "budgetrelease") {
      let previous: Data | undefined;
      if (d.previousId) {
        const p = await getRecord(c, d.previousId, "budgetrelease");
        if (p.status !== "APPROVED")
          throw new Error("Only the current approved budget can be revised");
        previous = p.data;
      } else if (
        (await list(c, "budgetrelease")).some((r) => r.status === "APPROVED")
      )
        throw new Error("Select the approved budget version to revise");
      const lines = d.lines.map((l: Data) => ({
        ...l,
        previousMinor:
          previous?.lines.find((p: Data) => p.costCode === l.costCode)
            ?.amountMinor || 0,
      }));
      const removed = (previous?.lines || []).filter(
        (l: Data) => !lines.some((n: Data) => n.costCode === l.costCode),
      );
      const totalMinor = minor(
        lines.reduce((s: number, l: Data) => s + l.amountMinor, 0),
      );
      if (totalMinor <= 0) throw new Error("Budget total must be positive");
      d = {
        ...d,
        lines,
        totalMinor,
        removedHeads: removed,
        deltaMinor: totalMinor - (previous?.totalMinor || 0),
        versionNumber:
          (await c.tx.record.count({
            where: { projectId: c.projectId, kind: "budgetrelease" },
          })) + 1,
      };
    }
    if (kind === "task") {
      await this.validateOwner(c, d.ownerId);
      if (d.parentId) await getRecord(c, d.parentId, "task");
      const tasks = (await list(c, "task")).filter((t) => t.id !== id);
      criticalPath([...tasks, { id, data: d, status: "BACKLOG" }]);
      let parent = d.parentId;
      const seen = new Set([id]);
      while (parent) {
        if (seen.has(parent)) throw new Error("WBS parent cycle detected");
        seen.add(parent);
        parent = (await getRecord(c, parent, "task")).data.parentId;
      }
    }
    if (kind === "risk") {
      await this.validateOwner(c, d.ownerId);
      d = { ...d, score: d.probability * d.impact };
    }
    if (kind === "rfi") await this.validateOwner(c, d.assignedTo);
    if (kind === "dailyreport") await requireSite(c, d.siteId);
    if (kind === "worklog") {
      await requireSite(c, d.siteId);
      const worker = await getRecord(c, d.workerId, "worker");
      if (worker.data.payBasis !== "CONTRACT")
        throw new Error(
          "Piecework logs require a worker with contract pay basis",
        );
      if (
        (await list(c, "wage")).some(
          (r) =>
            r.data.siteId === d.siteId &&
            d.date >= r.data.periodStart &&
            d.date <= r.data.periodEnd,
        )
      )
        throw new Error("This payroll period is already locked");
      d = {
        ...d,
        workerName: worker.data.name,
        unitRateMinor: worker.data.unitRateMinor,
        totalMinor: minor(d.quantity * worker.data.unitRateMinor),
      };
    }
    if (kind === "equipmentlog") {
      await requireSite(c, d.siteId);
      const asset = await getRecord(c, d.equipmentId, "equipment");
      d = {
        ...d,
        equipmentName: asset.data.name,
        totalMinor: minor(
          d.hours * asset.data.hourlyRateMinor +
            d.fuelLitres * asset.data.fuelRateMinor,
        ),
      };
    }
    if (kind === "comment") {
      const target = await getRecord(c, d.recordId);
      if (
        c.actor.role === "CONTRACTOR" &&
        target.data.contractorId !== c.actor.contractorId
      )
        throw new ForbiddenException();
      d = { ...d, authorId: c.actor.id };
    }
    return d;
  }
  async create(actor: Actor, projectId: string, kind: string, input: unknown) {
    const parsed = parseAdvanced(kind, input);
    return this.context(actor, projectId, async (c) => {
      assertAdvancedWrite(c.actor, kind);
      if (kind === "task" && parsed.percent !== 0)
        throw new Error("New tasks must start at zero progress");
      const id = randomUUID(),
        data = await this.prepare(c, kind, parsed, id);
      const key = advancedKey(kind, data, id);
      const status =
        kind === "task"
          ? "BACKLOG"
          : ["risk", "rfi"].includes(kind)
            ? "OPEN"
            : [
                  "delivery",
                  "dispatch",
                  "batchreturn",
                  "payment",
                  "retentionpayment",
                  "comment",
                  "equipment",
                ].includes(kind)
              ? "POSTED"
              : kind === "approvalrule"
                ? "ACTIVE"
                : "DRAFT";
      const result = await c.tx.record.create({
        data: { id, projectId, kind, key, status, data, createdBy: c.actor.id },
      });
      await audit(c, `${kind}.created`, id, { lines: data.lines?.length || 0 });
      return result;
    });
  }
  async edit(actor: Actor, projectId: string, id: string, input: any) {
    const { expectedVersion, ...body } = input;
    if (!Number.isInteger(expectedVersion))
      throw new Error("Expected record version is required");
    return this.context(actor, projectId, async (c) => {
      const r = await getRecord(c, id);
      assertAdvancedWrite(c.actor, r.kind);
      if (r.version !== expectedVersion)
        throw new ConflictException(
          "This record changed. Refresh before editing.",
        );
      if (
        !["task", "risk", "rfi", "approvalrule"].includes(r.kind) &&
        r.status !== "DRAFT"
      )
        throw new Error("Submitted and approved records are immutable");
      if (["DONE", "CLOSED", "ANSWERED"].includes(r.status))
        throw new Error("Reopen the record before editing");
      const parsed = parseAdvanced(r.kind, body);
      const data = await this.prepare(c, r.kind, parsed, id);
      if (["budgetrelease", "schedulebaseline"].includes(r.kind))
        data.versionNumber = r.data.versionNumber;
      if (r.kind === "task" && r.status === "BACKLOG" && data.percent > 0)
        throw new Error("Move task to In progress before entering completion");
      const result = await c.tx.record.update({
        where: { id },
        data: {
          data,
          key: advancedKey(r.kind, data, id),
          version: { increment: 1 },
        },
      });
      await audit(c, `${r.kind}.edited`, id, { before: r.data, after: data });
      return result;
    });
  }
  private async notify(c: Context, r: any, status: string) {
    const id = randomUUID();
    await c.tx.record.create({
      data: {
        id,
        key: id,
        projectId: c.projectId,
        kind: "notification",
        status: "UNREAD",
        createdBy: c.actor.id,
        data: {
          title: `${r.data.reference || r.data.name || r.data.title || r.kind}: ${status.replaceAll("_", " ").toLowerCase()}`,
          recordId: r.id,
          role:
            status === "PM_APPROVED"
              ? "ACCOUNTANT"
              : status === "SUBMITTED"
                ? "PROJECT_MANAGER"
                : "ALL",
          readBy: [],
        },
      },
    });
  }
  async transition(
    actor: Actor,
    projectId: string,
    id: string,
    input: unknown,
  ) {
    const command = commandSchema.parse(input);
    return this.context(actor, projectId, async (c) => {
      const r = await getRecord(c, id);
      if (
        ![
          "purchaseorder",
          "materialrequest",
          "contractpackage",
          "measurementbill",
          "budgetrelease",
          "schedulebaseline",
          "equipmentlog",
          "dailyreport",
          "worklog",
          "task",
          "risk",
          "rfi",
        ].includes(r.kind)
      )
        throw new Error(
          "This record does not use the advanced approval workflow",
        );
      if (r.version !== command.expectedVersion)
        throw new ConflictException(
          "This record has changed. Refresh before acting.",
        );
      const target = command.action;
      let data = { ...r.data };
      if (["task", "risk", "rfi"].includes(r.kind)) {
        assertAdvancedWrite(c.actor, r.kind);
        const allowed: Record<string, Record<string, string[]>> = {
          task: {
            BACKLOG: ["IN_PROGRESS", "BLOCKED"],
            IN_PROGRESS: ["BLOCKED", "DONE"],
            BLOCKED: ["IN_PROGRESS"],
            DONE: ["IN_PROGRESS"],
          },
          risk: {
            OPEN: ["MITIGATED", "CLOSED"],
            MITIGATED: ["OPEN", "CLOSED"],
            CLOSED: ["OPEN"],
          },
          rfi: {
            OPEN: ["ANSWERED"],
            ANSWERED: ["OPEN", "CLOSED"],
            CLOSED: ["OPEN"],
          },
        };
        if (!allowed[r.kind][r.status]?.includes(target))
          throw new Error("Invalid workflow transition");
        if (r.kind === "task" && target === "DONE") {
          for (const dep of data.dependencies)
            if ((await getRecord(c, dep, "task")).status !== "DONE")
              throw new Error(
                "Finish predecessor tasks before completing this task",
              );
          data.percent = 100;
        }
        if (
          r.kind === "task" &&
          r.status === "DONE" &&
          target === "IN_PROGRESS"
        )
          data.percent = 99;
        if (r.kind === "rfi" && target === "ANSWERED") {
          if (!command.note.trim())
            throw new Error("An RFI answer is required");
          if (
            data.assignedTo &&
            data.assignedTo !== c.actor.id &&
            !managers.includes(c.actor.role)
          )
            throw new ForbiddenException(
              "Only the assignee or project manager may answer",
            );
          data.answer = command.note;
          data.answeredBy = c.actor.id;
        }
      } else {
        const states: Record<string, string[]> = {
          DRAFT: ["SUBMITTED"],
          SUBMITTED:
            r.kind === "measurementbill"
              ? ["PM_APPROVED", "REJECTED"]
              : ["APPROVED", "REJECTED"],
          PM_APPROVED: ["ACCOUNTS_APPROVED", "REJECTED"],
        };
        if (!states[r.status]?.includes(target))
          throw new Error("Invalid approval transition");
        if (target === "SUBMITTED") {
          assertAdvancedWrite(c.actor, r.kind);
          if (c.actor.role === "CONTRACTOR" && r.createdBy !== c.actor.id)
            throw new ForbiddenException();
        } else {
          if (r.createdBy === c.actor.id)
            throw new Error("The originator cannot approve their own record");
          const accounts = r.status === "PM_APPROVED";
          if (accounts) {
            if (
              c.actor.role !== "ACCOUNTANT" ||
              data.pmApprovedBy === c.actor.id
            )
              throw new ForbiddenException(
                "Separate Accounts approval required",
              );
          } else {
            const rules = (await list(c, "approvalrule"))
              .filter(
                (rule) =>
                  rule.status === "ACTIVE" &&
                  rule.data.kind === r.kind &&
                  (data.totalMinor || 0) >= rule.data.thresholdMinor,
              )
              .sort((a, b) => b.data.thresholdMinor - a.data.thresholdMinor);
            const required = rules[0]?.data.requiredRole || "PROJECT_MANAGER";
            if (
              required === "COMPANY_ADMIN"
                ? c.actor.role !== "COMPANY_ADMIN"
                : !managers.includes(c.actor.role)
            )
              throw new ForbiddenException(
                `Requires ${required.replaceAll("_", " ")} approval`,
              );
          }
          if (target === "REJECTED" && !command.note.trim())
            throw new Error("Explain the rejection reason");
        }
        if (target === "PM_APPROVED") data.pmApprovedBy = c.actor.id;
        if (target === "ACCOUNTS_APPROVED" && r.kind === "measurementbill") {
          for (let i = 0; i < data.lines.length; i++)
            await cost(
              c,
              "MEASURED_CONTRACT_COST",
              `${id}:${i}`,
              data.lines[i].amountMinor,
              data.lines[i].costCode,
            );
          data.accountsApprovedBy = c.actor.id;
        }
        if (target === "APPROVED" && r.kind === "equipmentlog")
          await cost(c, "EQUIPMENT_LOG", id, data.totalMinor, data.costCode);
        if (
          target === "APPROVED" &&
          r.kind === "worklog" &&
          (await list(c, "wage")).some(
            (w) =>
              w.data.siteId === data.siteId &&
              data.date >= w.data.periodStart &&
              data.date <= w.data.periodEnd,
          )
        )
          throw new Error("Payroll already locked this work period");
        if (target === "APPROVED" && r.kind === "budgetrelease") {
          const current = (await list(c, "budgetrelease")).filter(
            (b) => b.status === "APPROVED",
          );
          if (current.length && current[0].id !== data.previousId)
            throw new ConflictException(
              "The baseline changed. Revise the current approved version.",
            );
          for (const b of [
            ...current,
            ...(await list(c, "budget")).filter((b) => b.status === "APPROVED"),
          ])
            await c.tx.record.update({
              where: { id: b.id },
              data: { status: "SUPERSEDED", version: { increment: 1 } },
            });
        }
      }
      if (target === "APPROVED" && r.kind === "schedulebaseline") {
        const current = (await list(c, "schedulebaseline")).filter(
          (b) => b.status === "APPROVED",
        );
        if (current.length && current[0].id !== data.previousId)
          throw new ConflictException(
            "Schedule baseline changed; capture a new baseline",
          );
        for (const b of current)
          await c.tx.record.update({
            where: { id: b.id },
            data: { status: "SUPERSEDED", version: { increment: 1 } },
          });
      }
      data.lastDecisionNote = command.note;
      const result = await c.tx.record.update({
        where: { id },
        data: { status: target, data, version: { increment: 1 } },
      });
      await audit(c, `${r.kind}.${target.toLowerCase()}`, id, {
        from: r.status,
        note: command.note,
      });
      await this.notify(c, r, target);
      return result;
    });
  }
  async markRead(actor: Actor, projectId: string, id: string) {
    return this.context(actor, projectId, async (c) => {
      if (c.actor.role === "CONTRACTOR") throw new ForbiddenException();
      const r = await getRecord(c, id, "notification");
      return c.tx.record.update({
        where: { id },
        data: {
          data: {
            ...r.data,
            readBy: [...new Set([...(r.data.readBy || []), c.actor.id])],
          },
        },
      });
    });
  }
  async analytics(actor: Actor, projectId: string) {
    const s = await this.projects.snapshot(actor, projectId);
    if (s.role === "CONTRACTOR") throw new ForbiddenException();
    const rows = s.records.map((r) => ({ ...r, data: r.data as Data }));
    const tasks = rows.filter((r) => r.kind === "task");
    const baseline = rows.find(
      (r) => r.kind === "schedulebaseline" && r.status === "APPROVED",
    );
    const costTasks = baseline
      ? baseline.data.tasks.map((b: Data) => ({
          id: b.id,
          status: tasks.find((t) => t.id === b.id)?.status || "BACKLOG",
          data: {
            ...b,
            percent: tasks.find((t) => t.id === b.id)?.data.percent || 0,
          },
        }))
      : tasks;
    const network = criticalPath(tasks),
      baselineWindowDays =
        Math.round(
          (Date.parse(s.project.endsOn) - Date.parse(s.project.startsOn)) /
            86400000,
        ) + 1;
    const costs = budgetReport(rows, s.ledger);
    const budget = costs.reduce((n, r) => n + r.budget, 0),
      actual = s.ledger.reduce((n, r) => n + r.amountMinor, 0);
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
    }).format(new Date());
    const start = new Date(s.project.startsOn.slice(0, 7) + "-01T00:00:00Z");
    const timeSeries = [];
    for (let index = 0; index < 120; index++) {
      const month = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1),
      );
      if (month.toISOString().slice(0, 10) > s.project.endsOn) break;
      let date = new Date(
        Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
      )
        .toISOString()
        .slice(0, 10);
      const monthStart = month.toISOString().slice(0, 10);
      if (date > today && monthStart <= today) date = today;
      timeSeries.push({
        date,
        label: new Intl.DateTimeFormat("en-GB", {
          month: "short",
          year: "2-digit",
          timeZone: "UTC",
        }).format(month),
        planned: earnedValue(costTasks, budget, actual, date).planned,
        actual:
          monthStart > today
            ? null
            : s.ledger
                .filter(
                  (l) =>
                    new Intl.DateTimeFormat("en-CA", {
                      timeZone: "Asia/Dhaka",
                    }).format(l.createdAt) <= date,
                )
                .reduce((n, l) => n + l.amountMinor, 0),
      });
    }
    return {
      asOf: today,
      criticalPath: {
        ...network,
        baselineWindowDays,
        overrunDays: Math.max(0, network.durationDays - baselineWindowDays),
        baselineConflicts: tasks
          .filter((t) =>
            (t.data.dependencies || []).some(
              (id: string) =>
                tasks.find((p) => p.id === id)!.data.endsOn >= t.data.startsOn,
            ),
          )
          .map((t) => t.id),
      },
      baselineName: baseline?.data.name || "Live plan · baseline not approved",
      evm: earnedValue(costTasks, budget, actual, today),
      costs,
      timeSeries,
      risks: rows
        .filter((r) => r.kind === "risk" && r.status !== "CLOSED")
        .sort((a, b) => b.data.score - a.data.score),
      commitments: rows
        .filter(
          (r) =>
            ["purchaseorder", "contractpackage"].includes(r.kind) &&
            ["APPROVED", "PARTIAL_RECEIVED"].includes(r.status),
        )
        .reduce((n, r) => n + r.data.totalMinor, 0),
      payable: rows
        .filter(
          (r) =>
            ["measurementbill", "bill"].includes(r.kind) &&
            ["ACCOUNTS_APPROVED", "PARTIALLY_PAID"].includes(r.status),
        )
        .reduce((n, r) => n + r.data.net - (r.data.paidMinor || 0), 0),
      cashPaid: rows
        .filter(
          (r) =>
            ["payment", "retentionpayment"].includes(r.kind) ||
            (r.kind === "bill" && r.status === "PAID") ||
            (r.kind === "wage" && r.status === "PAID"),
        )
        .reduce(
          (n, r) => n + (r.kind === "bill" ? r.data.net : r.data.amountMinor),
          0,
        ),
      retained: rows
        .filter(
          (r) =>
            ["measurementbill", "bill"].includes(r.kind) &&
            ["ACCOUNTS_APPROVED", "PARTIALLY_PAID", "PAID"].includes(
              r.status,
            ) &&
            !r.data.retentionReleasedOn,
        )
        .reduce((n, r) => n + r.data.retention, 0),
    };
  }
}
