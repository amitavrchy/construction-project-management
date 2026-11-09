import { BadRequestException } from "@nestjs/common";
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  Res,
  Inject,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import type { Response } from "express";
import { z } from "zod";
import { ProjectsService } from "./projects.service";
import { budgetReport, csv } from "./reports";
import { projectTransitions } from "./domain/states";
import { Data } from "./domain/context";
@Controller("projects")
export class ProjectsController {
  constructor(@Inject(ProjectsService) private service: ProjectsService) {}
  @Get() projects(@Req() req: any) {
    return this.service.projects(req.actor);
  }
  @Post() create(@Req() req: any, @Body() input: unknown) {
    return this.service.createProject(req.actor, input);
  }
  @Get(":id") snapshot(@Req() req: any, @Param("id") id: string) {
    return this.service.snapshot(req.actor, id);
  }
  @Get(":id/files/:recordId") async file(
    @Req() req: any,
    @Param("id") id: string,
    @Param("recordId") recordId: string,
    @Res() res: Response,
  ) {
    const actor = await this.service.scope(req.actor, id);
    if (actor.role === "CONTRACTOR") throw new ForbiddenException();
    const record = await this.service.db.record.findFirst({
      where: {
        id: recordId,
        projectId: id,
        kind: { in: ["document", "progress"] },
      },
    });
    const d = record?.data as Data | undefined;
    const raw = record?.kind === "document" ? d?.content : d?.photo;
    const match =
      typeof raw === "string"
        ? /^data:(application\/pdf|image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
            raw,
          )
        : null;
    if (!match) throw new NotFoundException("File was not found");
    res.setHeader("Cache-Control", "private, no-store");
    if (record?.kind === "document")
      res.attachment(d?.fileName || "document.pdf");
    res.type(match[1]);
    res.send(Buffer.from(match[2], "base64"));
  }
  @Get(":id/boq-tree") boqTree(@Req() req: any, @Param("id") id: string) {
    return this.service.boqTree(req.actor, id);
  }
  @Get(":id/stock-snapshot") async stock(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    const actor = await this.service.scope(req.actor, id);
    if (actor.role === "CONTRACTOR") throw new ForbiddenException();
    return this.service.stockSnapshot(id);
  }
  @Post(":id/records/:kind") record(
    @Req() req: any,
    @Param("id") id: string,
    @Param("kind") kind: string,
    @Body() data: unknown,
  ) {
    return this.service.create(req.actor, id, kind, data);
  }
  @Patch(":id/records/:recordId") editCatalog(
    @Req() req: any,
    @Param("id") id: string,
    @Param("recordId") recordId: string,
    @Body() data: unknown,
  ) {
    return this.service.editCatalog(req.actor, id, recordId, data);
  }
  @Post(":id/attendance/bulk") bulkAttendance(
    @Req() req: any,
    @Param("id") id: string,
    @Body() data: unknown,
  ) {
    return this.service.bulkAttendance(
      req.actor,
      id,
      z.array(z.unknown()).min(1).max(200).parse(data),
    );
  }
  @Post(":id/records/:recordId/transition") transition(
    @Req() req: any,
    @Param("id") id: string,
    @Param("recordId") recordId: string,
    @Body() data: unknown,
  ) {
    const command = z
      .object({
        status: z.string().max(40),
        note: z.string().max(4000).default(""),
      })
      .parse(data);
    return this.service.transition(
      req.actor,
      id,
      recordId,
      command.status,
      command.note,
    );
  }
  @Post(":id/budgets/:recordId/revise") revise(
    @Req() req: any,
    @Param("id") id: string,
    @Param("recordId") recordId: string,
  ) {
    return this.service.reviseBudget(req.actor, id, recordId);
  }
  @Patch(":id/budgets/:recordId") editBudget(
    @Req() req: any,
    @Param("id") id: string,
    @Param("recordId") recordId: string,
    @Body() data: unknown,
  ) {
    return this.service.editBudget(req.actor, id, recordId, data);
  }
  @Post(":id/bills/:recordId/release-retention") releaseRetention(
    @Req() req: any,
    @Param("id") id: string,
    @Param("recordId") recordId: string,
  ) {
    return this.service.releaseRetention(req.actor, id, recordId);
  }
  @Patch(":id/status") async status(
    @Req() req: any,
    @Param("id") id: string,
    @Body() input: unknown,
  ) {
    const actor = await this.service.scope(req.actor, id);
    if (!["COMPANY_ADMIN", "PROJECT_MANAGER"].includes(actor.role))
      throw new ForbiddenException();
    const { status } = z.object({ status: z.string() }).parse(input);
    return this.service.db.atomic(async (tx) => {
      const p = await tx.project.findUniqueOrThrow({ where: { id } });
      if (!projectTransitions[p.status]?.includes(status))
        throw new BadRequestException("Invalid project status transition");
      await tx.audit.create({
        data: {
          projectId: id,
          actorId: actor.id,
          action: "project.status",
          entityId: id,
          detail: { from: p.status, to: status },
        },
      });
      return tx.project.update({ where: { id }, data: { status } });
    });
  }
  @Post(":id/sites") async site(
    @Req() req: any,
    @Param("id") id: string,
    @Body() input: unknown,
  ) {
    const actor = await this.service.scope(req.actor, id);
    if (!["COMPANY_ADMIN", "PROJECT_MANAGER"].includes(actor.role))
      throw new ForbiddenException();
    return this.service.db.site.create({
      data: {
        projectId: id,
        ...z
          .object({
            name: z.string().trim().min(1).max(200),
            address: z.string().trim().min(1).max(500),
          })
          .parse(input),
      },
    });
  }
  @Get(":id/reports/:report") async report(
    @Req() req: any,
    @Param("id") id: string,
    @Param("report") report: string,
    @Res() res: Response,
  ) {
    const s = await this.service.snapshot(req.actor, id);
    if (s.role === "CONTRACTOR") throw new ForbiddenException();
    let rows: Record<string, unknown>[];
    if (report === "budget-vs-actual") rows = budgetReport(s.records, s.ledger);
    else if (report === "material-register")
      rows = s.stock.map((r) => ({
        ...r,
        quantity: Number(r.quantity),
        material: (s.records.find((m) => m.id === r.materialId)?.data as any)
          ?.name,
      }));
    else if (report === "ledger") rows = s.ledger;
    else if (report === "attendance")
      rows = s.records
        .filter((r) => r.kind === "attendance")
        .map((r) => ({ id: r.id, ...(r.data as any) }));
    else throw new BadRequestException("Unknown report");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${report}.csv"`,
    );
    res.send("\uFEFF" + csv(rows));
  }
}
