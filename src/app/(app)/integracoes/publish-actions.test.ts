import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  auth: vi.fn(),
  ownerSession: vi.fn(),
  assetFind: vi.fn(),
  userFind: vi.fn(),
  accounts: vi.fn(),
  createPosts: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireUserId: mocks.requireUserId }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/owner", () => ({ ownerSession: mocks.ownerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    asset: { findFirst: mocks.assetFind },
    user: { findUnique: mocks.userFind },
    socialAccount: { findMany: mocks.accounts },
  },
}));
vi.mock("@/lib/social/posts", () => {
  class SocialError extends Error {}
  return { SocialError, createPosts: mocks.createPosts };
});

import { SocialError } from "@/lib/social/posts";
import { getPublishTargets, publishAction } from "./publish-actions";

const input = {
  intentId: "intent-1",
  assetId: "asset-1",
  contentId: null,
  accountIds: ["acc-1"],
  text: "Olá",
  aiLabel: true,
  scheduledAt: null,
  expectedBrl: 0.081,
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireUserId.mockResolvedValue("user-1");
  mocks.auth.mockResolvedValue({ user: { id: "user-1" } });
  mocks.ownerSession.mockReturnValue(false);
});

describe("publishAction", () => {
  it("requires the session user first and passes its id", async () => {
    mocks.requireUserId.mockRejectedValue(new Error("redirect"));
    await expect(publishAction(input)).rejects.toThrow("redirect");
    expect(mocks.createPosts).not.toHaveBeenCalled();

    mocks.requireUserId.mockResolvedValue("user-1");
    mocks.createPosts.mockResolvedValue({ postIds: ["a", "b"] });
    expect(await publishAction(input)).toEqual({ ok: true, count: 2 });
    expect(mocks.createPosts.mock.calls[0][0]).toMatchObject({ userId: "user-1", intentId: "intent-1", scheduledAt: null });
  });

  it("parses scheduledAt to a Date", async () => {
    mocks.createPosts.mockResolvedValue({ postIds: ["a"] });
    await publishAction({ ...input, scheduledAt: "2026-10-07T15:00:00-03:00" });
    const date = mocks.createPosts.mock.calls[0][0].scheduledAt as Date;
    expect(date).toBeInstanceOf(Date);
    expect(date.toISOString()).toBe("2026-10-07T18:00:00.000Z");
  });

  it("rejects an invalid scheduledAt without calling createPosts", async () => {
    const result = await publishAction({ ...input, scheduledAt: "nope" });
    expect(result).toHaveProperty("error");
    expect(mocks.createPosts).not.toHaveBeenCalled();
  });

  it("maps SocialError to its message and unknown errors to the generic copy", async () => {
    mocks.createPosts.mockRejectedValueOnce(new SocialError("Créditos insuficientes."));
    expect(await publishAction(input)).toEqual({ error: "Créditos insuficientes." });
    mocks.createPosts.mockRejectedValueOnce(new Error("db exploded: secret"));
    const generic = await publishAction(input);
    expect(generic).toEqual({ error: "Não foi possível publicar agora. Tente novamente." });
  });
});

describe("getPublishTargets", () => {
  it("requires the session user first", async () => {
    mocks.requireUserId.mockRejectedValue(new Error("redirect"));
    await expect(getPublishTargets("asset-1")).rejects.toThrow("redirect");
    expect(mocks.assetFind).not.toHaveBeenCalled();
  });

  it("returns an error for a foreign, missing or audio asset", async () => {
    mocks.assetFind.mockResolvedValue(null);
    expect(await getPublishTargets("asset-1")).toHaveProperty("error");
    expect(mocks.assetFind.mock.calls[0][0].where).toMatchObject({ id: "asset-1", userId: "user-1" });
    mocks.assetFind.mockResolvedValue({ kind: "AUDIO" });
    expect(await getPublishTargets("asset-1")).toHaveProperty("error");
  });

  it("filters accounts by media kind and offers only networks that are live (X)", async () => {
    mocks.assetFind.mockResolvedValue({ kind: "IMAGE" });
    mocks.accounts.mockResolvedValue([
      { id: "x", network: "X", handle: "labia", token: "secret" },
      { id: "tt", network: "TIKTOK", handle: "tk" },
      { id: "ig", network: "INSTAGRAM", handle: "ig" },
    ]);
    const regular = await getPublishTargets("asset-1");
    expect(regular).toMatchObject({ assetKind: "IMAGE", accounts: [{ id: "x", network: "X", handle: "labia" }] });
    expect(JSON.stringify(regular)).not.toContain("secret");
    expect(mocks.accounts.mock.calls[0][0].where).toMatchObject({ userId: "user-1", status: "CONNECTED" });

    mocks.ownerSession.mockReturnValue(true);
    mocks.userFind.mockResolvedValue({ role: "OWNER" });
    const owner = await getPublishTargets("asset-1");
    expect((owner as { accounts: unknown[] }).accounts).toHaveLength(1);
  });

  it("returns the server USD/BRL rate", async () => {
    mocks.assetFind.mockResolvedValue({ kind: "VIDEO" });
    mocks.accounts.mockResolvedValue([]);
    const result = await getPublishTargets("asset-1");
    expect(result).toMatchObject({ assetKind: "VIDEO", accounts: [], usdBrlRate: Number(process.env.USD_BRL_RATE) || 5.4 });
  });
});
