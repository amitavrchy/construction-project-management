import { existsSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = resolve(root, ".env");
if (!existsSync(env)) {
  const template = readFileSync(resolve(root, ".env.example"), "utf8");
  writeFileSync(
    env,
    template.replace(
      "replace-with-at-least-32-random-characters",
      randomBytes(48).toString("hex"),
    ),
  );
  console.log(
    "Created local .env with a random JWT secret. Set SEED_PASSWORD before seeding.",
  );
}
copyFileSync(env, resolve(root, "backend/.env"));
console.log(
  "Backend environment synchronized. Next: docker compose up -d, npm run db:generate, npm run db:migrate, npm run db:seed, npm run dev.",
);
