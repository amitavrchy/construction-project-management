import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Queue, QueueEvents } from "bullmq";
import { Db } from "../src/db";
import { startJobs } from "../src/jobs";

test(
  "Redis job retries produce one durable daily digest",
  {
    skip:
      !process.env.TEST_JOBS_DATABASE_URL || !process.env.TEST_JOBS_REDIS_URL,
    timeout: 30000,
  },
  async () => {
    const database = process.env.TEST_JOBS_DATABASE_URL!;
    assert.match(new URL(database).pathname, /_jobs_test$/);
    process.env.REDIS_URL = process.env.TEST_JOBS_REDIS_URL;
    const url = new URL(process.env.REDIS_URL!);
    const connection = {
      host: url.hostname,
      port: Number(url.port || 6379),
      username: decodeURIComponent(url.username) || undefined,
      password: decodeURIComponent(url.password) || undefined,
      db: Number(url.pathname.slice(1) || 0),
      maxRetriesPerRequest: null,
      ...(url.protocol === "rediss:" ? { tls: {} } : {}),
    };
    const db = new Db({ datasources: { db: { url: database } } });
    const companyId = randomUUID(),
      projectId = randomUUID();
    await db.company.create({
      data: { id: companyId, name: "Isolated queue test" },
    });
    await db.project.create({
      data: {
        id: projectId,
        companyId,
        name: "Queue test",
        code: projectId,
        address: "Synthetic",
        startsOn: "2026-01-01",
        endsOn: "2027-01-01",
        status: "ACTIVE",
      },
    });
    const close = await startJobs(db);
    const queue = new Queue("sitecraft-operations", { connection });
    const events = new QueueEvents("sitecraft-operations", { connection });
    try {
      await events.waitUntilReady();
      for (let i = 0; i < 2; i++) {
        const job = await queue.add(
          "daily-digest",
          {},
          { removeOnComplete: true },
        );
        await job.waitUntilFinished(events, 10000);
      }
      assert.equal(
        await db.audit.count({ where: { projectId, action: "daily.digest" } }),
        1,
      );
      assert.equal(
        await db.record.count({ where: { projectId, kind: "system" } }),
        1,
      );
      assert.equal(await db.ledger.count({ where: { projectId } }), 0);
    } finally {
      await close();
      await events.close();
      await queue.close();
      await db.audit.deleteMany({ where: { projectId } });
      await db.record.deleteMany({ where: { projectId } });
      await db.project.delete({ where: { id: projectId } });
      await db.company.delete({ where: { id: companyId } });
      await db.$disconnect();
    }
  },
);
