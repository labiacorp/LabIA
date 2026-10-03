import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { collectRunning, reconcileReservation } from "./generation";
import { getBalanceBrl } from "./ledger";
import { prisma } from "./prisma";
import { MockProvider } from "./providers/mock";
import { MERGE_MODEL, METADATA_MODEL } from "./providers/ffmpeg";
import { REEL } from "./content-plan";
import { startAssembly, startContentVideo, videoQuote } from "./video-chain";

const users: string[] = [];
async function seed(balance = 10, withImage = true) {
  const user = await prisma.user.create({ data: { email: `qa-video-${randomUUID()}@labia.test` } });
  users.push(user.id);
  const influencer = await prisma.influencer.create({ data: { userId: user.id, name: "QA", niche: "Test", tone: "Calm" } });
  const content = await prisma.content.create({ data: { influencerId: influencer.id, title: "QA reel", steps: { create: [
    { kind: "IMAGE", position: 1, status: withImage ? "DONE" : "PENDING" }, { kind: "VIDEO", position: 2 }, { kind: "ASSEMBLY", position: 3 },
  ] } } });
  if (balance) await prisma.ledgerEntry.create({ data: { userId: user.id, reason: "TOPUP", deltaBrl: balance, note: "Disposable mock test fixture" } });
  if (withImage) {
    const image = await prisma.step.findFirstOrThrow({ where: { contentId: content.id, kind: "IMAGE" } });
    await prisma.asset.create({ data: { userId: user.id, influencerId: influencer.id, contentId: content.id, stepId: image.id, kind: "IMAGE", url: "/mock/portrait.svg" } });
  }
  return { userId: user.id, influencerId: influencer.id, contentId: content.id };
}
const run = (who: Awaited<ReturnType<typeof seed>>, overrides: Partial<{ prompt: string; expectedBrl: number; intentId: string }> = {}) =>
  startContentVideo({ ...who, prompt: "Present a product", intentId: randomUUID(), expectedBrl: videoQuote().totalBrl, ...overrides });
const video = (contentId: string) => prisma.step.findFirstOrThrow({ where: { contentId, kind: "VIDEO" }, include: { assets: true } });
async function finish(who: Awaited<ReturnType<typeof seed>>) {
  for (let i = 0; i < 6; i++) await collectRunning(who.userId, who.influencerId);
}

