import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mocks.find } },
}));
import { GET } from "./route";
describe("private account export", () => {
  beforeEach(() => vi.resetAllMocks());
  it("rejects anonymous requests without querying personal data", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    expect(mocks.find).not.toHaveBeenCalled();
  });
  it("selects the signed-in account with no credentials or provider internals", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "owner" } });
    mocks.find.mockResolvedValue({ name: "Ana", email: "ana@example.com" });
    const response = await GET();
    const query = mocks.find.mock.calls[0][0];
    expect(query.where).toEqual({ id: "owner" });
    expect(query.select.tokenVersion).toBeUndefined();
    expect(
      query.select.influencers.select.contents.select.steps,
    ).toBeUndefined();
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect((await response.json()).account.name).toBe("Ana");
  });
  it("never selects social tokens, whatever else is added to the export", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "owner" } });
    mocks.find.mockResolvedValue({ name: "Ana" });
    await GET();
    const keys = (node: unknown): string[] =>
      node && typeof node === "object" ? Object.entries(node).flatMap(([key, value]) => [key, ...keys(value)]) : [];
    const selected = keys(mocks.find.mock.calls[0][0].select);
    for (const forbidden of ["accessToken", "refreshToken", "tokenExpiresAt", "socialAccounts"]) expect(selected).not.toContain(forbidden);
  });
});
