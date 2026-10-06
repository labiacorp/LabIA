import Stripe from "stripe";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// Card payments through Stripe Checkout (hosted page: card data never touches this server).
export const TOPUP_PACKS_BRL = [20, 50, 100, 200] as const;
export const stripeConfigured = () => !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET;
let client: Stripe | null = null;
export const stripe = () => (client ??= new Stripe(process.env.STRIPE_SECRET_KEY!));

// Credits a paid Checkout session exactly once. The amount comes from what Stripe says was paid (not from
// metadata), the partial unique index on the note makes a second delivery a no-op.
export async function creditPaidSession(session: Pick<Stripe.Checkout.Session, "id" | "payment_status" | "amount_total" | "currency" | "client_reference_id">) {
  if (session.payment_status !== "paid" || session.currency !== "brl" || !session.amount_total || !session.client_reference_id) return "ignored" as const;
  const user = await prisma.user.findUnique({ where: { id: session.client_reference_id }, select: { id: true } });
  if (!user) return "ignored" as const;
  try {
    await prisma.ledgerEntry.create({ data: { userId: user.id, deltaBrl: session.amount_total / 100, reason: "TOPUP", note: `stripe:${session.id}` } });
    return "credited" as const;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return "duplicate" as const;
    throw error;
  }
}
