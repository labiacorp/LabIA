import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userId: vi.fn(), start: vi.fn(), redirect: vi.fn(), findInfluencer: vi.fn(), findAsset: vi.fn(), updateAsset: vi.fn(), updateInfluencer: vi.fn(),
  txInfluencer: vi.fn(), txSteps: vi.fn(), txAssets: vi.fn(), txDelete: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ requireUserId: mocks.userId }));
vi.mock("@/lib/fx", () => ({ refreshRate: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/generation", () => ({ startPlan: mocks.start, UserError: class UserError extends Error {} }));
vi.mock("@/lib/character", () => ({ previewItems: () => [], sheetFromFaceItem: () => ({ role: "SHEET" }), profileFromFaceItem: () => ({ role: "PROFILE" }) }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    influencer: { findFirst: mocks.findInfluencer, update: mocks.updateInfluencer },
    asset: { findFirst: mocks.findAsset, update: mocks.updateAsset },
    $transaction: async (arg: unknown) => typeof arg === "function"
      ? arg({ $queryRaw: vi.fn(), influencer: { findFirst: mocks.txInfluencer, delete: mocks.txDelete }, step: { count: mocks.txSteps }, asset: { deleteMany: mocks.txAssets } })
      : arg,
  },
}));
import { approveFace, deleteInfluencer } from "./actions";

const form = (entries: Record<string, string>) => { const data = new FormData(); for (const [k, v] of Object.entries(entries)) data.set(k, v); return data; };
const influencer = { id: "inf", name: "Malu Andrade", niche: "Lifestyle", tone: "natural", visualSignature: "cabelo cacheado", persona: "" };

describe("create influencer flow", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.userId.mockResolvedValue("owner"); });

  it("keeps the face only after the character sheet is charged, and only a finished preview of hers", async () => {
    mocks.findInfluencer.mockResolvedValue(influencer);
    mocks.findAsset.mockResolvedValue({ id: "face", url: "https://x/face.png" });
    const data = form({ intent: "3f1f2a1e-4b8c-4d1e-9a2b-1c2d3e4f5a6b", expectedBrl: "0.65", asset: "face" });
    mocks.start.mockRejectedValueOnce(new (await import("@/lib/generation")).UserError("Créditos insuficientes"));
    expect((await approveFace("inf", {}, data)).error).toMatch(/insuficientes/);
    expect(mocks.updateInfluencer).not.toHaveBeenCalled();
    mocks.start.mockResolvedValue({ started: 1 });
    await approveFace("inf", {}, data);
    expect(mocks.findAsset).toHaveBeenCalledWith({ where: expect.objectContaining({ id: "face", userId: "owner", influencerId: "inf", role: null, step: { kind: "CHARACTER", role: null, status: "DONE" } }) });
    expect(mocks.updateInfluencer).toHaveBeenCalledWith({ where: { id: "inf" }, data: { faceAssetId: "face" } });
    expect(mocks.redirect).toHaveBeenCalledWith("/influenciadores/nova?id=inf&pronta=1");
  });

  it("deletes only after the name is typed and never while a generation runs", async () => {
    mocks.txInfluencer.mockResolvedValue({ name: "Malu Andrade" });
    mocks.txSteps.mockResolvedValue(0);
    expect((await deleteInfluencer("inf", {}, form({ confirm: "malu" }))).error).toMatch(/Digite o nome/);
    mocks.txSteps.mockResolvedValue(1);
    expect((await deleteInfluencer("inf", {}, form({ confirm: " malu andrade " }))).error).toMatch(/em andamento/);
    expect(mocks.txDelete).not.toHaveBeenCalled();
    mocks.txSteps.mockResolvedValue(0);
    await deleteInfluencer("inf", {}, form({ confirm: "MALU ANDRADE" }));
    expect(mocks.txAssets).toHaveBeenCalledWith({ where: { userId: "owner", OR: [{ influencerId: "inf" }, { content: { influencerId: "inf" } }] } });
    expect(mocks.txDelete).toHaveBeenCalledWith({ where: { id: "inf" } });
    expect(mocks.redirect).toHaveBeenCalledWith("/influenciadores");
  });
});
