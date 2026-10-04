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

export async function registerSignIn(
  user: { email: string; name?: string | null; image?: string | null },
  code?: string,
) {
  const email = user.email.toLowerCase();
  const referrer = validReferralCode(code)
    ? await prisma.user.findUnique({
        where: { referralCode: code },
        select: { id: true, email: true },
      })
    : null;
  // Only the create branch can attribute a referral. Returning users cannot be reassigned.
  return prisma.user.upsert({
    where: { email },
    update: { image: user.image ?? undefined },
    create: {
      email,
      name: user.name,
      image: user.image,
      referredById:
        referrer && referrer.email !== email ? referrer.id : undefined,
    },
  });
}
