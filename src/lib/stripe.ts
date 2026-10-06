import Stripe from "stripe";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { grantReferralBonus } from "@/lib/referrals";
import { PLAN_GRANT_BRL, PLAN_PRICE_BRL } from "@/lib/plan";

// One monthly subscription through Stripe Checkout (hosted page: card data never touches this server).
export const stripeConfigured = () => !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET;
let client: Stripe | null = null;
export const stripe = () => (client ??= new Stripe(process.env.STRIPE_SECRET_KEY!));

export const PLAN_PRICE_CENTS = Math.round(PLAN_PRICE_BRL * 100);
const GRANTING = new Set(["subscription_create", "subscription_cycle"]);
type PaidInvoice = Pick<Stripe.Invoice, "id" | "status" | "currency" | "amount_paid" | "billing_reason" | "parent">;

// Grants the month's credits for a paid subscription invoice exactly once: the partial unique index on
// notes starting with "stripe:" turns a second delivery into a no-op. The user comes from the subscription
// metadata we set at checkout, never from anything the browser sends.
export async function grantPaidInvoice(invoice: PaidInvoice) {
  const userId = invoice.parent?.subscription_details?.metadata?.userId;
  if (invoice.status !== "paid" || invoice.currency !== "brl" || !invoice.amount_paid || !GRANTING.has(invoice.billing_reason ?? "") || !userId)
    return "ignored" as const;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return "ignored" as const;
  try {
    await prisma.ledgerEntry.create({ data: { userId: user.id, deltaBrl: PLAN_GRANT_BRL, reason: "TOPUP", note: `stripe:${invoice.id}` } });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    await grantReferralBonus(user.id);
    return "duplicate" as const;
  }
  await grantReferralBonus(user.id);
  return "credited" as const;
}

// Active = a subscription invoice was paid in the last 35 days (a month plus Stripe's retry window).
// Derived from the ledger, so the UI needs no Stripe call and no schema change.
export async function activePlan(userId: string) {
  const last = await prisma.ledgerEntry.findFirst({
    where: { userId, reason: "TOPUP", note: { startsWith: "stripe:in_" }, createdAt: { gte: new Date(Date.now() - 35 * 86_400_000) } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return last ? { renewedAt: last.createdAt } : null;
}
