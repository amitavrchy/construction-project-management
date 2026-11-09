import { PrismaClient } from "@prisma/client";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
const db = new PrismaClient();
try {
  const snapshot = async () => {
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
      result[table] = await db.$queryRawUnsafe(
        `SELECT row_to_json(t) AS row FROM "${table}" t ORDER BY id`,
      );
    }
    return result;
  };
  const before = await snapshot();
  const result = spawnSync(
    process.execPath,
    [process.env.npm_execpath, "run", "db:seed"],
    { stdio: "inherit" },
  );
  assert.equal(result.status, 0);
  assert.equal(
    JSON.stringify(await snapshot()) === JSON.stringify(before),
    true,
    "Seed reruns must preserve IDs, passwords and business fields",
  );
  console.log(
    "Seed rerun preserved every database row, including password hashes.",
  );
} finally {
  await db.$disconnect();
}
