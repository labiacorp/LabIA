"use server";
import { redirect } from "next/navigation";
import { requireUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { activePlan, PLAN_PRICE_CENTS, stripe, stripeConfigured } from "@/lib/stripe";

const base = () => process.env.AUTH_URL ?? "http://localhost:3000";
// A Stripe failure (bad or expired key, outage) sends the user back with a message instead of the error page.
async function hosted(open: () => Promise<string | null | undefined>) {
  const url = await open().catch((error) => { console.error("stripe", error); return null; });
  redirect(url || "/saldo?erro=assinatura");
}

// The price is fixed here, never sent by the browser. An active subscriber goes to the portal instead,
// so a double click cannot open a second subscription.
export async function startSubscription() {
  const userId = await requireUserId();
  if (!stripeConfigured()) redirect("/saldo?erro=assinatura");
  if (await activePlan(userId)) return openBillingPortal();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  return hosted(async () => (await stripe().checkout.sessions.create({
    mode: "subscription", locale: "pt-BR", customer_email: user.email, client_reference_id: userId,
    line_items: [{ quantity: 1, price_data: { currency: "brl", unit_amount: PLAN_PRICE_CENTS, recurring: { interval: "month" }, product_data: { name: "LabIA · assinatura mensal" } } }],
    subscription_data: { metadata: { userId } },
    success_url: `${base()}/saldo?assinado=1`, cancel_url: `${base()}/saldo`,
  })).url);
}

// Card, invoices and cancellation live in Stripe's hosted portal.
export async function openBillingPortal() {
  const userId = await requireUserId();
  if (!stripeConfigured()) redirect("/saldo?erro=assinatura");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  return hosted(async () => {
    const [customer] = (await stripe().customers.list({ email: user.email, limit: 1 })).data;
    return customer && (await stripe().billingPortal.sessions.create({ customer: customer.id, locale: "pt-BR", return_url: `${base()}/saldo` })).url;
  });
}
