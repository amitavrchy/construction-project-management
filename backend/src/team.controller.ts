import { Controller, Get, Post, Body, Req, Param, Inject, ForbiddenException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { Db } from './db';
import { roles } from './domain/schemas';
@Controller('team')
export class TeamController {
  constructor(@Inject(Db) private db: Db) {}
  @Get() async list(@Req() req: any) {
    if (req.actor.role !== 'COMPANY_ADMIN') throw new ForbiddenException();
    return this.db.user.findMany({ where: { companyId: req.actor.companyId }, select: { id: true, name: true, email: true, role: true, active: true, contractorId: true, memberships: true } });
  }
  @Post() async create(@Req() req: any, @Body() input: unknown) {
    if (req.actor.role !== 'COMPANY_ADMIN') throw new ForbiddenException();
    const d = z.object({ name: z.string().trim().min(1).max(200), email: z.email().toLowerCase(), password: z.string().min(12).max(200), role: z.enum(roles), projectId: z.string(), contractorId: z.string().optional() }).parse(input);
    const project = await this.db.project.findFirst({ where: { id: d.projectId, companyId: req.actor.companyId } });
    if (!project) throw new ForbiddenException();
    if (d.role === 'CONTRACTOR' && !await this.db.record.findFirst({ where: { id: d.contractorId || '', projectId: d.projectId, kind: 'contractor' } })) throw new Error('Select a contractor belonging to this project');
    const user = await this.db.user.create({ data: { name: d.name, email: d.email, role: d.role, companyId: req.actor.companyId, passwordHash: await hash(d.password, 12), contractorId: d.contractorId, memberships: { create: { projectId: d.projectId, role: d.role } } }, select: { id: true, name: true, email: true, role: true } });
    return user;
  }
  @Post(':userId/memberships') async member(@Req() req: any, @Param('userId') userId: string, @Body() input: unknown) {
    if (req.actor.role !== 'COMPANY_ADMIN') throw new ForbiddenException();
    const d = z.object({ projectId: z.string(), role: z.enum(roles) }).parse(input);
    const user = await this.db.user.findFirst({ where: { id: userId, companyId: req.actor.companyId } });
    const project = await this.db.project.findFirst({ where: { id: d.projectId, companyId: req.actor.companyId } });
    if (!user || !project || user.role === 'CONTRACTOR' || d.role === 'CONTRACTOR' || d.role === 'COMPANY_ADMIN') throw new ForbiddenException('Invalid membership assignment');
    return this.db.member.upsert({ where: { projectId_userId: { projectId: d.projectId, userId } }, create: { ...d, userId }, update: { role: d.role } });
  }
}
