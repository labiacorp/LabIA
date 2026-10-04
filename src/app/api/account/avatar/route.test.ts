import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mocks.find } },
}));
import { GET } from "./route";
beforeEach(() => vi.resetAllMocks());
it("rejects anonymous photo requests", async () => {
  mocks.auth.mockResolvedValue(null);
  expect((await GET()).status).toBe(401);
  expect(mocks.find).not.toHaveBeenCalled();
});
it("only returns the current user's photo without public caching", async () => {
  mocks.auth.mockResolvedValue({ user: { id: "owner" } });
  mocks.find.mockResolvedValue({ avatar: new Uint8Array([1, 2, 3]) });
  const res = await GET();
  expect(mocks.find).toHaveBeenCalledWith({
    where: { id: "owner" },
    select: { avatar: true },
  });
  expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  expect(res.headers.get("Content-Type")).toBe("image/webp");
  expect(new Uint8Array(await res.arrayBuffer())).toEqual(
    new Uint8Array([1, 2, 3]),
  );
});
it("returns 404 after removal", async () => {
  mocks.auth.mockResolvedValue({ user: { id: "owner" } });
  mocks.find.mockResolvedValue({ avatar: null });
  expect((await GET()).status).toBe(404);
});
