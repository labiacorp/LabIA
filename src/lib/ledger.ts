import { prisma } from "@/lib/prisma";

// Founders test without topping up: these e-mails skip the balance check. Spends are still recorded in the ledger.
export function hasUnlimitedBalance(email?: string | null) {
  if (!email) return false;
  return (process.env.UNLIMITED_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .includes(email.toLowerCase());
}

export async function getBalanceBrl(userId: string) {
  const [user, { _sum }] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
    prisma.ledgerEntry.aggregate({ where: { userId }, _sum: { deltaBrl: true } }),
  ]);
  if (hasUnlimitedBalance(user?.email)) return Infinity;
  return Number(_sum.deltaBrl?.toString() ?? 0);
}

// Real prepaid credit left on fal.ai, in USD, for the founders' accounts. Needs an ADMIN-scoped key
// (FAL_ADMIN_KEY); the generation key cannot read billing. null = not configured or unreadable.
export async function getFalCreditsUsd(): Promise<number | null> {
  const key = process.env.FAL_ADMIN_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.fal.ai/v1/account/billing?expand=credits", {
      headers: { Authorization: `Key ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const balance = Number((await res.json())?.credits?.current_balance);
    return Number.isFinite(balance) ? balance : null;
  } catch {
    return null;
  }
}