describe.skipIf(!process.env.DATABASE_URL)("persisted 3x5s video chain", () => {
  beforeAll(() => {
    vi.stubEnv("FAL_MOCK", "1"); vi.stubEnv("FAL_MOCK_DELAY_MS", "0"); vi.stubEnv("USD_BRL_RATE", "5.4");
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("FAL_MOCK_METADATA_FAIL", "0"); vi.stubEnv("FAL_MOCK_VIDEO_DURATION", "5");
  });
  afterAll(async () => { await prisma.user.deleteMany({ where: { id: { in: users } } }); vi.unstubAllEnvs(); });

  it("reserves three blocks once, continues from each last frame and merges in order", async () => {
    const spy = vi.spyOn(MockProvider.prototype, "generate");
    const who = await seed();
    const intentId = randomUUID();
    const starts = await Promise.all([run(who, { intentId }), run(who, { intentId }), run(who)]);
    expect(starts.reduce((sum, result) => sum + result.started, 0)).toBe(1);
    expect(await getBalanceBrl(who.userId)).toBeCloseTo(10 - 5.67, 4);
    // Concurrent refreshes must not send the next phase twice.
    for (let i = 0; i < 6; i++) await Promise.all([1, 2, 3].map(() => collectRunning(who.userId, who.influencerId)));
    const done = await video(who.contentId);
    expect(done.status).toBe("DONE"); expect(done.assets).toHaveLength(3);
    expect(done.assets.map((asset) => asset.durationSec)).toEqual([5, 5, 5]);
    expect(Number(done.actualCostBrl)).toBeCloseTo(5.67, 4);
    const calls = spy.mock.calls;
    expect(calls.map(([model]) => model)).toEqual([REEL.video.model, METADATA_MODEL, REEL.video.model, METADATA_MODEL, REEL.video.model, METADATA_MODEL]);
    expect(calls[0][1].image_url).toBe("/mock/portrait.svg");
    expect(String(calls[2][1].image_url)).toMatch(/^\/mock\/portrait.svg\?frame=/);
    expect(String(calls[4][1].image_url)).not.toBe(String(calls[2][1].image_url));
    const assemblyInput = { ...who, intentId: randomUUID(), expectedBrl: 0 };
    await Promise.all([startAssembly(assemblyInput), startAssembly(assemblyInput)]);
    expect(spy.mock.calls.filter(([model]) => model === MERGE_MODEL)).toHaveLength(1);
    expect(spy.mock.calls.at(-1)?.[1].video_urls).toEqual(done.assets.map((asset) => asset.url));
    await collectRunning(who.userId, who.influencerId);
    const assembly = await prisma.step.findFirstOrThrow({ where: { contentId: who.contentId, kind: "ASSEMBLY" }, include: { assets: true } });
    expect(assembly.status).toBe("DONE"); expect(assembly.assets).toHaveLength(1);
    expect((await prisma.content.findUniqueOrThrow({ where: { id: who.contentId } })).status).toBe("REVIEW");
    expect(await getBalanceBrl(who.userId)).toBeCloseTo(10 - 5.67, 4);
  });

  it("settles using the measured duration rather than the requested duration", async () => {
    vi.stubEnv("FAL_MOCK_VIDEO_DURATION", "6");
    const who = await seed(); await run(who); await finish(who);
    const done = await video(who.contentId);
    expect(done.assets.map((asset) => asset.durationSec)).toEqual([6, 6, 6]);
    expect(Number(done.actualCostBrl)).toBeCloseTo(3 * 6 * 0.07 * 5.4, 4);
    expect(await getBalanceBrl(who.userId)).toBeCloseTo(10 - 6.804, 4);
    expect(await prisma.ledgerEntry.count({ where: { userId: who.userId, reason: "SPEND" } })).toBe(2);
  });

  it("refuses without the scene, without funds, or with an outdated quote", async () => {
    const empty = await seed(10, false); await expect(run(empty)).rejects.toThrow(/imagem da cena/);
    const poor = await seed(1); await expect(run(poor)).rejects.toThrow(/Saldo insuficiente/);
    const who = await seed(); await expect(run(who, { expectedBrl: 1 })).rejects.toThrow(/preço mudou/);
    expect((await video(who.contentId)).status).toBe("PENDING");
  });

  it("cannot overspend across different contents", async () => {
    const who = await seed(6);
    const content = await prisma.content.create({ data: { influencerId: who.influencerId, title: "Second", steps: { create: [{ kind: "IMAGE", status: "DONE", position: 1 }, { kind: "VIDEO", position: 2 }] } } });
    const image = await prisma.step.findFirstOrThrow({ where: { contentId: content.id, kind: "IMAGE" } });
    await prisma.asset.create({ data: { userId: who.userId, contentId: content.id, stepId: image.id, kind: "IMAGE", url: "/mock/portrait.svg" } });
    const results = await Promise.allSettled([run(who), run({ ...who, contentId: content.id })]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await getBalanceBrl(who.userId)).toBeCloseTo(0.33, 4);
  });

  it("refunds only unused blocks when a later generation fails", async () => {
    const original = MockProvider.prototype.checkResult;
    vi.spyOn(MockProvider.prototype, "checkResult").mockImplementation(async function (this: MockProvider, handle, params, skipDelay) {
      if (handle.model === REEL.video.model && (params.chain as { clips: unknown[] }).clips.length === 1) throw new Error("mock second block failed");
      return original.call(this, handle, params, skipDelay);
    });
    const who = await seed(); await run(who);
    await collectRunning(who.userId, who.influencerId); await collectRunning(who.userId, who.influencerId);
    for (let i = 0; i < 4; i++) await collectRunning(who.userId, who.influencerId);
    const failed = await video(who.contentId);
    expect(failed.status).toBe("FAILED"); expect(Number(failed.actualCostBrl)).toBeCloseTo(1.89, 4);
    expect(await getBalanceBrl(who.userId)).toBeCloseTo(10 - 1.89, 4);
    expect(await prisma.ledgerEntry.count({ where: { userId: who.userId, reason: "REFUND" } })).toBe(1);
  });

  it("settles completed clips even when their measured cost exceeds the reservation before a failure", async () => {
    vi.stubEnv("FAL_MOCK_VIDEO_DURATION", "10");
    const original = MockProvider.prototype.checkResult;
    vi.spyOn(MockProvider.prototype, "checkResult").mockImplementation(async function (this: MockProvider, handle, params, skipDelay) {
      if (handle.model === REEL.video.model && (params.chain as { clips: unknown[] }).clips.length === 2) throw new Error("mock third block failed");
      return original.call(this, handle, params, skipDelay);
    });
    const who = await seed(); await run(who);
    for (let i = 0; i < 7; i++) await collectRunning(who.userId, who.influencerId);
    const failed = await video(who.contentId);
    expect(failed.status).toBe("FAILED"); expect(Number(failed.actualCostBrl)).toBeCloseTo(7.56, 4);
    expect(await getBalanceBrl(who.userId)).toBeCloseTo(10 - 7.56, 4);
    expect(await prisma.ledgerEntry.count({ where: { userId: who.userId, reason: "SPEND" } })).toBe(2);
  });

  it("keeps the reservation when real duration cannot be verified", async () => {
    const who = await seed(); await run(who); await collectRunning(who.userId, who.influencerId);
    vi.stubEnv("FAL_MOCK_METADATA_FAIL", "1");
    for (let i = 0; i < 3; i++) await collectRunning(who.userId, who.influencerId);
    expect((await video(who.contentId)).submissionState).toBe("cost_unknown");
    expect(await getBalanceBrl(who.userId)).toBeCloseTo(10 - 5.67, 4);
    expect(await prisma.ledgerEntry.count({ where: { userId: who.userId, reason: "REFUND" } })).toBe(0);
    const other = await seed();
    await expect(reconcileReservation(other.userId, (await video(who.contentId)).id, 1.89)).rejects.toThrow(/reconciliação/);
    const stepId = (await video(who.contentId)).id;
    const reconciled = await Promise.allSettled([reconcileReservation(who.userId, stepId, 1.89), reconcileReservation(who.userId, stepId, 1.89)]);
    expect(reconciled.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await getBalanceBrl(who.userId)).toBeCloseTo(10 - 1.89, 4);
    expect(await prisma.ledgerEntry.count({ where: { userId: who.userId, reason: "REFUND" } })).toBe(1);
  });

  it("resumes a persisted but unsubmitted phase, never an uncertain submit", async () => {
    const who = await seed(); await run(who);
    const step = await video(who.contentId);
    await prisma.step.update({ where: { id: step.id }, data: { submissionState: "not_submitted", falRequestId: null } });
    const spy = vi.spyOn(MockProvider.prototype, "generate");
    await Promise.all([collectRunning(who.userId, who.influencerId), collectRunning(who.userId, who.influencerId)]);
    expect(spy.mock.calls.filter(([model]) => model === REEL.video.model)).toHaveLength(1);
    expect(spy.mock.calls.filter(([model]) => model === METADATA_MODEL).length).toBeLessThanOrEqual(1);
    const uncertain = await seed(); await run(uncertain, { prompt: "[mock-submit-error]" });
    spy.mockClear(); await collectRunning(uncertain.userId, uncertain.influencerId);
    expect(spy).not.toHaveBeenCalled();
    expect(await getBalanceBrl(uncertain.userId)).toBeCloseTo(10 - 5.67, 4);
  });

  it("rejects another user's scene and refuses assembly before all clips are ready", async () => {
    const owner = await seed(); const other = await seed();
    await expect(run({ ...owner, userId: other.userId })).rejects.toThrow(/imagem da cena/);
    await expect(startAssembly({ ...owner, intentId: randomUUID(), expectedBrl: 0 })).rejects.toThrow(/três clipes/);
    expect(await getBalanceBrl(other.userId)).toBe(10);
  });
});
