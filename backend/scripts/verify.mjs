import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
for (const [app, script] of [
  ["backend", "db:generate"],
  ["backend", "typecheck"],
  ["frontend", "typecheck"],
  ["backend", "test"],
  ["backend", "build"],
  ["frontend", "build"],
]) {
  console.log(`${app}: ${script}`);
  const result = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", script],
    {
      cwd: resolve(root, app),
      stdio: "inherit",
      shell: process.platform === "win32",
    },
  );
  if (result.status !== 0) process.exit(result.status || 1);
}
