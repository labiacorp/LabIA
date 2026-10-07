import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "../prisma";
import { saveConnectedAccounts } from "./accounts";
import { sealToken } from "./crypto";
import { NETWORKS } from "./networks";
import { MockPublisher } from "./mock";
import { AuthExpiredError } from "./publisher";
import { applyOutcome, cancelPost, createPosts, disconnectAccount, dispatchDuePosts, FAILURE_COPY, SocialError } from "./posts";

// Database tests: seed their own users and delete them in afterAll (cascade removes accounts, posts and ledger).
const created: string[] = [];
const MIN = 60_000;
const TOKENS = { accessToken: "a", refreshToken: "r", expiresAt: new Date(Date.now() + 120 * MIN) };

async function seed(balanceBrl = 10) {
  const user = await prisma.user.create({ data: { email: `qa-${randomUUID()}@labia.test` } });
  created.push(user.id);
  if (balanceBrl > 0) await prisma.ledgerEntry.create({ data: { userId: user.id, deltaBrl: balanceBrl, reason: "TOPUP", note: "qa" } });
  const asset = await prisma.asset.create({ data: { userId: user.id, kind: "IMAGE", url: "https://example.com/mock/qa.png" } });
  const [accountId] = await saveConnectedAccounts(user.id, "mock", [
    { network: "X", providerAccountId: `mock-${randomUUID()}`, handle: "qa", tokens: { accessToken: "a", refreshToken: "r", expiresAt: new Date(Date.now() + 120 * MIN) } },
  ]);
  return { userId: user.id, accountId, assetId: asset.id };
}
type Who = Awaited<ReturnType<typeof seed>>;

const input = (who: Who, over: Partial<Parameters<typeof createPosts>[0]> = {}) => ({
  userId: who.userId,
  intentId: randomUUID(),
  accountIds: [who.accountId],
  assetId: who.assetId,
  contentId: null,
  text: "Olá, mundo",
  aiLabel: true,
  scheduledAt: null,
  expectedBrl: 0.081,
  ...over,
});
const posts = (userId: string) => prisma.socialPost.findMany({ where: { userId } });
const ledgerSum = async (where: { userId?: string; socialPostId?: string }) =>
  Number((await prisma.ledgerEntry.aggregate({ where, _sum: { deltaBrl: true } }))._sum.deltaBrl ?? 0);
const dueScheduled = (who: Who, over: Record<string, unknown> = {}) =>
  prisma.socialPost.create({
    data: { userId: who.userId, accountId: who.accountId, text: "due", scheduledAt: new Date(Date.now() - MIN), operationKey: randomUUID(), estimatedCostBrl: 0.081, ...over },
  });

