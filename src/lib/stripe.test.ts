import { afterAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getBalanceBrl } from "@/lib/ledger";
import { PLAN_GRANT_BRL } from "@/lib/plan";
import { activePlan, grantPaidInvoice } from "./stripe";
import { invitesLeft } from "./referrals";

const ids: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: ids } } }); });
const invoice = (userId: string, over = {}) => ({
  id: `in_test_${randomUUID()}`, status: "paid" as const, currency: "brl", amount_paid: 4990, billing_reason: "subscription_cycle" as const,
  parent: { type: "subscription_details" as const, quote_details: null, subscription_details: { metadata: { userId }, subscription: "sub_test" } },
  ...over,
});
const make = (referredById?: string) => prisma.user.create({ data: { email: `stripe-${randomUUID()}@example.com`, referredById } }).then((u) => (ids.push(u.id), u));

it("grants the month's credits once per paid invoice, even when Stripe delivers it twice or in parallel", async () => {
  const user = await make();
  expect(await activePlan(user.id)).toBeNull();
  const paid = invoice(user.id);
  const results = await Promise.all([grantPaidInvoice(paid), grantPaidInvoice(paid), grantPaidInvoice(paid)]);
  expect(results.filter((r) => r === "credited")).toHaveLength(1);
  expect(await grantPaidInvoice(paid)).toBe("duplicate");
  expect(await getBalanceBrl(user.id)).toBeCloseTo(PLAN_GRANT_BRL);
  expect(await activePlan(user.id)).not.toBeNull();
  await grantPaidInvoice(invoice(user.id));
  expect(await getBalanceBrl(user.id)).toBeCloseTo(2 * PLAN_GRANT_BRL);
});

it("ignores unpaid invoices, other currencies, non-subscription invoices and unknown users", async () => {
  const user = await make();
  for (const over of [{ status: "open" }, { currency: "usd" }, { amount_paid: 0 }, { billing_reason: "manual" }, { parent: null }])
    expect(await grantPaidInvoice(invoice(user.id, over) as Parameters<typeof grantPaidInvoice>[0])).toBe("ignored");
  expect(await grantPaidInvoice(invoice("nobody"))).toBe("ignored");
  expect(await getBalanceBrl(user.id)).toBe(0);
});

it("pays the referral bonus once to both sides on paid invoices, and stops the inviter at the cap", async () => {
  const inviter = await make();
  // R$ 90 already earned: one more R$ 10 fits, the next one would pass R$ 100.
  await prisma.ledgerEntry.createMany({ data: Array.from({ length: 9 }, () => ({ userId: inviter.id, deltaBrl: 10, reason: "REFERRAL" as const, note: `referral:${randomUUID()}` })) });
  const [first, second] = [await make(inviter.id), await make(inviter.id)];
  const paid = invoice(first.id);
  await Promise.all([grantPaidInvoice(paid), grantPaidInvoice(paid)]);
  await grantPaidInvoice(invoice(first.id));
  expect(await getBalanceBrl(first.id)).toBeCloseTo(2 * PLAN_GRANT_BRL + 10);
  expect(await getBalanceBrl(inviter.id)).toBe(100);
  await grantPaidInvoice(invoice(second.id));
  expect(await getBalanceBrl(second.id)).toBeCloseTo(PLAN_GRANT_BRL + 10);
  expect(await getBalanceBrl(inviter.id)).toBe(100);
  // 3 invites, 2 used; R$ 50 spent unlocks 3 more.
  expect(await invitesLeft(inviter.id)).toBe(1);
  await prisma.ledgerEntry.create({ data: { userId: inviter.id, deltaBrl: -50, reason: "SPEND" } });
  expect(await invitesLeft(inviter.id)).toBe(4);
});
