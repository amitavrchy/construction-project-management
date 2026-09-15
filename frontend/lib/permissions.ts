const writers: Record<string, string[]> = { boq:['COMPANY_ADMIN','PROJECT_MANAGER'],budget:['COMPANY_ADMIN','PROJECT_MANAGER'],variation:['COMPANY_ADMIN','PROJECT_MANAGER'],material:['COMPANY_ADMIN','STORE_KEEPER'],supplier:['COMPANY_ADMIN','STORE_KEEPER'],receipt:['COMPANY_ADMIN','STORE_KEEPER'],requisition:['COMPANY_ADMIN','PROJECT_MANAGER','SITE_ENGINEER'],issue:['COMPANY_ADMIN','STORE_KEEPER'],return:['COMPANY_ADMIN','STORE_KEEPER'],transfer:['COMPANY_ADMIN','STORE_KEEPER'],worker:['COMPANY_ADMIN','LABOR_SUPERVISOR'],attendance:['COMPANY_ADMIN','LABOR_SUPERVISOR','SITE_ENGINEER'],wage:['COMPANY_ADMIN','ACCOUNTANT'],contractor:['COMPANY_ADMIN','PROJECT_MANAGER'],workorder:['COMPANY_ADMIN','PROJECT_MANAGER'],bill:['COMPANY_ADMIN','ACCOUNTANT','CONTRACTOR'],progress:['COMPANY_ADMIN','PROJECT_MANAGER','SITE_ENGINEER'],document:['COMPANY_ADMIN','PROJECT_MANAGER','SITE_ENGINEER'] };
export const canCreate = (role: string, kind: string) => !!writers[kind]?.includes(role);
export function actions(kind: string, status: string, role: string) {
  if (status === 'DRAFT' && ['budget','requisition','bill'].includes(kind) && canCreate(role, kind)) return ['SUBMITTED'];
  if (status === 'SUBMITTED' && ['COMPANY_ADMIN','PROJECT_MANAGER'].includes(role)) return kind === 'bill' ? ['PM_APPROVED','REJECTED'] : ['APPROVED','REJECTED'];
  if (kind === 'variation' && status === 'DRAFT' && ['COMPANY_ADMIN','PROJECT_MANAGER'].includes(role)) return ['APPROVED','REJECTED'];
  if (kind === 'bill' && status === 'PM_APPROVED' && role === 'ACCOUNTANT') return ['ACCOUNTS_APPROVED','REJECTED'];
  if (kind === 'wage' && status === 'CALCULATED' && role === 'ACCOUNTANT') return ['APPROVED'];
  if (['bill','wage'].includes(kind) && ['ACCOUNTS_APPROVED','APPROVED'].includes(status) && role === 'ACCOUNTANT') return ['PAID'];
  if (kind === 'transfer' && status === 'IN_TRANSIT' && ['COMPANY_ADMIN','STORE_KEEPER'].includes(role)) return ['RECEIVED'];
  return [];
}
