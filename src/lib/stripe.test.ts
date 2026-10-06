import { afterAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getBalanceBrl } from "@/lib/ledger";
import { creditPaidSession } from "./stripe";
import { invitesLeft } from "./referrals";

const ids: string[] = [];
afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: ids } } }); });
const session = (userId: string, over = {}) => ({ id: `cs_test_${randomUUID()}`, payment_status: "paid" as const, amount_total: 5000, currency: "brl", client_reference_id: userId, ...over });

it("credits a paid session once, even when Stripe delivers it twice or in parallel", async () => {
  const user = await prisma.user.create({ data: { email: `stripe-${randomUUID()}@example.com` } });
  ids.push(user.id);
  const paid = session(user.id);
  const results = await Promise.all([creditPaidSession(paid), creditPaidSession(paid), creditPaidSession(paid)]);
  expect(results.filter((r) => r === "credited")).toHaveLength(1);
  expect(await getBalanceBrl(user.id)).toBe(50);
  expect(await creditPaidSession(paid)).toBe("duplicate");
  expect(await getBalanceBrl(user.id)).toBe(50);
});

it("ignores unpaid sessions, other currencies and unknown users", async () => {
  const user = await prisma.user.create({ data: { email: `stripe-${randomUUID()}@example.com` } });
  ids.push(user.id);
  expect(await creditPaidSession(session(user.id, { payment_status: "unpaid" }))).toBe("ignored");
  expect(await creditPaidSession(session(user.id, { currency: "usd" }))).toBe("ignored");
  expect(await creditPaidSession(session("nobody"))).toBe("ignored");
  expect(await getBalanceBrl(user.id)).toBe(0);
});

it("pays the referral bonus once to both sides on paid top-ups, and stops the inviter at the cap", async () => {
  const make = (referredById?: string) => prisma.user.create({ data: { email: `stripe-${randomUUID()}@example.com`, referredById } });
  const inviter = await make();
  ids.push(inviter.id);
  // R$ 90 already earned: one more R$ 10 fits, the next one would pass R$ 100.
  await prisma.ledgerEntry.createMany({ data: Array.from({ length: 9 }, () => ({ userId: inviter.id, deltaBrl: 10, reason: "REFERRAL" as const, note: `referral:${randomUUID()}` })) });
  const [first, second] = [await make(inviter.id), await make(inviter.id)];
  ids.push(first.id, second.id);
  const paid = session(first.id);
  await Promise.all([creditPaidSession(paid), creditPaidSession(paid)]);
  await creditPaidSession(session(first.id));
  expect(await getBalanceBrl(first.id)).toBe(110);
  expect(await getBalanceBrl(inviter.id)).toBe(100);
  await creditPaidSession(session(second.id));
  expect(await getBalanceBrl(second.id)).toBe(60);
  expect(await getBalanceBrl(inviter.id)).toBe(100);
  // 3 invites, 2 used; R$ 50 spent unlocks 3 more.
  expect(await invitesLeft(inviter.id)).toBe(1);
  await prisma.ledgerEntry.create({ data: { userId: inviter.id, deltaBrl: -50, reason: "SPEND" } });
  expect(await invitesLeft(inviter.id)).toBe(4);
});