describe.skipIf(!process.env.DATABASE_URL)("social posts core", () => {
  beforeAll(() => {
    vi.stubEnv("FAL_MOCK", "1");
    vi.stubEnv("USD_BRL_RATE", "5.4");
    vi.stubEnv("SOCIAL_TOKEN_KEY", Buffer.alloc(32, 7).toString("base64"));
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: created } } });
    vi.unstubAllEnvs();
  });

  it("reserves the X price and publishes now", async () => {
    const who = await seed();
    const { postIds } = await createPosts(input(who));
    const post = await prisma.socialPost.findUniqueOrThrow({ where: { id: postIds[0] } });
    expect(post.status).toBe("PUBLISHED");
    expect(post.url).toContain("/mock/");
    expect(Number(post.actualCostBrl)).toBeCloseTo(0.081, 4);
    expect(await ledgerSum({ socialPostId: post.id })).toBeCloseTo(-0.081, 4);
  });

  it("a repeated intent creates and charges once", async () => {
    const who = await seed();
    const sequential = input(who);
    await createPosts(sequential);
    await createPosts(sequential);
    const parallel = input(who);
    await Promise.all([createPosts(parallel), createPosts(parallel)]);
    expect(await posts(who.userId)).toHaveLength(2);
    expect(await prisma.ledgerEntry.count({ where: { userId: who.userId, reason: "SPEND" } })).toBe(2);
  });

  it("a changed quote creates nothing", async () => {
    const who = await seed();
    await expect(createPosts(input(who, { text: "veja https://labia.app", expectedBrl: 0 }))).rejects.toThrow("O preço mudou");
    expect(await posts(who.userId)).toHaveLength(0);
  });

  it("insufficient balance is refused", async () => {
    const who = await seed(0);
    await expect(createPosts(input(who))).rejects.toThrow(/Créditos insuficientes/);
    expect(await posts(who.userId)).toHaveLength(0);
  });

  it("foreign accounts and assets are refused", async () => {
    const mine = await seed();
    const other = await seed();
    await expect(createPosts(input(mine, { accountIds: [other.accountId] }))).rejects.toThrow(SocialError);
    await expect(createPosts(input(mine, { assetId: other.assetId }))).rejects.toThrow(SocialError);
    expect(await posts(mine.userId)).toHaveLength(0);
    expect(await prisma.ledgerEntry.count({ where: { userId: mine.userId, reason: "SPEND" } })).toBe(0);
  });

  it("scheduling window", async () => {
    const who = await seed();
    await expect(createPosts(input(who, { scheduledAt: new Date(Date.now() + MIN) }))).rejects.toThrow(SocialError);
    await expect(createPosts(input(who, { scheduledAt: new Date(Date.now() + 31 * 24 * 60 * MIN) }))).rejects.toThrow(SocialError);
    const { postIds } = await createPosts(input(who, { scheduledAt: new Date(Date.now() + 10 * MIN) }));
    const post = await prisma.socialPost.findUniqueOrThrow({ where: { id: postIds[0] } });
    expect(post.status).toBe("SCHEDULED");
    expect(post.providerPostId).toBeNull();
  });

  it("two dispatchers publish once", async () => {
    const who = await seed();
    await dueScheduled(who);
    const publish = vi.spyOn(MockPublisher.prototype, "publish");
    const results = await Promise.all([dispatchDuePosts({ userId: who.userId }), dispatchDuePosts({ userId: who.userId })]);
    expect(results.reduce((sum, r) => sum + r.published, 0)).toBe(1);
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it("failure refunds", async () => {
    const who = await seed();
    const { postIds } = await createPosts(input(who, { text: "oi [mock-fail]" }));
    const post = await prisma.socialPost.findUniqueOrThrow({ where: { id: postIds[0] } });
    expect(post.status).toBe("FAILED");
    expect(post.error).toBe(FAILURE_COPY.platform_error);
    expect(await ledgerSum({ socialPostId: post.id })).toBeCloseTo(0, 4);
  });

  it("unknown keeps the reservation", async () => {
    const who = await seed();
    const { postIds } = await createPosts(input(who, { text: "oi [mock-unknown]" }));
    const post = await prisma.socialPost.findUniqueOrThrow({ where: { id: postIds[0] } });
    expect(post.status).toBe("UNKNOWN");
    expect(await ledgerSum({ socialPostId: post.id })).toBeCloseTo(-0.081, 4);
    const publish = vi.spyOn(MockPublisher.prototype, "publish");
    await dispatchDuePosts({ userId: who.userId });
    expect(publish).not.toHaveBeenCalled();
  });

  it("stale publishing becomes unknown", async () => {
    const who = await seed();
    const post = await dueScheduled(who, { status: "PUBLISHING", claimedAt: new Date(Date.now() - 6 * MIN) });
    await dispatchDuePosts({ userId: who.userId });
    expect((await prisma.socialPost.findUniqueOrThrow({ where: { id: post.id } })).status).toBe("UNKNOWN");
  });

  it("cancel refunds; foreign cancel is refused", async () => {
    const who = await seed();
    const other = await seed();
    const { postIds } = await createPosts(input(who, { scheduledAt: new Date(Date.now() + 10 * MIN) }));
    await expect(cancelPost(other.userId, postIds[0])).rejects.toThrow(SocialError);
    expect((await prisma.socialPost.findUniqueOrThrow({ where: { id: postIds[0] } })).status).toBe("SCHEDULED");
    await cancelPost(who.userId, postIds[0]);
    expect((await prisma.socialPost.findUniqueOrThrow({ where: { id: postIds[0] } })).status).toBe("CANCELED");
    expect(await ledgerSum({ socialPostId: postIds[0] })).toBeCloseTo(0, 4);
  });

  it("disconnect cancels scheduled posts", async () => {
    const who = await seed();
    const { postIds } = await createPosts(input(who, { scheduledAt: new Date(Date.now() + 10 * MIN) }));
    expect(await disconnectAccount(who.userId, who.accountId)).toEqual({ canceled: 1 });
    const account = await prisma.socialAccount.findUniqueOrThrow({ where: { id: who.accountId } });
    expect(account.status).toBe("DISCONNECTED");
    expect(account.accessToken).toBeNull();
    expect(account.refreshToken).toBeNull();
    expect((await prisma.socialPost.findUniqueOrThrow({ where: { id: postIds[0] } })).status).toBe("CANCELED");
    expect(await ledgerSum({ socialPostId: postIds[0] })).toBeCloseTo(0, 4);
  });

  it("an expired refresh marks the account expired", async () => {
    const who = await seed();
    await prisma.socialAccount.update({ where: { id: who.accountId }, data: { tokenExpiresAt: new Date(Date.now() - MIN), refreshToken: sealToken("r", who.accountId) } });
    vi.spyOn(MockPublisher.prototype, "refresh").mockRejectedValue(new AuthExpiredError("invalid_grant"));
    const { postIds } = await createPosts(input(who));
    const post = await prisma.socialPost.findUniqueOrThrow({ where: { id: postIds[0] } });
    expect(post.status).toBe("FAILED");
    expect(post.error).toBe(FAILURE_COPY.auth_expired);
    expect(await ledgerSum({ socialPostId: post.id })).toBeCloseTo(0, 4);
    expect((await prisma.socialAccount.findUniqueOrThrow({ where: { id: who.accountId } })).status).toBe("EXPIRED");
  });

  it("two intents in parallel that exceed the balance: one succeeds", async () => {
    const who = await seed(0.1);
    const results = await Promise.allSettled([createPosts(input(who)), createPosts(input(who))]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(String(failed.reason.message)).toMatch(/Créditos insuficientes/);
    expect(await posts(who.userId)).toHaveLength(1);
  });

  it("a publish that throws becomes unknown and is never resent", async () => {
    const who = await seed();
    const publish = vi.spyOn(MockPublisher.prototype, "publish").mockRejectedValue(new Error("socket hang up"));
    const { postIds } = await createPosts(input(who));
    const post = await prisma.socialPost.findUniqueOrThrow({ where: { id: postIds[0] } });
    expect(post.status).toBe("UNKNOWN");
    expect(await ledgerSum({ socialPostId: post.id })).toBeCloseTo(-0.081, 4);
    await dispatchDuePosts({ userId: who.userId });
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it("applyOutcome is forward-only", async () => {
    const who = await seed();
    const { postIds } = await createPosts(input(who));
    await applyOutcome(postIds[0], { state: "failed", reason: "platform_error" });
    const post = await prisma.socialPost.findUniqueOrThrow({ where: { id: postIds[0] } });
    expect(post.status).toBe("PUBLISHED");
    expect(await ledgerSum({ socialPostId: post.id })).toBeCloseTo(-0.081, 4);
  });

  it("the same X account cannot join two users", async () => {
    const a = await seed();
    const b = await seed();
    const row = await prisma.socialAccount.findUniqueOrThrow({ where: { id: a.accountId } });
    await expect(
      saveConnectedAccounts(b.userId, "mock", [{ network: "X", providerAccountId: row.providerAccountId, handle: "intruder", tokens: null }]),
    ).rejects.toThrow("Esta conta já está conectada a outro usuário da LabIA.");
    const after = await prisma.socialAccount.findUniqueOrThrow({ where: { id: a.accountId } });
    expect(after.userId).toBe(a.userId);
    expect(after.handle).toBe("qa");
  });

  it("mock mode works without SOCIAL_TOKEN_KEY and stores no tokens", async () => {
    vi.stubEnv("SOCIAL_TOKEN_KEY", "");
    try {
      const who = await seed();
      const account = await prisma.socialAccount.findUniqueOrThrow({ where: { id: who.accountId } });
      expect(account.accessToken).toBeNull();
      expect(account.refreshToken).toBeNull();
      expect(account.tokenExpiresAt).toBeNull();
      const { postIds } = await createPosts(input(who));
      expect((await prisma.socialPost.findUniqueOrThrow({ where: { id: postIds[0] } })).status).toBe("PUBLISHED");
    } finally {
      vi.stubEnv("SOCIAL_TOKEN_KEY", Buffer.alloc(32, 7).toString("base64"));
    }
  });

  it("real backends still need the key to save tokens", async () => {
    vi.stubEnv("SOCIAL_TOKEN_KEY", "");
    vi.stubEnv("FAL_MOCK", "");
    try {
      const user = await prisma.user.create({ data: { email: `qa-${randomUUID()}@labia.test` } });
      created.push(user.id);
      await expect(
        saveConnectedAccounts(user.id, "x", [{ network: "X", providerAccountId: randomUUID(), handle: "q", tokens: TOKENS }]),
      ).rejects.toThrow();
    } finally {
      vi.stubEnv("SOCIAL_TOKEN_KEY", Buffer.alloc(32, 7).toString("base64"));
      vi.stubEnv("FAL_MOCK", "1");
    }
  });

  it("budgetMs stops claiming new posts", async () => {
    const who = await seed();
    const first = await dueScheduled(who, { scheduledAt: new Date(Date.now() - 3 * MIN) });
    const second = await dueScheduled(who, { scheduledAt: new Date(Date.now() - 2 * MIN) });
    vi.spyOn(MockPublisher.prototype, "publish").mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      return { state: "published", providerPostId: "p", url: "https://example.com/p" };
    });
    const result = await dispatchDuePosts({ userId: who.userId, budgetMs: 5 });
    expect(result.published).toBe(1);
    expect((await prisma.socialPost.findUniqueOrThrow({ where: { id: first.id } })).status).toBe("PUBLISHED");
    expect((await prisma.socialPost.findUniqueOrThrow({ where: { id: second.id } })).status).toBe("SCHEDULED");
  });

  it("an idempotent lookup is scoped to the user", async () => {
    const a = await seed();
    const b = await seed();
    const intent = randomUUID();
    await createPosts(input(a, { intentId: intent }));
    // b guesses a's key: it must not receive a's post ids (it fails on its own account lookup instead).
    await expect(createPosts(input(b, { intentId: intent, accountIds: [a.accountId] }))).rejects.toThrow(SocialError);
  });

  async function bundleAccount(userId: string, network: "INSTAGRAM" | "BLUESKY" = "INSTAGRAM") {
    return prisma.socialAccount.create({
      data: { userId, backend: "bundle", providerAccountId: randomUUID(), network, handle: "bq", status: "CONNECTED" },
    });
  }

  it("a non-owner can publish through a bundle account (mock)", async () => {
    const who = await seed();
    const account = await bundleAccount(who.userId);
    const { postIds } = await createPosts(input(who, { accountIds: [account.id], assetId: null, expectedBrl: 0 }));
    expect((await prisma.socialPost.findUniqueOrThrow({ where: { id: postIds[0] } })).status).toBe("PUBLISHED");
  });

  it("a network whose audience is owners is refused for non-owners", async () => {
    const who = await seed();
    const account = await bundleAccount(who.userId);
    const info = NETWORKS.find((n) => n.id === "INSTAGRAM")!;
    info.audience = "owners";
    try {
      const args = input(who, { accountIds: [account.id], assetId: null, expectedBrl: 0 });
      await expect(createPosts(args)).rejects.toThrow("Esta rede ainda não está disponível para a sua conta.");
      expect(await posts(who.userId)).toHaveLength(0);
      expect(await ledgerSum({ userId: who.userId })).toBeCloseTo(10, 4);
      await prisma.user.update({ where: { id: who.userId }, data: { role: "OWNER" } });
      const { postIds } = await createPosts({ ...args, intentId: randomUUID() });
      expect(postIds).toHaveLength(1);
    } finally {
      info.audience = "all";
    }
  });

  it("a soon network is refused even for owners", async () => {
    const who = await seed();
    await prisma.user.update({ where: { id: who.userId }, data: { role: "OWNER" } });
    const account = await bundleAccount(who.userId, "BLUESKY");
    await expect(createPosts(input(who, { accountIds: [account.id], assetId: null, expectedBrl: 0 }))).rejects.toThrow(
      "Esta rede ainda não está disponível para a sua conta.",
    );
    expect(await posts(who.userId)).toHaveLength(0);
  });

  it("a disconnected account can be re-claimed by another user; a live one cannot", async () => {
    const a = await seed();
    const b = await seed();
    const providerAccountId = `mock-${randomUUID()}`;
    const [id] = await saveConnectedAccounts(a.userId, "mock", [{ network: "X", providerAccountId, handle: "one", tokens: TOKENS }]);
    await expect(saveConnectedAccounts(b.userId, "mock", [{ network: "X", providerAccountId, handle: "two", tokens: TOKENS }])).rejects.toThrow(SocialError);
    await prisma.socialAccount.update({ where: { id }, data: { status: "DISCONNECTED" } });
    const [again] = await saveConnectedAccounts(b.userId, "mock", [{ network: "X", providerAccountId, handle: "two", tokens: TOKENS }]);
    expect(again).toBe(id);
    const row = await prisma.socialAccount.findUniqueOrThrow({ where: { id } });
    expect(row).toMatchObject({ userId: b.userId, handle: "two", status: "CONNECTED" });
  });

  describe("cancel of a bundle post whose time has come", () => {
    const due = async (who: Who) => {
      const account = await bundleAccount(who.userId);
      await prisma.user.update({ where: { id: who.userId }, data: { role: "OWNER" } });
      return prisma.socialPost.create({
        data: {
          userId: who.userId,
          accountId: account.id,
          text: "x",
          scheduledAt: new Date(Date.now() - MIN),
          providerPostId: "bundle-1",
          operationKey: randomUUID(),
          estimatedCostBrl: 0,
        },
      });
    };

    it("is refused when the backend already published it", async () => {
      const who = await seed();
      const post = await due(who);
      const cancel = vi.spyOn(MockPublisher.prototype, "cancel");
      await expect(cancelPost(who.userId, post.id)).rejects.toThrow("Esta publicação já foi enviada e não pode mais ser cancelada.");
      expect(cancel).not.toHaveBeenCalled();
      expect((await prisma.socialPost.findUniqueOrThrow({ where: { id: post.id } })).status).toBe("PUBLISHED");
    });

    it("proceeds when the backend says it is still scheduled", async () => {
      const who = await seed();
      const post = await due(who);
      vi.spyOn(MockPublisher.prototype, "status").mockResolvedValue({ state: "scheduled", providerPostId: "bundle-1" });
      await cancelPost(who.userId, post.id);
      expect((await prisma.socialPost.findUniqueOrThrow({ where: { id: post.id } })).status).toBe("CANCELED");
    });
  });

  it("dispatch refuses a post whose account belongs to another user: refund, account untouched", async () => {
    const a = await seed();
    const b = await seed();
    const post = await dueScheduled(a, { accountId: b.accountId });
    await prisma.ledgerEntry.create({ data: { userId: a.userId, deltaBrl: -0.081, reason: "SPEND", socialPostId: post.id } });
    const publish = vi.spyOn(MockPublisher.prototype, "publish");
    await dispatchDuePosts({ userId: a.userId });
    expect(publish).not.toHaveBeenCalled();
    expect((await prisma.socialPost.findUniqueOrThrow({ where: { id: post.id } })).status).toBe("FAILED");
    expect(await ledgerSum({ socialPostId: post.id })).toBeCloseTo(0, 4);
    expect((await prisma.socialAccount.findUniqueOrThrow({ where: { id: b.accountId } })).status).toBe("CONNECTED");
  });
});
