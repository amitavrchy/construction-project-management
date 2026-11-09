import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { hash } from "bcryptjs";
import { Db } from "../src/db";

test(
  "HTTP origin, cache, session revocation and shared login protection",
  { skip: !process.env.DATABASE_URL || !process.env.REDIS_URL, timeout: 30000 },
  async () => {
    const listener = createServer();
    await new Promise<void>((resolve) =>
      listener.listen(0, "127.0.0.1", resolve),
    );
    const port = (listener.address() as { port: number }).port;
    await new Promise<void>((resolve) => listener.close(() => resolve()));
    const db = new Db(),
      companyId = randomUUID(),
      password = randomUUID();
    const email = `${companyId}@http-test.invalid`;
    await db.company.create({
      data: { id: companyId, name: "Isolated HTTP security test" },
    });
    await db.user.create({
      data: {
        companyId,
        email,
        name: "HTTP test operator",
        role: "COMPANY_ADMIN",
        passwordHash: await hash(password, 12),
      },
    });
    const server = spawn(process.execPath, ["--import", "tsx", "src/main.ts"], {
      env: {
        ...process.env,
        NODE_ENV: "test",
        PORT: String(port),
        JWT_SECRET: randomUUID() + randomUUID(),
        CORS_ORIGINS: "http://localhost:3000",
      },
      stdio: "ignore",
    });
    const base = `http://127.0.0.1:${port}/api`;
    const post = (
      path: string,
      body: unknown,
      cookie = "",
      origin = "http://localhost:3000",
    ) =>
      fetch(base + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(origin ? { Origin: origin } : {}),
          Cookie: cookie,
        },
        body: JSON.stringify(body),
      });
    try {
      let ready = false;
      for (let i = 0; i < 100; i++) {
        try {
          if ((await fetch(base + "/health")).ok) {
            ready = true;
            break;
          }
        } catch {}
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      assert.equal(ready, true, "Isolated test API must start");
      assert.equal(
        (await post("/auth/login", { email, password }, "", "")).status,
        403,
      );
      assert.equal(
        (
          await post(
            "/auth/login",
            { email, password },
            "",
            "https://untrusted.invalid",
          )
        ).status,
        403,
      );
      let login = await post("/auth/login", { email, password });
      assert.equal(login.status, 201);
      assert.match(login.headers.get("set-cookie") || "", /HttpOnly/);
      let cookie = login.headers.get("set-cookie")!.split(";")[0];
      let me = await fetch(base + "/auth/me", { headers: { Cookie: cookie } });
      assert.equal(me.status, 200);
      assert.equal(me.headers.get("cache-control"), "private, no-store");
      const profile = (await me.json()) as Record<string, unknown>;
      assert.equal("passwordHash" in profile, false);
      assert.equal("sessionVersion" in profile, false);
      assert.equal((await post("/auth/logout", {}, cookie)).status, 201);
      assert.equal(
        (await fetch(base + "/auth/me", { headers: { Cookie: cookie } }))
          .status,
        401,
      );
      login = await post("/auth/login", { email, password });
      cookie = login.headers.get("set-cookie")!.split(";")[0];
      assert.equal(
        (
          await post(
            "/auth/password",
            { currentPassword: password, password: randomUUID() },
            cookie,
          )
        ).status,
        201,
      );
      assert.equal(
        (await fetch(base + "/auth/me", { headers: { Cookie: cookie } }))
          .status,
        401,
      );
      let limited = false;
      for (let i = 0; i < 11; i++)
        if (
          (await post("/auth/login", { email, password: "incorrect" }))
            .status === 429
        )
          limited = true;
      assert.equal(limited, true);
    } finally {
      server.kill();
      await new Promise<void>((resolve) => {
        if (server.exitCode !== null) resolve();
        else server.once("exit", () => resolve());
      });
      await db.user.deleteMany({ where: { companyId } });
      await db.company.delete({ where: { id: companyId } });
      await db.$disconnect();
    }
  },
);
