import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  Res,
  Query,
  Inject,
  ForbiddenException,
} from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { csv } from "../reports";
import { AdvancedService } from "./service";
@Controller("projects/:projectId/advanced")
export class AdvancedController {
  constructor(
    @Inject(AdvancedService) private readonly service: AdvancedService,
  ) {}
  @Post("records/:kind") create(
    @Req() req: any,
    @Param("projectId") projectId: string,
    @Param("kind") kind: string,
    @Body() data: unknown,
  ) {
    return this.service.create(req.actor, projectId, kind, data);
  }
  @Patch("records/:id") edit(
    @Req() req: any,
    @Param("projectId") projectId: string,
    @Param("id") id: string,
    @Body() data: unknown,
  ) {
    return this.service.edit(req.actor, projectId, id, data);
  }
  @Post("records/:id/transition") transition(
    @Req() req: any,
    @Param("projectId") projectId: string,
    @Param("id") id: string,
    @Body() data: unknown,
  ) {
    return this.service.transition(req.actor, projectId, id, data);
  }
  @Post("notifications/:id/read") read(
    @Req() req: any,
    @Param("projectId") projectId: string,
    @Param("id") id: string,
  ) {
    return this.service.markRead(req.actor, projectId, id);
  }
  @Get("analytics") analytics(
    @Req() req: any,
    @Param("projectId") projectId: string,
  ) {
    return this.service.analytics(req.actor, projectId);
  }
  @Get("people") async people(
    @Req() req: any,
    @Param("projectId") projectId: string,
  ) {
    const actor = await this.service.projects.scope(req.actor, projectId);
    if (actor.role === "CONTRACTOR") throw new ForbiddenException();
    return this.service.db.user.findMany({
      where: {
        companyId: actor.companyId,
        active: true,
        OR: [
          { role: "COMPANY_ADMIN" },
          { memberships: { some: { projectId } } },
        ],
      },
      select: { id: true, name: true, role: true },
    });
  }
  @Get("audit") async audit(
    @Req() req: any,
    @Param("projectId") projectId: string,
    @Query() input: unknown,
  ) {
    const actor = await this.service.projects.scope(req.actor, projectId);
    if (actor.role === "CONTRACTOR") throw new ForbiddenException();
    const q = z
      .object({
        cursor: z.string().optional(),
        action: z.string().max(200).optional(),
        from: z.iso.date().optional(),
        to: z.iso.date().optional(),
      })
      .parse(input);
    const where = {
      projectId,
      ...(q.action
        ? { action: { contains: q.action, mode: "insensitive" as const } }
        : {}),
      ...(q.from || q.to
        ? {
            createdAt: {
              ...(q.from ? { gte: new Date(q.from + "T00:00:00+06:00") } : {}),
              ...(q.to ? { lte: new Date(q.to + "T23:59:59.999+06:00") } : {}),
            },
          }
        : {}),
    };
    const records = await this.service.db.audit.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 26,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    });
    return {
      records: records.slice(0, 25),
      nextCursor: records.length > 25 ? records[24].id : null,
      total: await this.service.db.audit.count({ where }),
    };
  }
  @Get("exports/:kind") async export(
    @Req() req: any,
    @Param("projectId") projectId: string,
    @Param("kind") kind: string,
    @Res() res: Response,
  ) {
    const s = await this.service.projects.snapshot(req.actor, projectId);
    if (
      s.role === "CONTRACTOR" &&
      ![
        "contractpackage",
        "measurementbill",
        "payment",
        "retentionpayment",
      ].includes(kind)
    )
      throw new ForbiddenException();
    if (
      ![
        "purchaseorder",
        "delivery",
        "materialrequest",
        "dispatch",
        "batchreturn",
        "contractpackage",
        "measurementbill",
        "payment",
        "retentionpayment",
        "budgetrelease",
        "task",
        "risk",
        "rfi",
        "dailyreport",
        "equipment",
        "equipmentlog",
        "approvalrule",
      ].includes(kind)
    )
      throw new Error("Unknown export");
    const rows = s.records
      .filter((r) => r.kind === kind)
      .flatMap((r) => {
        const d = r.data as any;
        const { lines, ...base } = d;
        return lines?.length
          ? lines.map((line: any) => ({
              reference: d.reference || d.name || r.id,
              status: r.status,
              ...line,
            }))
          : [{ id: r.id, status: r.status, ...base }];
      });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${kind}.csv"`);
    res.send("\uFEFF" + csv(rows));
  }
}
