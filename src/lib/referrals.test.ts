import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import {
  getReferralCode,
  registerSignIn,
  validReferralCode,
} from "./referrals";
const prefix = `referral-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const email = (name: string) => `${prefix}-${name}@example.com`;
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
});
describe("referral attribution", () => {
  it("uses stable opaque links and attributes only a new account, without any credit", async () => {
    const owner = await registerSignIn({ email: email("owner") });
    const codes = await Promise.all([
      getReferralCode(owner.id),
      getReferralCode(owner.id),
    ]);
    expect(codes[0]).toBe(codes[1]);
    expect(validReferralCode(codes[0])).toBe(true);
    const referred = await registerSignIn({ email: email("new") }, codes[0]);
    expect(referred.referredById).toBe(owner.id);
    const other = await registerSignIn({ email: email("other") });
    const otherCode = await getReferralCode(other.id);
    expect(
      (await registerSignIn({ email: referred.email }, otherCode)).referredById,
    ).toBe(owner.id);
    expect(
      (await registerSignIn({ email: owner.email }, codes[0])).referredById,
    ).toBeNull();
    expect(
      (await registerSignIn({ email: other.email }, codes[0])).referredById,
    ).toBeNull();
    expect(
      await prisma.ledgerEntry.count({
        where: { userId: { in: [owner.id, referred.id, other.id] } },
      }),
    ).toBe(0);
  });
  it("ignores malformed and expired/deleted links", async () => {
    expect(validReferralCode("../owner")).toBe(false);
    expect(
      (await registerSignIn({ email: email("invalid") }, "invalid"))
        .referredById,
    ).toBeNull();
    expect(
      (await registerSignIn({ email: email("missing") }, "f".repeat(32)))
        .referredById,
    ).toBeNull();
  });
});
