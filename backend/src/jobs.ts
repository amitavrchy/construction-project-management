import { Queue, Worker } from 'bullmq';
import { Db } from './db';
import { budgetReport } from './reports';
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
    }
  }, { connection });
  worker.on('error', error => console.error('Job worker:', error.message));
  queue.on('error', error => console.error('Job queue:', error.message));
  return async () => { await worker.close(); await queue.close(); };
}
