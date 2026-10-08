import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

import { REFERRAL_BONUS_BRL, REFERRAL_CAP_BRL } from "@/lib/referral-rules";
import { consentAcceptedNow } from "@/lib/consent";

// The referral program (docs/research/referrals.md). Values are a first guess to validate with real users.
const INVITES_BASE = 3;
const INVITES_PER_STEP = 3;
const INVITES_STEP_BRL = 50;

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
// consented: the terms checkbox was ticked before the Google redirect (CONSENT_COOKIE), so the first acceptance is recorded.
export async function registerSignIn(
  user: { email: string; name?: string | null; image?: string | null },
  code?: string,
  googleSub?: string,
  consented = false,
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
          ...(consented && existing.consentAcceptedAt === null ? consentAcceptedNow() : {}),
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
      ...(consented ? consentAcceptedNow() : {}),
      emailVerifiedAt: googleSub ? new Date() : undefined,
      referredById:
        referrer && referrer.email !== email ? referrer.id : undefined,
    },
  });
}

// Invites still open on a link: 3 to start, 3 more per R$ 50 spent on generations. Every account created
// through the link uses one.
export async function invitesLeft(userId: string) {
  const [{ _sum }, used] = await Promise.all([
    prisma.ledgerEntry.aggregate({ where: { userId, reason: { in: ["SPEND", "REFUND"] } }, _sum: { deltaBrl: true } }),
    prisma.user.count({ where: { referredById: userId } }),
  ]);
  const spent = Math.max(0, -Number(_sum.deltaBrl?.toString() ?? 0));
  return Math.max(0, INVITES_BASE + INVITES_PER_STEP * Math.floor(spent / INVITES_STEP_BRL) - used);
}

// Paid top-up of a referred account: R$ 10 for them and R$ 10 for whoever invited them (up to R$ 100 in total).
// Called on every paid top-up; the unique index on "referral%" notes makes all but the first a no-op.
export async function grantReferralBonus(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { referredById: true } });
  if (!user?.referredById) return;
  const { _sum } = await prisma.ledgerEntry.aggregate({
    where: { userId: user.referredById, reason: "REFERRAL", note: { startsWith: "referral:" } },
    _sum: { deltaBrl: true },
  });
  const capped = Number(_sum.deltaBrl?.toString() ?? 0) + REFERRAL_BONUS_BRL > REFERRAL_CAP_BRL;
  await prisma.ledgerEntry.createMany({
    skipDuplicates: true,
    data: [
      { userId, deltaBrl: REFERRAL_BONUS_BRL, reason: "REFERRAL", note: `referral-welcome:${userId}` },
      ...(capped ? [] : [{ userId: user.referredById, deltaBrl: REFERRAL_BONUS_BRL, reason: "REFERRAL" as const, note: `referral:${userId}` }]),
    ],
  });
}

export async function referralStats(userId: string) {
  const [accounts, { _sum, _count }, invites] = await Promise.all([
    prisma.user.count({ where: { referredById: userId } }),
    prisma.ledgerEntry.aggregate({ where: { userId, reason: "REFERRAL", note: { startsWith: "referral:" } }, _sum: { deltaBrl: true }, _count: true }),
    invitesLeft(userId),
  ]);
  return { accounts, confirmed: _count, earnedBrl: Number(_sum.deltaBrl?.toString() ?? 0), invites };
}
