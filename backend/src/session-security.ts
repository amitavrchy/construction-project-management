import { createHash } from "node:crypto";

export const passwordWithinLimit = (value: string) =>
  Buffer.byteLength(value, "utf8") <= 72;
export const loginBucket = (kind: string, value: string) =>
  `sitecraft:login:${kind}:${createHash("sha256").update(value).digest("hex")}`;

export function sessionMatches(
  token: Record<string, unknown>,
  user: { sessionVersion: number },
) {
  return (
    Number.isInteger(token.version) && token.version === user.sessionVersion
  );
}
