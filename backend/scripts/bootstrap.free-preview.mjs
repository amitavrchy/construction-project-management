import { z } from "zod";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

if (
  process.env.FREE_PREVIEW !== "true" ||
  process.env.ALLOW_PRODUCTION_SEED !== "true"
)
  throw new Error("Preview bootstrap opt-ins required");
const input = z
  .object({
    PREVIEW_LOGIN_EMAIL: z.email().max(254).toLowerCase(),
    PREVIEW_LOGIN_PASSWORD: z
      .string()
      .min(16)
      .refine((value) => Buffer.byteLength(value, "utf8") <= 72),
  })
  .safeParse(process.env);
if (!input.success)
  throw new Error("Supply valid private preview login credentials");
const db = new PrismaClient();
try {
  const existing = await db.user.findUnique({
    where: { id: "free-preview-operator" },
  });
  if (existing) {
    if (
      existing.email !== input.data.PREVIEW_LOGIN_EMAIL ||
      existing.companyId !== "company-sitecraft"
    )
      throw new Error("Preview account conflict");
    console.log(
      "Private preview account preserved; password and business edits unchanged.",
    );
  } else {
    await db.user.create({
      data: {
        id: "free-preview-operator",
        companyId: "company-sitecraft",
        email: input.data.PREVIEW_LOGIN_EMAIL,
        name: "Synthetic preview operator",
        role: "COMPANY_ADMIN",
        passwordHash: await hash(input.data.PREVIEW_LOGIN_PASSWORD, 12),
        memberships: {
          create: {
            id: "free-preview-membership",
            projectId: "project-greenwood",
            role: "COMPANY_ADMIN",
          },
        },
      },
    });
    console.log(
      "Private synthetic-company preview account created from supplied credentials.",
    );
  }
} catch {
  console.error(
    "Preview account bootstrap failed; check credentials or namespace conflicts. No existing account was reset.",
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
