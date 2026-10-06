import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "../prisma";
import { saveConnectedAccounts } from "./accounts";
import { MockPublisher } from "./mock";
import { AuthExpiredError } from "./publisher";
import { applyOutcome, cancelPost, createPosts, disconnectAccount, dispatchDuePosts, FAILURE_COPY, SocialError } from "./posts";

// Database tests: seed their own users and delete them in afterAll (cascade removes accounts, posts and ledger).
const created: string[] = [];
const MIN = 60_000;

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
    await expect(createPosts(input(who))).rejects.toThrow(/Saldo insuficiente/);
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
    await prisma.socialAccount.update({ where: { id: who.accountId }, data: { tokenExpiresAt: new Date(Date.now() - MIN) } });
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
    expect(String(failed.reason.message)).toMatch(/Saldo insuficiente/);
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
});
