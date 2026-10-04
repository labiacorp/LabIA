import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), asset: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: { asset: { findFirst: mocks.asset } },
}));
import { GET } from "./route";
const request = new Request("http://localhost/api/assets/id/download");
const context = { params: Promise.resolve({ id: "id" }) };
describe("owned asset download", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "owner" } });
    mocks.asset.mockResolvedValue(null);
  });
  it("requires a session", async () => {
    mocks.auth.mockResolvedValue(null);
    expect((await GET(request, context)).status).toBe(401);
    expect(mocks.asset).not.toHaveBeenCalled();
  });
  it("treats a foreign asset as missing", async () => {
    expect((await GET(request, context)).status).toBe(404);
    expect(mocks.asset.mock.calls[0][0].where).toEqual({
      id: "id",
      userId: "owner",
    });
  });
  it("refuses fetching an untrusted asset source", async () => {
    mocks.asset.mockResolvedValue({
      id: "id",
      url: "http://localhost/private",
      kind: "IMAGE",
    });
    expect((await GET(request, context)).status).toBe(422);
  });
});
