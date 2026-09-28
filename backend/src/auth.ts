import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  Inject,
  UnauthorizedException,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { compare, hash } from "bcryptjs";
import { sign } from "jsonwebtoken";
import { z } from "zod";
import { Db } from "./db";
const cookie = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/api",
  maxAge: 8 * 60 * 60 * 1000,
};
const attempts = new Map<string, { count: number; until: number }>();
@Controller("auth")
export class AuthController {
  constructor(@Inject(Db) private db: Db) {}
  @Post("login") async login(
    @Body() input: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = z
      .object({
        email: z.email().toLowerCase(),
        password: z.string().min(1).max(200),
      })
      .parse(input);
    const key = `${req.ip}:${data.email}`;
    const entry = attempts.get(key);
    if (entry && entry.until > Date.now() && entry.count >= 10)
      throw new UnauthorizedException(
        "Too many attempts. Retry in 15 minutes.",
      );
    const user = await this.db.user.findUnique({
      where: { email: data.email },
    });
    if (!user?.active || !(await compare(data.password, user.passwordHash))) {
      attempts.set(key, {
        count: entry && entry.until > Date.now() ? entry.count + 1 : 1,
        until: Date.now() + 900000,
      });
      if (attempts.size > 10000)
        for (const [k, v] of attempts)
          if (v.until < Date.now()) attempts.delete(k);
      throw new UnauthorizedException("Email or password is incorrect");
    }
    attempts.delete(key);
    res.cookie(
      "sitecraft_session",
      sign({ sub: user.id }, process.env.JWT_SECRET!, {
        expiresIn: "8h",
        algorithm: "HS256",
      }),
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
    const { passwordHash, ...user } = req.actor;
    return user;
  }
  @Post("logout") logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie("sitecraft_session", { ...cookie, maxAge: undefined });
    return { ok: true };
  }
  @Post("password") async password(@Req() req: any, @Body() input: unknown) {
    const d = z
      .object({
        currentPassword: z.string(),
        password: z.string().min(12).max(200),
      })
      .parse(input);
    if (!(await compare(d.currentPassword, req.actor.passwordHash)))
      throw new UnauthorizedException("Current password is incorrect");
    await this.db.user.update({
      where: { id: req.actor.id },
      data: { passwordHash: await hash(d.password, 12) },
    });
    return { ok: true };
  }
}
