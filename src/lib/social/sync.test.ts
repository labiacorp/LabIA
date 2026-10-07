import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "../prisma";
import { BundlePublisher } from "./bundle";
import type { ConnectedAccount } from "./publisher";
import { syncBundleAccounts } from "./sync";

const created: string[] = [];
const user = async () => {
  const u = await prisma.user.create({ data: { email: `qa-${randomUUID()}@labia.test` } });
  created.push(u.id);
  return u.id;
};
const withTenant = async () => {
  const id = await user();
  await prisma.socialTenant.create({ data: { userId: id, backend: "bundle", externalId: `team-${randomUUID()}` } });
  return id;
};
const listing = (providerAccountId: string): ConnectedAccount[] => [
  { network: "INSTAGRAM", providerAccountId, handle: "felipe", tokens: null },
];
const rows = (userId: string) => prisma.socialAccount.findMany({ where: { userId } });

describe.skipIf(!process.env.DATABASE_URL)("syncBundleAccounts", () => {
  beforeAll(() => {
    vi.stubEnv("FAL_MOCK", "");
    vi.stubEnv("BUNDLE_API_KEY", "k");
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: created } } });
    vi.unstubAllEnvs();
  });

  it("registers a listed account once; a second call changes nothing", async () => {
    const userId = await withTenant();
    const pid = `team:${randomUUID()}`;
    const finish = vi.spyOn(BundlePublisher.prototype, "finishConnect").mockResolvedValue(listing(pid));
    await syncBundleAccounts(userId);
    await syncBundleAccounts(userId);
    expect(finish).toHaveBeenCalledTimes(2);
    const found = await rows(userId);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ backend: "bundle", providerAccountId: pid, network: "INSTAGRAM", handle: "felipe", status: "CONNECTED", accessToken: null });
  });

  it("does nothing for a user without a tenant", async () => {
    const userId = await user();
    const finish = vi.spyOn(BundlePublisher.prototype, "finishConnect").mockResolvedValue(listing(`t:${randomUUID()}`));
    await syncBundleAccounts(userId);
    expect(finish).not.toHaveBeenCalled();
    expect(await rows(userId)).toHaveLength(0);
  });

  it("never throws when the publisher fails", async () => {
    const userId = await withTenant();
    vi.spyOn(BundlePublisher.prototype, "finishConnect").mockRejectedValue(new Error("down"));
    await expect(syncBundleAccounts(userId)).resolves.toBeUndefined();
    expect(await rows(userId)).toHaveLength(0);
  });

  it("does not reassign an account owned by another user", async () => {
    const owner = await user();
    const pid = `t:${randomUUID()}`;
    const mine = await prisma.socialAccount.create({ data: { userId: owner, backend: "bundle", providerAccountId: pid, network: "INSTAGRAM", handle: "theirs" } });
    const userId = await withTenant();
    vi.spyOn(BundlePublisher.prototype, "finishConnect").mockResolvedValue(listing(pid));
    await expect(syncBundleAccounts(userId)).resolves.toBeUndefined();
    expect((await prisma.socialAccount.findUniqueOrThrow({ where: { id: mine.id } })).userId).toBe(owner);
    expect(await rows(userId)).toHaveLength(0);
  });

  it("does nothing in mock mode", async () => {
    vi.stubEnv("FAL_MOCK", "1");
    try {
      const userId = await withTenant();
      const finish = vi.spyOn(BundlePublisher.prototype, "finishConnect");
      await syncBundleAccounts(userId);
      expect(finish).not.toHaveBeenCalled();
    } finally {
      vi.stubEnv("FAL_MOCK", "");
    }
  });
});
