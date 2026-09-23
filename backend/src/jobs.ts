import { Queue, Worker } from 'bullmq';
import { Db } from './db';
import { budgetReport } from './reports';
import { ProjectsService } from './projects.service';
export async function startJobs(db: Db) {
  if (!process.env.REDIS_URL) return async () => {};
  const url = new URL(process.env.REDIS_URL);
  const connection = { host: url.hostname, port: Number(url.port || 6379), password: url.password || undefined, maxRetriesPerRequest: null, ...(url.protocol === 'rediss:' ? { tls: {} } : {}) };
  const queue = new Queue('sitecraft-operations', { connection, defaultJobOptions: { removeOnComplete: 30, removeOnFail: 100, attempts: 3, backoff: { type: 'exponential', delay: 5000 } } });
  await queue.upsertJobScheduler('daily-digest', { pattern: '0 8 * * *', tz: 'Asia/Dhaka' }, { name: 'daily-digest', data: {} });
  const worker = new Worker('sitecraft-operations', async () => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(new Date());
    for (const project of await db.project.findMany({ where: { status: 'ACTIVE' } })) {
      const records = await db.record.findMany({ where: { projectId: project.id } });
      const ledger = await db.ledger.findMany({ where: { projectId: project.id } });
      const alerts = budgetReport(records, ledger).filter(r => r.alert);
      const overdue = records.filter(r => r.kind === 'requisition' && ['SUBMITTED','APPROVED','PARTIAL_ISSUED'].includes(r.status) && (r.data as any).neededOn < today).map(r => r.id);
      const retention = records.filter(r => r.kind === 'bill' && r.status === 'PAID' && (r.data as any).defectsUntil <= today && (r.data as any).retention > 0).map(r => r.id);
      await db.audit.create({ data: { projectId: project.id, actorId: 'SYSTEM', entityId: project.id, action: 'daily.digest', detail: { today, alerts, overdue, retention, payrollReminder: 'Review attendance and generate the next wage period.' } } });
      if(today.endsWith('-01')){
        const end = new Date(`${today}T00:00:00+06:00`);end.setUTCDate(end.getUTCDate()-1);
        const periodEnd = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka'}).format(end);
        const periodStart = periodEnd.slice(0,8)+'01';
        const service = new ProjectsService(db);
        for(const site of await db.site.findMany({where:{projectId:project.id}})){
          if(records.some(r=>r.kind==='wage'&&(r.data as any).siteId===site.id&&(r.data as any).periodStart<=periodEnd&&(r.data as any).periodEnd>=periodStart))continue;
          if(!records.some(r=>r.kind==='attendance'&&(r.data as any).siteId===site.id&&(r.data as any).date>=periodStart&&(r.data as any).date<=periodEnd))continue;
          await service.create({id:'SYSTEM',companyId:project.companyId,role:'COMPANY_ADMIN'},project.id,'wage',{name:`Monthly payroll ${periodStart.slice(0,7)}`,siteId:site.id,periodStart,periodEnd,costCode:'LABOR'});
        }
      }
    }
  }, { connection });
  worker.on('error', error => console.error('Job worker:', error.message));
  queue.on('error', error => console.error('Job queue:', error.message));
  return async () => { await worker.close(); await queue.close(); };
}
