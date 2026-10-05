import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Only persistence and the external SDK are replaced. Pricing, reservation,
// provider selection, polling, metadata settlement and assembly run unchanged.
const boundary = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(), $queryRaw: vi.fn(),
    influencer: { findFirst: vi.fn(), findUniqueOrThrow: vi.fn() },
    content: { findFirst: vi.fn(), update: vi.fn() },
    step: { findFirst: vi.fn(), findMany: vi.fn(), count: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    asset: { findFirst: vi.fn(), create: vi.fn() },
    ledgerEntry: { aggregate: vi.fn(), create: vi.fn() },
  },
  sdk: { config: vi.fn(), submit: vi.fn(), status: vi.fn(), result: vi.fn(), subscribeToStatus: vi.fn() },
}));
vi.mock("@/lib/prisma", () => ({ prisma: boundary.prisma }));
vi.mock("@fal-ai/client", () => ({ fal: { config: boundary.sdk.config, queue: boundary.sdk } }));

import { collectRunning, quote } from "./generation";
import { getBalanceBrl } from "./ledger";
import { MockProvider } from "./providers/mock";
import { METADATA_MODEL } from "./providers/ffmpeg";
import { reelItem, startAssembly, startContentVideo } from "./video-chain";
import type { VideoSelection } from "./video-options";

type Row = Record<string, unknown>;
type Query = { where: Row; data?: Row; include?: Row };
const record = (value: unknown): value is Row => typeof value === "object" && value !== null && !Array.isArray(value);
function matches(row: Row, where: Row): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === "OR") return (value as Row[]).some((clause) => matches(row, clause));
    if (record(value) && Array.isArray(value.in)) return value.in.includes(row[key]);
    if (record(value)) return record(row[key]) && matches(row[key], value);
    return row[key] === value;
  });
}

function memoryFixture() {
  const owner = { userId: "fixture-user", influencerId: "fixture-influencer", contentId: "fixture-content" };
  const influencer = { id: owner.influencerId, userId: owner.userId };
  const content: Row = { id: owner.contentId, influencerId: owner.influencerId, status: "DRAFT" };
  const steps: Row[] = [
    { id: "scene", kind: "IMAGE", position: 1, status: "DONE" },
    { id: "video", kind: "VIDEO", position: 2, status: "PENDING" },
    { id: "assembly", kind: "ASSEMBLY", position: 3, status: "PENDING" },
  ].map((step) => ({ ...step, influencerId: owner.influencerId, contentId: owner.contentId,
    input: null, error: null, falRequestId: null, submissionState: "not_submitted", actualCostBrl: null,
  }));
  const assets: Row[] = [{ id: "scene-asset", ...owner, stepId: "scene", kind: "IMAGE", url: "/mock/portrait.svg", width: 1280, height: 720 }];
  const ledger: Row[] = [{ userId: owner.userId, reason: "TOPUP", deltaBrl: 30 }];
  const relatedContent = () => ({ ...content, influencer });
  const relatedStep = (step: Row): Row => ({ ...step, content: relatedContent(), influencer });
  const findSteps = (where: Row) => steps.filter((step) => matches(relatedStep(step), where));
  const clone = (row: Row) => structuredClone(row);
  const db = boundary.prisma;
  db.$transaction.mockImplementation(async (operation: (tx: typeof db) => unknown) => operation(db));
  db.$queryRaw.mockResolvedValue([{ id: owner.userId }]);
  db.influencer.findFirst.mockImplementation(async ({ where }: Query) => matches(influencer, where) ? clone(influencer) : null);
  db.influencer.findUniqueOrThrow.mockImplementation(async ({ where }: Query) => {
    if (!matches(influencer, where)) throw new Error("Fixture influencer missing");
    return clone(influencer);
  });
  db.content.findFirst.mockImplementation(async ({ where }: Query) => matches(relatedContent(), where) ? clone(content) : null);
  db.content.update.mockImplementation(async ({ data }: Query) => { Object.assign(content, data); return clone(content); });
  db.step.findFirst.mockImplementation(async ({ where, include }: Query) => {
    const step = findSteps(where)[0];
    return step ? clone({ ...step, ...(include?.assets ? { assets: assets.filter((asset) => asset.stepId === step.id) } : {}) }) : null;
  });
  db.step.findMany.mockImplementation(async ({ where }: Query) => findSteps(where).map(clone));
  db.step.count.mockImplementation(async ({ where }: Query) => findSteps(where).length);
  db.step.update.mockImplementation(async ({ where, data }: Query) => {
    const step = findSteps(where)[0];
    if (!step) throw new Error("Fixture step missing");
    Object.assign(step, structuredClone(data)); return clone(step);
  });
  db.step.updateMany.mockImplementation(async ({ where, data }: Query) => {
    const found = findSteps(where);
    found.forEach((step) => Object.assign(step, structuredClone(data)));
    return { count: found.length };
  });
  db.asset.findFirst.mockImplementation(async ({ where }: Query) => {
    const asset = assets.find((item) => matches({ ...item, content: relatedContent(), step: steps.find((step) => step.id === item.stepId) }, where));
    return asset ? clone(asset) : null;
  });
  db.asset.create.mockImplementation(async ({ data }: Query) => {
    const asset = { id: `asset-${assets.length}`, ...structuredClone(data) };
    assets.push(asset); return clone(asset);
  });
  db.ledgerEntry.aggregate.mockImplementation(async ({ where }: Query) => ({
    _sum: { deltaBrl: ledger.filter((entry) => matches(entry, where)).reduce((sum, entry) => sum + Number(entry.deltaBrl), 0) },
  }));
  db.ledgerEntry.create.mockImplementation(async ({ data }: Query) => {
    const entry = structuredClone(data!); ledger.push(entry); return clone(entry);
  });
  return { owner, content, assets, ledger, video: steps[1], assembly: steps[2] };
}

