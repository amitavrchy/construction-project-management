import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const backend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (!existsSync(resolve(backend, ".env")))
  writeFileSync(
    resolve(backend, ".env"),
    readFileSync(resolve(backend, ".env.example"), "utf8").replace(
      "replace-with-at-least-32-random-characters",
      randomBytes(48).toString("hex"),
    ),
  );
console.log(
  "Backend environment ready. Set SEED_PASSWORD in backend/.env. Frontend proxies to localhost:4000 unless API_URL is set.",
);
