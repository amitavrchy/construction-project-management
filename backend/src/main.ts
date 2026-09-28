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
import { startJobs } from "./jobs";
import { Cache } from "./cache";
@Controller("health")
class HealthController {
  constructor(@Inject(Db) private readonly db: Db) {}
  @Get() async check() {
    try {
      await this.db.$queryRawUnsafe("SELECT 1");
    } catch {
      throw new ServiceUnavailableException("Database is unavailable");
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
  ],
  providers: [Db, Cache, ProjectsService],
})
class AppModule {}
async function main() {
  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET.length < 32 ||
    process.env.JWT_SECRET.startsWith("replace-")
  )
    throw new Error("Set JWT_SECRET to at least 32 random characters");
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.setGlobalPrefix("api");
  app.use(helmet());
  app.use(json({ limit: "8mb" }));
  app.use(cookieParser());
  const origins = (process.env.CORS_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((v) => v.trim());
  app.enableCors({ origin: origins, credentials: true });
  const db = app.get(Db);
  app.use("/api", async (req: any, res: any, next: any) => {
    if (req.method === "OPTIONS") return next();
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
      req.headers.origin &&
      !origins.includes(req.headers.origin)
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
      if (!user?.active) throw new Error();
      req.actor = user;
      next();
    } catch {
      return res.status(401).json({ message: "Please sign in to continue" });
    }
  });
  app.useGlobalFilters(new Errors());
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT || 4000), "0.0.0.0");
  const close = await startJobs(db);
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, () => {
      void close();
    });
}
void main();
