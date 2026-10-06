import type { NextAuthConfig } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  config: {} as NextAuthConfig,
  find: vi.fn(),
  upsert: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("next-auth", () => ({
  CredentialsSignin: class extends Error {},
  default: (config: NextAuthConfig) => {
    mocks.config = config;
    return {};
  },
}));
vi.mock("@/lib/rate-limit", () => ({ hit: async () => true, clearHits: async () => {}, clientIp: async () => "test" }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mocks.find, upsert: mocks.upsert } },
}));
vi.mock("@/lib/access", () => ({ hasPass: vi.fn(), gateMode: () => "off", grantPass: vi.fn() }));
import "./auth";
describe("JWT session revocation", () => {
  beforeEach(() => vi.clearAllMocks());
  it("stamps the current database version at sign-in", async () => {
    mocks.upsert.mockResolvedValue({ id: "owner", tokenVersion: 4 });
    expect(
      await mocks.config.callbacks!.jwt!({
        token: {},
        account: null,
        user: { email: "owner@example.com" },
      }),
    ).toMatchObject({ uid: "owner", tokenVersion: 4 });
  });
  it("rejects revoked and deleted users on the next request", async () => {
    mocks.find.mockResolvedValue({ tokenVersion: 1 });
    expect(
      await mocks.config.callbacks!.jwt!({
        token: { uid: "owner", tokenVersion: 0 },
        user: undefined as never,
        account: null,
      }),
    ).toBeNull();
    mocks.find.mockResolvedValue(null);
    expect(
      await mocks.config.callbacks!.jwt!({
        token: { uid: "owner", tokenVersion: 0 },
        user: undefined as never,
        account: null,
      }),
    ).toBeNull();
  });
  it("accepts legacy tokens only at version zero and ignores client update fields", async () => {
    mocks.find.mockResolvedValue({ tokenVersion: 0 });
    expect(
      await mocks.config.callbacks!.jwt!({
        token: { uid: "owner" },
        user: undefined as never,
        account: null,
        trigger: "update",
        session: { tokenVersion: 99 },
      }),
    ).toEqual({ uid: "owner" });
    mocks.find.mockResolvedValue({ tokenVersion: 1 });
    expect(
      await mocks.config.callbacks!.jwt!({
        token: { uid: "owner" },
        user: undefined as never,
        account: null,
      }),
    ).toBeNull();
  });
});

describe("password sign-in", () => {
  beforeEach(() => vi.clearAllMocks());
  it("refuses an unconfirmed address only after the password matched", async () => {
    const { hashPassword } = await import("@/lib/password");
    const authorize = (mocks.config.providers.find((p) => (p as { options?: { id?: string } }).options?.id === "password") as unknown as { options: { authorize: (c: unknown) => Promise<unknown> } }).options.authorize;
    mocks.find.mockResolvedValue({ id: "u1", passwordHash: await hashPassword("certa"), emailVerifiedAt: null });
    expect(await authorize({ email: "a@example.com", password: "errada" })).toBeNull();
    await expect(authorize({ email: "a@example.com", password: "certa" })).rejects.toMatchObject({ code: "unverified" });
    mocks.find.mockResolvedValue({ id: "u1", passwordHash: await hashPassword("certa"), emailVerifiedAt: new Date() });
    expect(await authorize({ email: "a@example.com", password: "certa" })).toEqual({ id: "u1", email: "a@example.com" });
  });
});
