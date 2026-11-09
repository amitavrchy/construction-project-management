import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  Inject,
  UnauthorizedException,
  HttpException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { compare, hash } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { z } from "zod";
import { Db } from "./db";
import { Cache } from "./cache";
import { loginBucket, passwordWithinLimit } from "./session-security";
const cookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/api",
  maxAge: 8 * 60 * 60 * 1000,
};
@Controller("auth")
export class AuthController {
  constructor(
    @Inject(Db) private db: Db,
    @Inject(Cache) private cache: Cache,
  ) {}
  @Post("login") async login(
    @Body() input: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = z
      .object({
        email: z.email().toLowerCase(),
        password: z
          .string()
          .min(1)
          .max(200)
          .refine(passwordWithinLimit, "Password exceeds 72 UTF-8 bytes"),
      })
      .parse(input);
    const limits = await Promise.all([
      this.cache.limit(loginBucket("ip", req.ip || "unknown"), 50, 900),
      this.cache.limit(loginBucket("email", data.email), 10, 900),
    ]);
    if (limits.includes(false))
      throw new HttpException("Too many attempts. Retry in 15 minutes.", 429);
    const user = await this.db.user.findUnique({
      where: { email: data.email },
    });
    if (!user?.active || !(await compare(data.password, user.passwordHash))) {
      throw new UnauthorizedException("Email or password is incorrect");
    }
    res.cookie(
      "sitecraft_session",
      sign(
        { sub: user.id, version: user.sessionVersion },
        process.env.JWT_SECRET!,
        {
          expiresIn: "8h",
          algorithm: "HS256",
        },
      ),
      cookie,
    );
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    };
  }
  @Get("me") me(@Req() req: any) {
    const { passwordHash, sessionVersion, ...user } = req.actor;
    return user;
  }
  @Post("logout") async logout(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.db.user.update({
      where: { id: req.actor.id },
      data: { sessionVersion: { increment: 1 } },
    });
    res.clearCookie("sitecraft_session", { ...cookie, maxAge: undefined });
    return { ok: true };
  }
  @Post("password") async password(@Req() req: any, @Body() input: unknown) {
    const d = z
      .object({
        currentPassword: z.string(),
        password: z
          .string()
          .min(12)
          .max(200)
          .refine(passwordWithinLimit, "Password exceeds 72 UTF-8 bytes"),
      })
      .parse(input);
    if (!(await compare(d.currentPassword, req.actor.passwordHash)))
      throw new UnauthorizedException("Current password is incorrect");
    await this.db.user.update({
      where: { id: req.actor.id },
      data: {
        passwordHash: await hash(d.password, 12),
        sessionVersion: { increment: 1 },
      },
    });
    return { ok: true };
  }
}
