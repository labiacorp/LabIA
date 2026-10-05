import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const REFERRAL_COOKIE = "labia_referral";
export const REFERRAL_TTL = 30 * 24 * 60 * 60;
export function validReferralCode(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{32}$/.test(value);
}

export async function getReferralCode(userId: string) {
  // Compare-and-set keeps a stable link even when two account tabs open together.
  await prisma.user.updateMany({
    where: { id: userId, referralCode: null },
    data: { referralCode: randomBytes(16).toString("hex") },
  });
  return (
    await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { referralCode: true },
    })
  ).referralCode!;
}

// Finds or creates the account behind a sign-in. googleSub is passed only for Google sign-ins, which
// prove the address: they bind the Google account, mark the e-mail verified, and drop a password that
// nobody ever proved (set by whoever typed this address first), revoking any session it produced.
export async function registerSignIn(
  user: { email: string; name?: string | null; image?: string | null },
  code?: string,
  googleSub?: string,
) {
  const email = user.email.toLowerCase();
  const image = user.image ?? undefined;
  if (googleSub) {
    const existing =
      (await prisma.user.findUnique({ where: { googleSub } })) ??
      (await prisma.user.findUnique({ where: { email } }));
    if (existing) {
      if (existing.googleSub && existing.googleSub !== googleSub)
        throw new Error("This e-mail belongs to a different Google account.");
      const unproven = existing.passwordHash !== null && existing.emailVerifiedAt === null;
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          image,
          googleSub,
          emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
          ...(unproven ? { passwordHash: null, tokenVersion: { increment: 1 } } : {}),
        },
      });
    }
  }
  const referrer = validReferralCode(code)
    ? await prisma.user.findUnique({
        where: { referralCode: code },
        select: { id: true, email: true },
      })
    : null;
  // Only the create branch can attribute a referral. Returning users cannot be reassigned.
  return prisma.user.upsert({
    where: { email },
    update: { image },
    create: {
      email,
      name: user.name,
      image: user.image,
      googleSub,
      emailVerifiedAt: googleSub ? new Date() : undefined,
      referredById:
        referrer && referrer.email !== email ? referrer.id : undefined,
    },
  });
}
