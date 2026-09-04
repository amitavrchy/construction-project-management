import { ForbiddenException } from '@nestjs/common';
export type Actor = { id: string; companyId: string; role: string; contractorId?: string | null };
const permissions: Record<string, string[]> = {
  boq: ['COMPANY_ADMIN','PROJECT_MANAGER'], budget: ['COMPANY_ADMIN','PROJECT_MANAGER'],
  material: ['COMPANY_ADMIN','STORE_KEEPER'], supplier: ['COMPANY_ADMIN','STORE_KEEPER'], receipt: ['COMPANY_ADMIN','STORE_KEEPER'],
  requisition: ['COMPANY_ADMIN','PROJECT_MANAGER','SITE_ENGINEER'], issue: ['COMPANY_ADMIN','STORE_KEEPER'], return: ['COMPANY_ADMIN','STORE_KEEPER'], transfer: ['COMPANY_ADMIN','STORE_KEEPER'],
  worker: ['COMPANY_ADMIN','LABOR_SUPERVISOR'], attendance: ['COMPANY_ADMIN','LABOR_SUPERVISOR','SITE_ENGINEER'], wage: ['COMPANY_ADMIN','ACCOUNTANT'],
  contractor: ['COMPANY_ADMIN','PROJECT_MANAGER'], workorder: ['COMPANY_ADMIN','PROJECT_MANAGER'], bill: ['COMPANY_ADMIN','ACCOUNTANT','CONTRACTOR'],
  progress: ['COMPANY_ADMIN','SITE_ENGINEER','PROJECT_MANAGER'], document: ['COMPANY_ADMIN','SITE_ENGINEER','PROJECT_MANAGER'], variation: ['COMPANY_ADMIN','PROJECT_MANAGER'],
};
export function canWrite(actor: Actor, kind: string) {
  if (!permissions[kind]?.includes(actor.role)) throw new ForbiddenException('Your project role cannot perform this action');
}
export function canApprove(actor: Actor, kind: string, target: string) {
  const accounts = target === 'ACCOUNTS_APPROVED' || target === 'PAID' || kind === 'wage';
  const allowed = accounts ? ['ACCOUNTANT'] : ['PROJECT_MANAGER','COMPANY_ADMIN'];
  if (!allowed.includes(actor.role)) throw new ForbiddenException(`Requires ${accounts ? 'Accounts' : 'project manager'} approval`);
}
