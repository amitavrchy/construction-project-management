import { cpSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const standalone = existsSync(resolve(frontend, ".next/standalone/server.js"))
  ? resolve(frontend, ".next/standalone")
  : resolve(frontend, ".next/standalone/frontend");
if (!existsSync(resolve(standalone, "server.js")))
  throw new Error("Production build missing. Run npm run build first.");
cpSync(resolve(frontend, ".next/static"), resolve(standalone, ".next/static"), {
  recursive: true,
});
if (existsSync(resolve(frontend, "public")))
  cpSync(resolve(frontend, "public"), resolve(standalone, "public"), {
    recursive: true,
  });
await import(pathToFileURL(resolve(standalone, "server.js")).href);
