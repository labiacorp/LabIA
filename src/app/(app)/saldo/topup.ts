"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { stripe, stripeConfigured, TOPUP_PACKS_BRL } from "@/lib/stripe";

// The price is decided here, from the pack list, never from what the browser sends.
export async function startTopup(form: FormData) {
  const userId = await requireUserId();
  const amount = z.coerce.number().pipe(z.union(TOPUP_PACKS_BRL.map((v) => z.literal(v)) as [z.ZodLiteral<20>, ...z.ZodLiteral<number>[]])).safeParse(form.get("amount"));
  if (!amount.success || !stripeConfigured()) redirect("/saldo?erro=recarga");
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  const session = await stripe().checkout.sessions.create({
    mode: "payment", allowed_payment_method_types: ["card"], locale: "pt-BR", customer_email: user.email, client_reference_id: userId,
    line_items: [{ quantity: 1, price_data: { currency: "brl", unit_amount: amount.data * 100, product_data: { name: `Saldo LabIA · R$ ${amount.data}` } } }],
    success_url: `${base}/saldo?pago=1`, cancel_url: `${base}/saldo`,
  });
  redirect(session.url!);
}
