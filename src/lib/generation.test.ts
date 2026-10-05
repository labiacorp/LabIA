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

  it("rejects archived content before creating a step or reserving funds", async () => {
    const who = await seed(0);
    const content = await prisma.content.create({
      data: {
        influencerId: who.influencerId,
        title: "Archived QA",
        archivedAt: new Date(),
      },
    });
    const plan = [{ ...sheetItem(card), role: null }];
    await expect(
      startPlan({
        ...who,
        contentId: content.id,
        contentKind: "IMAGE",
        intentId: randomUUID(),
        plan,
        expectedBrl: quote(plan).totalBrl,
      }),
    ).rejects.toThrow("Restaure o conteúdo");
    expect(await prisma.step.count({ where: { contentId: content.id } })).toBe(
      0,
    );
    expect(
      await prisma.ledgerEntry.count({ where: { userId: who.userId } }),
    ).toBe(0);
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

// Content uses the same ledger path; only the target and reference change.
describe.skipIf(!process.env.DATABASE_URL)("content scene money path", () => {
  beforeAll(() => {
    vi.stubEnv("FAL_MOCK", "1");
    vi.stubEnv("FAL_MOCK_DELAY_MS", "0");
    vi.stubEnv("USD_BRL_RATE", "5.4");
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: created } } });
    vi.unstubAllEnvs();
  });

  async function contentSeed(balance = 10, withFront = true) {
    const who = await seed(balance);
    const content = await prisma.content.create({ data: {
      influencerId: who.influencerId, title: "Scene QA", idea: "A creator holding a product", aspectRatio: "9:16",
      steps: { create: [{ kind: "SCRIPT", position: 0 }, { kind: "IMAGE", position: 1 }] },
    } });
    if (withFront) {
      const step = await prisma.step.create({ data: { influencerId: who.influencerId, kind: "CHARACTER", role: "FRONT", status: "DONE", position: 0 } });
      const reference = await prisma.asset.create({ data: { userId: who.userId, influencerId: who.influencerId, stepId: step.id, role: "FRONT", kind: "IMAGE", url: "/mock/portrait.svg" } });
      await prisma.influencer.update({ where: { id: who.influencerId }, data: { faceAssetId: reference.id } });
      // A newer portrait must not silently replace the selected reference.
      await prisma.asset.create({ data: { userId: who.userId, influencerId: who.influencerId, stepId: step.id, role: "FRONT", kind: "IMAGE", url: "/mock/unselected.svg" } });
    }
    return { ...who, contentId: content.id };
  }
  const runScene = async (who: Awaited<ReturnType<typeof contentSeed>>, overrides: Partial<{ intentId: string; prompt: string; expectedBrl: number; selection: import("./content-generation").ImageSelection }> = {}) => {
    const { startContentImage, sceneQuote } = await import("./content-generation");
    return startContentImage({ ...who, intentId: randomUUID(), prompt: "A creator holding a product", expectedBrl: sceneQuote().totalBrl, ...overrides });
  };
  const image = (contentId: string) => prisma.step.findFirstOrThrow({ where: { contentId, kind: "IMAGE" }, include: { assets: true } });

  it("runs the existing IMAGE step from FRONT, links its asset to content and preserves the face", async () => {
    const who = await contentSeed();
    const influencer = await prisma.influencer.findUniqueOrThrow({ where: { id: who.influencerId } });
    await runScene(who);
    const running = await image(who.contentId);
    expect(running).toMatchObject({ kind: "IMAGE", role: null, position: 1, status: "RUNNING", influencerId: who.influencerId });
    expect(running.input).toMatchObject({ image_urls: ["/mock/portrait.svg"], aspect_ratio: "9:16", resolution: "1K" });
    expect(running.model).toBe("fal-ai/nano-banana-2/edit");
    await Promise.all([1, 2, 3].map(() => collectRunning(who.userId, who.influencerId)));
    const done = await image(who.contentId);
    expect(done.status).toBe("DONE");
    expect(done.assets).toHaveLength(1);
    expect(done.assets[0]).toMatchObject({ userId: who.userId, contentId: who.contentId, influencerId: who.influencerId, role: null });
    expect(await getBalanceBrl(who.userId)).toBeCloseTo(10 - 0.432, 4);
    expect((await prisma.influencer.findUniqueOrThrow({ where: { id: who.influencerId } })).faceAssetId).toBe(influencer.faceAssetId);
    expect((await prisma.content.findUniqueOrThrow({ where: { id: who.contentId } })).status).toBe("IN_PROGRESS");
  });

  it("persists a selected scene model, reserves its quote once and collects a mock image", async () => {
    const who = await contentSeed();
    const selection = { model: "bytedance/seedream/v5/lite/edit", resolution: "2K" };
    await runScene(who, { selection, expectedBrl: .189 });
    const running = await image(who.contentId);
    expect(running.model).toBe(selection.model);
    expect(running.input).toMatchObject({ image_urls: ["/mock/portrait.svg"], resolution: "2K", imagePricing: { unitUsd: .035, usdBrlRate: 5.4 } });
    await collectRunning(who.userId, who.influencerId);
    expect((await image(who.contentId)).status).toBe("DONE");
    expect(await getBalanceBrl(who.userId)).toBeCloseTo(9.811, 4);
  });

  it("rejects an unregistered image endpoint without reserving funds", async () => {
    const who = await contentSeed();
    await expect(runScene(who, { selection: { model: "unregistered", resolution: "1K" } })).rejects.toThrow(UserError);
    expect(await getBalanceBrl(who.userId)).toBe(10);
    expect((await image(who.contentId)).status).toBe("PENDING");
  });

  it("refuses a scene without a completed front portrait", async () => {
    const who = await contentSeed(10, false);
    await expect(runScene(who)).rejects.toThrow(/retrato de frente/);
    expect((await image(who.contentId)).status).toBe("PENDING");
    expect(await getBalanceBrl(who.userId)).toBe(10);
  });

  it("never charges or submits twice for the same step, including different intents", async () => {
    const who = await contentSeed();
    const intentId = randomUUID();
    const results = await Promise.all([runScene(who, { intentId }), runScene(who, { intentId }), runScene(who)]);
    expect(results.reduce((sum, result) => sum + result.started, 0)).toBe(1);
    expect(await prisma.ledgerEntry.count({ where: { userId: who.userId, reason: "SPEND" } })).toBe(1);
    await collectRunning(who.userId, who.influencerId);
    expect((await runScene(who)).started).toBe(0);
  });

  it("serializes different content spends on the same user balance", async () => {
    const who = await contentSeed(0.6);
    const another = await prisma.content.create({ data: { influencerId: who.influencerId, title: "Other", steps: { create: { kind: "IMAGE", position: 1 } } } });
    const results = await Promise.allSettled([runScene(who), runScene({ ...who, contentId: another.id })]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await getBalanceBrl(who.userId)).toBeCloseTo(0.6 - 0.432, 4);
  });

  it("refuses changed prices and insufficient funds without updating the placeholder", async () => {
    const who = await contentSeed(0.1);
    await expect(runScene(who, { expectedBrl: 0.01 })).rejects.toThrow(/preço mudou/);
    await expect(runScene(who)).rejects.toThrow(/Saldo insuficiente/);
    expect((await image(who.contentId)).status).toBe("PENDING");
    expect(await getBalanceBrl(who.userId)).toBeCloseTo(0.1, 4);
  });

  it("refunds a failed scene exactly once", async () => {
    const who = await contentSeed();
    await runScene(who, { prompt: "[mock-fail]" });
    for (let attempt = 0; attempt < 3; attempt++) await collectRunning(who.userId, who.influencerId);
    await Promise.all([collectRunning(who.userId, who.influencerId), collectRunning(who.userId, who.influencerId)]);
    expect((await image(who.contentId)).status).toBe("FAILED");
    expect(await getBalanceBrl(who.userId)).toBe(10);
    expect(await prisma.ledgerEntry.count({ where: { userId: who.userId, reason: "REFUND" } })).toBe(1);
  });

  it("keeps an ambiguous scene reservation and never resubmits", async () => {
    const who = await contentSeed();
    await runScene(who, { prompt: "[mock-submit-error]" });
    expect((await image(who.contentId)).submissionState).toBe("submission_unknown");
    expect((await runScene(who)).started).toBe(0);
    expect(await getBalanceBrl(who.userId)).toBeCloseTo(10 - 0.432, 4);
  });

  it("refuses another user's content before charging or submitting", async () => {
    const owner = await contentSeed();
    const other = await contentSeed();
    await expect(runScene({ ...owner, userId: other.userId })).rejects.toThrow(/Conteúdo não encontrado/);
    expect(await getBalanceBrl(other.userId)).toBe(10);
    expect((await image(owner.contentId)).status).toBe("PENDING");
  });
});
