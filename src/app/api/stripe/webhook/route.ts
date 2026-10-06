import { NextResponse } from "next/server";
import { creditPaidSession, stripe, stripeConfigured } from "@/lib/stripe";

// Stripe -> us. The signature is checked against the raw body; anything unsigned is refused.
export async function POST(request: Request) {
  if (!stripeConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "no_signature" }, { status: 400 });
  let event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded")
    await creditPaidSession(event.data.object);
  return NextResponse.json({ received: true });
}
