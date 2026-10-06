import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type EmailPurpose = "VERIFY" | "RESET" | "CHANGE_EMAIL" | "TEAM_ACCESS";
const TOKEN_TTL_MS: Record<EmailPurpose, number> = { VERIFY: 24 * 3600_000, RESET: 3600_000, CHANGE_EMAIL: 24 * 3600_000, TEAM_ACCESS: 15 * 60_000 };

// 256 random bits: a plain sha256 at rest is enough. The 6-digit code is HMAC'd with the account id
// and AUTH_SECRET, so a leaked table does not hand out codes by a 10^6 lookup.
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const hashCode = (userId: string, code: string) => createHmac("sha256", process.env.AUTH_SECRET ?? "").update(`email-code.${userId}.${code}`).digest("hex");

// Issuing retires every older unused token of the same purpose, so only the latest e-mail works.
export async function issueEmailToken(userId: string, purpose: EmailPurpose, newEmail?: string) {
  const token = randomBytes(32).toString("base64url");
  const code = purpose === "VERIFY" ? String(randomInt(0, 1_000_000)).padStart(6, "0") : undefined;
  await prisma.$transaction([
    prisma.emailToken.updateMany({ where: { userId, purpose, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.emailToken.create({
      data: { userId, purpose, tokenHash: hashToken(token), codeHash: code ? hashCode(userId, code) : null, newEmail, expiresAt: new Date(Date.now() + TOKEN_TTL_MS[purpose]) },
    }),
  ]);
  return { token, code };
}

// Single use under concurrency: the conditional update is the claim, so two clicks consume it once.
async function claim(where: { id: string }) {
  const claimed = await prisma.emailToken.updateMany({ where: { ...where, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
  return claimed.count === 1;
}

export async function consumeEmailToken(token: string, purposes: EmailPurpose[]) {
  const row = await prisma.emailToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || !purposes.includes(row.purpose as EmailPurpose) || !(await claim({ id: row.id }))) return null;
  return row;
}

export async function consumeVerifyCode(userId: string, code: string) {
  const row = await prisma.emailToken.findFirst({ where: { userId, purpose: "VERIFY", usedAt: null, codeHash: hashCode(userId, code.trim()) } });
  return row && (await claim({ id: row.id })) ? row : null;
}
