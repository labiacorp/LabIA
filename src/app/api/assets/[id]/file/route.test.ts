import { describe, expect, it, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  find: vi.fn(),
  read: vi.fn(),
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({
  prisma: { asset: { findFirst: mocks.find } },
}));
vi.mock("@/lib/reference-storage", () => ({ readReference: mocks.read }));
import { GET } from "./route";
import { mediaSignature } from "@/lib/media-access";
describe("private imported media", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "owner" } });
    mocks.find.mockResolvedValue({
      storageKey: "local:references/id.mp4",
      contentType: "video/mp4",
      id: "id",
      kind: "VIDEO",
    });
    mocks.read.mockResolvedValue(new Uint8Array([1, 2, 3, 4]));
  });
  it("scopes previews to owner and supports bounded video ranges", async () => {
    const res = await GET(
      new Request("https://labia.test/api/assets/id/file", {
        headers: { range: "bytes=1-2" },
      }),
      { params: Promise.resolve({ id: "id" }) },
    );
    expect(mocks.find.mock.calls[0][0].where).toEqual({
      id: "id",
      userId: "owner",
    });
    expect(res.status).toBe(206);
    expect(Array.from(new Uint8Array(await res.arrayBuffer()))).toEqual([2, 3]);
  });
  it("rejects anonymous/foreign reads and grants only the explicitly signed file", async () => {
    mocks.auth.mockResolvedValue(null);
    expect(
      (
        await GET(new Request("https://labia.test/api/assets/id/file"), {
          params: Promise.resolve({ id: "id" }),
        })
      ).status,
    ).toBe(401);
    vi.stubEnv("AUTH_SECRET", "x".repeat(32));
    const expires = Date.now() + 60000;
    const sig = mediaSignature("id", expires);
    expect(
      (
        await GET(
          new Request(
            `https://labia.test/api/assets/id/file?expires=${expires}&signature=${sig}`,
          ),
          { params: Promise.resolve({ id: "id" }) },
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await GET(
          new Request(
            `https://labia.test/api/assets/foreign/file?expires=${expires}&signature=${sig}`,
          ),
          { params: Promise.resolve({ id: "foreign" }) },
        )
      ).status,
    ).toBe(401);
    vi.unstubAllEnvs();
  });
});
