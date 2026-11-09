// Runs only inside the disposable preview. Never prints credentials or response bodies.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import assert from "node:assert/strict";
Object.assign(
  process.env,
  JSON.parse(readFileSync("/preview/runtime.json", "utf8")),
);
const { PrismaClient } = await import("@prisma/client");
const { Queue, QueueEvents } = await import("bullmq");
const { default: Redis } = await import("ioredis");
const db = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1 });
let queue, events;
const origin = process.env.APP_URL;
const base = `http://127.0.0.1:${process.env.PORT}/api`;
let cookie = "";
async function api(
  path,
  method = "GET",
  body,
  expected = 200,
  requestOrigin = origin,
) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Cookie: cookie,
      Origin: requestOrigin,
      "content-type": "application/json",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  assert.equal(response.status, expected, `${method} ${path} status`);
  return { response, value: await response.json() };
}
async function snapshot() {
  const result = {};
  for (const table of [
    "Company",
    "User",
    "Member",
    "Project",
    "Site",
    "Record",
    "Stock",
    "Ledger",
    "Audit",
  ]) {
    const rows = await db.$queryRawUnsafe(
      `SELECT row_to_json(t) AS row FROM "${table}" t ORDER BY id`,
    );
    result[table] = createHash("sha256")
      .update(JSON.stringify(rows))
      .digest("hex");
  }
  return result;
}
try {
  await api("/health");
  assert.equal(
    (await redis.config("GET", "maxmemory-policy"))[1],
    "noeviction",
  );
  assert.equal(
    (await redis.config("GET", "maxmemory"))[1],
    String(24 * 1024 * 1024),
  );
  const { response: login } = await api(
    "/auth/login",
    "POST",
    {
      email: process.env.PREVIEW_LOGIN_EMAIL,
      password: process.env.PREVIEW_LOGIN_PASSWORD,
    },
    201,
  );
  assert.match(login.headers.get("set-cookie") || "", /HttpOnly/);
  assert.match(login.headers.get("set-cookie") || "", /Secure/);
  cookie = login.headers.get("set-cookie").split(";")[0];
  await api("/auth/me");
  const listeners = readFileSync("/proc/net/tcp", "utf8")
    .split("\n")
    .slice(1)
    .filter(Boolean)
    .map((line) => line.trim().split(/\s+/))
    .filter((row) => row[3] === "0A")
    .map((row) => row[1]);
  for (const port of [5432, 6379])
    assert.ok(
      listeners.includes(
        `0100007F:${port.toString(16).toUpperCase().padStart(4, "0")}`,
      ),
      "Datastores must bind loopback only",
    );
  assert.ok(
    listeners.includes(
      `00000000:${Number(process.env.PORT).toString(16).toUpperCase().padStart(4, "0")}`,
    ),
    "API must bind all interfaces on PORT",
  );
  if (process.argv.includes("--replacement")) {
    assert.equal(
      await db.project.count(),
      1,
      "Replacement must recreate only the initial synthetic project dataset",
    );
    assert.equal(
      await db.user.count(),
      8,
      "Replacement must recreate synthetic accounts and the private preview login",
    );
    console.log(
      "PASS: fresh replacement reset, seed counts, private authenticated login and internal-only stores",
    );
  } else if (process.argv.includes("--verify-restart")) {
    const saved = JSON.parse(
      readFileSync("/preview/test-snapshot.json", "utf8"),
    );
    assert.equal(
      JSON.stringify(await snapshot()),
      JSON.stringify(saved.snapshot),
      "Restart/reseed must preserve all business rows and password hashes",
    );
    await api(saved.projectPath);
    console.log(
      "PASS: same-container restart, idempotent reseed, preserved passwords and authenticated read",
    );
  } else {
    const { value: project } = await api(
      "/projects",
      "POST",
      {
        name: "Synthetic 512MB smoke project",
        code: `SMOKE-${randomUUID()}`,
        address: "Synthetic site",
        startsOn: "2026-01-01",
        endsOn: "2027-01-01",
      },
      201,
    );
    const projectPath = `/projects/${project.id}`;
    await api(projectPath);
    const { value: material } = await api(
      `${projectPath}/records/material`,
      "POST",
      {
        sku: "SYNTHETIC-512",
        name: "Synthetic test cement",
        unit: "bag",
        minimum: 5,
      },
      201,
    );
    await api(`${projectPath}/records/${material.id}`, "PATCH", {
      name: "Synthetic updated cement",
      sku: "SYNTHETIC-512",
      unit: "bag",
      minimum: 5,
      expectedVersion: material.version,
    });
    await api(`${projectPath}/status`, "PATCH", { status: "ACTIVE" });
    await api(
      `${projectPath}/status`,
      "PATCH",
      { status: "CANCELLED" },
      403,
      "https://untrusted.invalid",
    );
    const connection = {
      host: "127.0.0.1",
      port: 6379,
      password: new URL(process.env.REDIS_URL).password,
    };
    queue = new Queue("sitecraft-operations", { connection });
    events = new QueueEvents("sitecraft-operations", { connection });
    await events.waitUntilReady();
    const ledgerCount = await db.ledger.count();
    for (let attempt = 0; attempt < 2; attempt++) {
      const job = await queue.add(
        "daily-digest",
        {},
        { removeOnComplete: true },
      );
      await job.waitUntilFinished(events, 15000);
    }
    assert.equal(
      await db.audit.count({
        where: { projectId: project.id, action: "daily.digest" },
      }),
      1,
    );
    assert.equal(
      await db.ledger.count(),
      ledgerCount,
      "Digest must not invent financial postings",
    );
    await api(`${projectPath}/status`, "PATCH", { status: "CANCELLED" });
    writeFileSync(
      "/preview/test-snapshot.json",
      JSON.stringify({ snapshot: await snapshot(), projectPath }),
      { mode: 0o600 },
    );
    console.log(
      "PASS: health, bounded noeviction Redis, authenticated project/material create/read/update/status workflow, CSRF, real in-process BullMQ digest idempotency. Financial delete endpoints intentionally absent.",
    );
  }
} finally {
  await events?.close();
  await queue?.close();
  await redis.quit();
  await db.$disconnect();
}