const grok: VideoSelection = { model: "xai/grok-imagine-video/v1.5/lite/image-to-video", duration: 5, resolution: "720p", audio: true, strategy: "clip" };
const seedance: VideoSelection = { ...grok, model: "bytedance/seedance-2.5/image-to-video" };
let fixture: ReturnType<typeof memoryFixture>;
const estimate = (selection = grok) => quote([reelItem("Wave at the camera", "/mock/portrait.svg", selection, { width: 1280, height: 720 })]).totalBrl;
const start = (selection = grok, expectedBrl = estimate(selection)) => startContentVideo({
  ...fixture.owner, intentId: "video-intent", prompt: "Wave at the camera", selection, expectedBrl,
});
const poll = () => collectRunning(fixture.owner.userId, fixture.owner.influencerId);

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("FAL_MOCK", "1"); vi.stubEnv("FAL_MOCK_DELAY_MS", "0");
  vi.stubEnv("USD_BRL_RATE", "5.4"); vi.stubEnv("FAL_KEY", "fixture-only-no-network");
  vi.stubEnv("FAL_MOCK_METADATA_FAIL", "0"); vi.stubEnv("FAL_MOCK_VIDEO_DURATION", "5");
  // An accidental transport call in a normal mock lifecycle fails immediately.
  for (const method of [boundary.sdk.submit, boundary.sdk.status, boundary.sdk.result, boundary.sdk.subscribeToStatus]) {
    method.mockRejectedValue(new Error("Unexpected SDK call in mock lifecycle"));
  }
  fixture = memoryFixture();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe("native video lifecycle without a database or provider network", () => {
  it.each([
    { selection: grok, reservation: 0.864, measured: 1.026 }, // (6 * $0.03 + $0.01) * R$5.4
    { selection: seedance, reservation: 12.771, measured: 14.9766 }, // 1280 * 720 * 6 * 24 / 1024 / 1000 * $0.0214 * R$5.4
  ])("settles one $selection.model clip with the reserved rate and reuses it for assembly", async ({ selection, reservation, measured }) => {
    const requests = vi.spyOn(MockProvider.prototype, "generate");
    expect(estimate(selection)).toBe(reservation);
    expect(await start(selection)).toEqual({ started: 1 });
    expect(await getBalanceBrl(fixture.owner.userId)).toBeCloseTo(30 - reservation, 4);

    // Changing the current conversion rate after reservation must not reprice a job.
    vi.stubEnv("USD_BRL_RATE", "9"); vi.stubEnv("FAL_MOCK_VIDEO_DURATION", "6");
    await poll();
    expect(fixture.video).toMatchObject({ status: "RUNNING", model: METADATA_MODEL, submissionState: "submitted" });
    await poll();
    expect(fixture.video).toMatchObject({ status: "DONE", submissionState: "completed", actualCostBrl: measured });
    const chain = (fixture.video.input as { chain: { recipe: { blocks: number; model: string; pricing: { usdBrlRate: number } }; clips: unknown[] } }).chain;
    expect(chain.recipe).toMatchObject({ blocks: 1, model: selection.model, pricing: { usdBrlRate: 5.4 } });
    expect(chain.clips).toHaveLength(1);
    const videoAssets = fixture.assets.filter((asset) => asset.stepId === "video");
    expect(videoAssets).toHaveLength(1);
    expect(videoAssets[0]).toMatchObject({ durationSec: 6, width: 1280, height: 720 });
    expect(await getBalanceBrl(fixture.owner.userId)).toBeCloseTo(30 - measured, 4);
    expect(requests.mock.calls.map(([model]) => model)).toEqual([selection.model, METADATA_MODEL]);

    const ledgerBeforeAssembly = structuredClone(fixture.ledger);
    const assemblyInput = { ...fixture.owner, intentId: "assembly-intent", expectedBrl: 0 };
    expect(await startAssembly(assemblyInput)).toEqual({ started: 1 });
    expect(await startAssembly(assemblyInput)).toEqual({ started: 0 });
    await poll();
    expect(fixture.assembly).toMatchObject({ status: "DONE", actualCostBrl: 0, estimatedCostBrl: 0 });
    expect(fixture.assets.filter((asset) => asset.stepId === "assembly")).toMatchObject([{ url: videoAssets[0].url, durationSec: 6, width: 1280, height: 720 }]);
    expect(fixture.content.status).toBe("REVIEW");
    expect(fixture.ledger).toEqual(ledgerBeforeAssembly);
    expect(requests).toHaveBeenCalledTimes(2);
    expect(boundary.sdk.submit).not.toHaveBeenCalled();
  });

  it.each([
    { selection: { ...grok, model: "unlisted/image-to-video" }, message: /Modelo/ },
    { selection: { ...grok, duration: 16 }, message: /Duração/ },
    { selection: { ...seedance, duration: 31 }, message: /Duração/ },
  ])("rejects unsupported $selection.model / $selection.duration before any reservation or submit", async ({ selection, message }) => {
    const requests = vi.spyOn(MockProvider.prototype, "generate");
    await expect(start(selection, 1)).rejects.toThrow(message);
    expect(fixture.video.status).toBe("PENDING");
    expect(fixture.ledger).toHaveLength(1);
    expect(await getBalanceBrl(fixture.owner.userId)).toBe(30);
    expect(requests).not.toHaveBeenCalled();
    expect(boundary.sdk.submit).not.toHaveBeenCalled();
  });

  it("rejects a stale quote before spending or sending a job", async () => {
    const requests = vi.spyOn(MockProvider.prototype, "generate");
    const oldQuote = estimate();
    vi.stubEnv("USD_BRL_RATE", "9");
    await expect(start(grok, oldQuote)).rejects.toThrow(/preço mudou/);
    expect(fixture.video.status).toBe("PENDING");
    expect(fixture.ledger).toHaveLength(1);
    expect(requests).not.toHaveBeenCalled();
  });

  it("reserves a native clip only once when the same start is repeated", async () => {
    const requests = vi.spyOn(MockProvider.prototype, "generate");
    expect(await start()).toEqual({ started: 1 });
    expect(await start()).toEqual({ started: 0 });
    expect(fixture.ledger.filter((entry) => entry.reason === "SPEND")).toHaveLength(1);
    expect(await getBalanceBrl(fixture.owner.userId)).toBeCloseTo(29.136, 4);
    expect(requests).toHaveBeenCalledTimes(1);
  });

  it("does not release reserved funds when native clip metadata cannot be verified", async () => {
    await start(seedance);
    await poll();
    vi.stubEnv("FAL_MOCK_METADATA_FAIL", "1");
    for (let attempt = 0; attempt < 3; attempt++) await poll();
    expect(fixture.video).toMatchObject({ status: "FAILED", submissionState: "cost_unknown" });
    expect(await getBalanceBrl(fixture.owner.userId)).toBeCloseTo(17.229, 4);
    expect(fixture.ledger.filter((entry) => entry.reason === "REFUND")).toHaveLength(0);
    await expect(startAssembly({ ...fixture.owner, intentId: "assembly-intent", expectedBrl: 0 })).rejects.toThrow(/Conclua/);
    expect(fixture.assembly.status).toBe("PENDING");
    expect(fixture.assets.filter((asset) => asset.kind === "VIDEO")).toHaveLength(0);
  });

  it("preserves the reservation after repeated real-provider read failures without resending", async () => {
    // The production FalProvider runs against a fake SDK; no real credentials,
    // HTTP request, external account or billable generation is involved.
    vi.stubEnv("FAL_MOCK", "0");
    boundary.sdk.submit.mockResolvedValue({ request_id: "fixture-provider-job" });
    boundary.sdk.status.mockRejectedValue(new Error("fixture result read unavailable"));
    await start();
    for (let attempt = 0; attempt < 3; attempt++) await poll();
    expect(fixture.video).toMatchObject({ status: "FAILED", submissionState: "cost_unknown", actualCostBrl: null });
    expect(await getBalanceBrl(fixture.owner.userId)).toBeCloseTo(29.136, 4);
    expect(fixture.ledger.filter((entry) => entry.reason === "REFUND")).toHaveLength(0);
    expect(fixture.assets.filter((asset) => asset.stepId === "video")).toHaveLength(0);
    await poll();
    expect(boundary.sdk.submit).toHaveBeenCalledTimes(1);
    expect(boundary.sdk.status).toHaveBeenCalledTimes(3);
    expect(boundary.sdk.result).not.toHaveBeenCalled();
  });
});
