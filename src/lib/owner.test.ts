import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mocks.find } } }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
import { requireOwner } from "./owner";

const session = (authMethod: string) => ({ user: { id: "u1" }, authMethod, expires: "" });

describe("owner gate", () => {
  beforeEach(() => vi.resetAllMocks());
  it("lets an OWNER through only on a Google session", async () => {
    mocks.find.mockResolvedValue({ role: "OWNER" });
    mocks.auth.mockResolvedValue(session("google"));
    await expect(requireOwner()).resolves.toBe("u1");
    mocks.auth.mockResolvedValue(session("password"));
    await expect(requireOwner()).rejects.toThrow("NOT_FOUND");
  });
  it("answers not-found to normal accounts, revoked owners and anonymous visitors", async () => {
    mocks.auth.mockResolvedValue(session("google"));
    mocks.find.mockResolvedValue({ role: "USER" });
    await expect(requireOwner()).rejects.toThrow("NOT_FOUND");
    mocks.find.mockResolvedValue(null);
    await expect(requireOwner()).rejects.toThrow("NOT_FOUND");
    mocks.auth.mockResolvedValue(null);
    await expect(requireOwner()).rejects.toThrow("NOT_FOUND");
  });
  it("accepts the dev provider only in development", async () => {
    mocks.find.mockResolvedValue({ role: "OWNER" });
    mocks.auth.mockResolvedValue(session("dev"));
    vi.stubEnv("NODE_ENV", "production");
    await expect(requireOwner()).rejects.toThrow("NOT_FOUND");
    vi.stubEnv("NODE_ENV", "development");
    await expect(requireOwner()).resolves.toBe("u1");
    vi.unstubAllEnvs();
  });
});
