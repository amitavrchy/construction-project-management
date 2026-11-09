import "reflect-metadata";
import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env"), quiet: true });
config({ path: resolve(process.cwd(), "../.env"), quiet: true });
import {
  Module,
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { json } from "express";
import { verify } from "jsonwebtoken";
import { Db } from "./db";
import { AuthController } from "./auth";
import { ProjectsService } from "./projects.service";
import { ProjectsController } from "./projects.controller";
import { TeamController } from "./team.controller";
import { Errors } from "./errors";
import { JobsLifecycle } from "./jobs";
import { Cache } from "./cache";
import { AdvancedService } from "./advanced/service";
import { AdvancedController } from "./advanced/controller";
import { sessionMatches } from "./session-security";
@Controller("health")
class HealthController {
  constructor(
    @Inject(Db) private readonly db: Db,
    @Inject(Cache) private readonly cache: Cache,
  ) {}
  @Get() async check() {
    try {
      await this.db.$queryRawUnsafe("SELECT 1");
      await this.cache.ready();
    } catch {
      throw new ServiceUnavailableException(
        "A required datastore is unavailable",
      );
    }
    return { status: "ok" };
  }
}
@Module({
  controllers: [
    HealthController,
    AuthController,
    ProjectsController,
    TeamController,
    AdvancedController,
  ],
  providers: [Db, Cache, ProjectsService, AdvancedService, JobsLifecycle],
})
class AppModule {}
async function main() {
  if (!process.env.REDIS_URL)
    throw new Error(
      "REDIS_URL is required for login protection and scheduled jobs",
    );
  if (process.env.NODE_ENV === "production") {
    if (
      !process.env.APP_URL ||
      new URL(process.env.APP_URL).protocol !== "https:"
    )
      throw new Error("Production APP_URL must use HTTPS");
    if (!process.env.CORS_ORIGINS)
      throw new Error("Production CORS_ORIGINS is required");
    for (const origin of process.env.CORS_ORIGINS.split(",")) {
      const url = new URL(origin.trim());
      if (url.protocol !== "https:" || url.origin !== origin.trim())
        throw new Error("CORS_ORIGINS must contain exact HTTPS origins");
    }
  }
  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET.length < 32 ||
    process.env.JWT_SECRET.startsWith("replace-")
  )
    throw new Error("Set JWT_SECRET to at least 32 random characters");
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.setGlobalPrefix("api");
  if (process.env.NODE_ENV === "production")
    app.getHttpAdapter().getInstance().set("trust proxy", 1);
  app.use(helmet());
  app.use(json({ limit: "8mb" }));
  app.use(cookieParser());
  const origins = (process.env.CORS_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((v) => v.trim());
  app.enableCors({ origin: origins, credentials: true });
  const db = app.get(Db);
  app.use("/api", async (req: any, res: any, next: any) => {
    res.setHeader("Cache-Control", "private, no-store");
    if (req.method === "OPTIONS") return next();
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
      (!req.headers.origin || !origins.includes(req.headers.origin))
    )
      return res.status(403).json({ message: "Origin not permitted" });
    if (req.path === "/auth/login" || req.path === "/health") return next();
    try {
      const token = verify(
        req.cookies.sitecraft_session || "",
        process.env.JWT_SECRET!,
        { algorithms: ["HS256"] },
      );
      if (typeof token === "string" || !token.sub) throw new Error();
      const user = await db.user.findUnique({ where: { id: token.sub } });
      if (!user?.active || !sessionMatches(token, user)) throw new Error();
      req.actor = user;
      next();
    } catch {
      return res.status(401).json({ message: "Please sign in to continue" });
    }
  });
  app.useGlobalFilters(new Errors());
  await app.listen(Number(process.env.PORT || 4000), "0.0.0.0");
  let closing = false;
  const shutdown = async () => {
    if (closing) return;
    closing = true;
    // Stop jobs before app.close disconnects Prisma and the cache.
    await app.get(JobsLifecycle).stop();
    await app.close();
  };
  process.once("SIGTERM", () => void shutdown());
  process.once("SIGINT", () => void shutdown());
}
void main();
