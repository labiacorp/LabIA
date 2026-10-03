import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { type CharacterCard, sheetItem } from "./character";
import { collectRunning, quote, startPlan, UserError } from "./generation";
import { getBalanceBrl } from "./ledger";
import { prisma } from "./prisma";

// Integration test of the money path against the real database. Like every check in this repo it seeds its own
// user and deletes it in afterAll (cascade removes influencers, steps, assets and ledger), and never touches real data.
const card: CharacterCard = { name: "QA", role: "tester", mood: "calm", visualSignature: "grey hoodie", persona: "" };
const created: string[] = [];

async function seed(balanceBrl: number) {
  const user = await prisma.user.create({ data: { email: `qa-${randomUUID()}@labia.test` } });
  created.push(user.id);
  const influencer = await prisma.influencer.create({ data: { userId: user.id, name: card.name, niche: card.role, tone: card.mood } });
  if (balanceBrl > 0) await prisma.ledgerEntry.create({ data: { userId: user.id, deltaBrl: balanceBrl, reason: "TOPUP", note: "qa" } });
  return { userId: user.id, influencerId: influencer.id };
}

const sheetPlan = (prompt?: string) => {
  const item = sheetItem(card);
  return [prompt ? { ...item, params: { ...item.params, prompt } } : item];
};
const start = (who: { userId: string; influencerId: string }, plan = sheetPlan(), intentId: string = randomUUID(), expectedBrl = quote(plan).totalBrl) =>
  startPlan({ ...who, intentId, plan, expectedBrl });
const steps = (influencerId: string) => prisma.step.findMany({ where: { influencerId }, include: { assets: true } });

describe.skipIf(!process.env.DATABASE_URL)("character kit money path", () => {
  beforeAll(() => {
    vi.stubEnv("FAL_MOCK", "1");
    vi.stubEnv("FAL_MOCK_DELAY_MS", "0");
    vi.stubEnv("USD_BRL_RATE", "5.4");
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: created } } });
    vi.unstubAllEnvs();
  });

  it("reserves the quoted price, submits once and collects the result once", async () => {
    const who = await seed(10);
    expect((await start(who)).started).toBe(1);
    expect(await getBalanceBrl(who.userId)).toBeCloseTo(10 - 0.648, 4);
    const [step] = await steps(who.influencerId);
    expect(step).toMatchObject({ status: "RUNNING", submissionState: "submitted", kind: "CHARACTER", role: "SHEET" });
    expect(step.falRequestId).toMatch(/^mock-/);

    await Promise.all([1, 2, 3, 4, 5].map(() => collectRunning(who.userId, who.influencerId))); // concurrent polls
    const [done] = await steps(who.influencerId);
    expect(done.status).toBe("DONE");
    expect(done.assets).toHaveLength(1); // exactly one asset despite five polls
    expect(done.assets[0]).toMatchObject({ role: "SHEET", kind: "IMAGE" });
    expect(await getBalanceBrl(who.userId)).toBeCloseTo(10 - 0.648, 4); // actual = estimate, no adjustment
  });

  it("keeps a job pending while fal has not finished", async () => {
    vi.stubEnv("FAL_MOCK_DELAY_MS", "600000");
    const who = await seed(10);
    await start(who);
    expect(await collectRunning(who.userId, who.influencerId)).toEqual({ running: 1 });
    vi.stubEnv("FAL_MOCK_DELAY_MS", "0");
  });

  it("does not charge twice for the same intent, even in parallel", async () => {
    const who = await seed(10);
    const intentId = randomUUID();
    await Promise.allSettled([1, 2, 3, 4, 5].map(() => start(who, sheetPlan(), intentId)));
    expect(await steps(who.influencerId)).toHaveLength(1);
    expect(await prisma.ledgerEntry.count({ where: { userId: who.userId, reason: "SPEND" } })).toBe(1);
    expect(await getBalanceBrl(who.userId)).toBeCloseTo(10 - 0.648, 4);
  });

  it("refuses without enough balance and charges nothing", async () => {
    const who = await seed(0.1);
    await expect(start(who)).rejects.toThrow(UserError);
    expect(await steps(who.influencerId)).toHaveLength(0);
    expect(await getBalanceBrl(who.userId)).toBeCloseTo(0.1, 4);
  });

  it("refuses when the price shown is not the price now", async () => {
    const who = await seed(10);
    await expect(start(who, sheetPlan(), randomUUID(), 0.01)).rejects.toThrow(/preço mudou/);
    expect(await steps(who.influencerId)).toHaveLength(0);
  });

  it("cannot overspend with parallel requests: only what the balance covers goes through", async () => {
    const who = await seed(1); // covers one sheet (R$0.648), not two
    const results = await Promise.allSettled([1, 2, 3, 4, 5].map(() => start(who)));
    expect(results.filter((result) => result.status === "fulfilled" && result.value.started === 1)).toHaveLength(1);
    expect(await steps(who.influencerId)).toHaveLength(1);
    expect(await getBalanceBrl(who.userId)).toBeCloseTo(1 - 0.648, 4);
  });

  it("an ambiguous submit keeps the reservation, is flagged and is never resent", async () => {
    const who = await seed(10);
    await start(who, sheetPlan("[mock-submit-error]"));
    const [step] = await steps(who.influencerId);
    expect(step).toMatchObject({ status: "FAILED", submissionState: "submission_unknown" });
    expect(step.error).toMatch(/Envio incerto/);
    expect(await collectRunning(who.userId, who.influencerId)).toEqual({ running: 0 });
    expect(await getBalanceBrl(who.userId)).toBeCloseTo(10 - 0.648, 4); // no automatic refund
    expect(await prisma.ledgerEntry.count({ where: { userId: who.userId, reason: "REFUND" } })).toBe(0);
  });

  it("refunds once after repeated job failures", async () => {
    const who = await seed(10);
    await start(who, sheetPlan("[mock-fail]"));
    for (let attempt = 0; attempt < 4; attempt++) await collectRunning(who.userId, who.influencerId);
    const [step] = await steps(who.influencerId);
    expect(step.status).toBe("FAILED");
    expect(step.error).toMatch(/A geração falhou/);
    expect(await getBalanceBrl(who.userId)).toBeCloseTo(10, 4);
    expect(await prisma.ledgerEntry.count({ where: { userId: who.userId, reason: "REFUND" } })).toBe(1);
  });

  it("does not let another user collect or see someone else's jobs", async () => {
    const owner = await seed(10);
    const other = await seed(10);
    await start(owner);
    expect(await collectRunning(other.userId, owner.influencerId)).toEqual({ running: 0 });
    const [step] = await steps(owner.influencerId);
    expect(step.status).toBe("RUNNING"); // untouched by the other user's poll
  });
});
