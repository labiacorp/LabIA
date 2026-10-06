import { afterAll, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getBalanceBrl } from "@/lib/ledger";
import { creditPaidSession } from "./stripe";

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
