import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";
const input = z
  .object({
    BOOTSTRAP_COMPANY_NAME: z.string().trim().min(2).max(200),
    BOOTSTRAP_ADMIN_EMAIL: z.email().toLowerCase(),
    BOOTSTRAP_ADMIN_PASSWORD: z
      .string()
      .min(16)
      .refine((value) => Buffer.byteLength(value, "utf8") <= 72),
  })
  .safeParse(process.env);
if (!input.success)
  throw new Error(
    "Set valid BOOTSTRAP_COMPANY_NAME, BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD",
  );
const db = new PrismaClient();
try {
  const data = input.data;
  if (
    await db.user.findUnique({ where: { email: data.BOOTSTRAP_ADMIN_EMAIL } })
  )
    throw new Error(
      "Account already exists; bootstrap never resets passwords or changes existing permissions",
    );
  await db.company.create({
    data: {
      name: data.BOOTSTRAP_COMPANY_NAME,
      users: {
        create: {
          email: data.BOOTSTRAP_ADMIN_EMAIL,
          name: "Company administrator",
          role: "COMPANY_ADMIN",
          passwordHash: await hash(data.BOOTSTRAP_ADMIN_PASSWORD, 12),
        },
      },
    },
  });
  console.log(
    "Administrator created in a separate company. Remove bootstrap variables from the service environment.",
  );
} finally {
  await db.$disconnect();
}
