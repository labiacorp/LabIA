import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  source: vi.fn(),
  images: vi.fn(),
  character: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@/lib/owner", () => ({ requireOwner: async () => "owner" }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw Error(url);
  },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    asset: { findFirst: mocks.source, findMany: mocks.images },
    influencer: { findFirst: mocks.character },
    content: { create: mocks.create },
  },
}));
import { createMotion } from "./actions";
function form() {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    title: "Trend",
    influencerId: "character",
    trend: "parking",
    sourceId: "video",
    prompt: "Test",
    resolution: "720p",
  }))
    f.set(k, v);
  f.append("referenceIds", "first");
  return f;
}
describe("motion input ownership", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.character.mockResolvedValue({ id: "character" });
    mocks.source.mockResolvedValue({ id: "video", durationSec: 5 });
    mocks.images.mockResolvedValue([{ id: "first" }]);
    mocks.create.mockResolvedValue({ id: "new" });
  });
  it("rejects foreign source media before creating a draft", async () => {
    mocks.source.mockResolvedValue(null);
    expect(await createMotion("", form())).toContain("biblioteca");
    expect(mocks.source.mock.calls[0][0].where.userId).toBe("owner");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("rejects foreign references and skipped reference slots", async () => {
    mocks.images.mockResolvedValue([]);
    expect(await createMotion("", form())).toContain("biblioteca");
    const f = form();
    f.append("referenceIds", "");
    f.append("referenceIds", "third");
    expect(await createMotion("", f)).toContain("sem pular");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("creates only an empty generation step with ordered references", async () => {
    await expect(createMotion("", form())).rejects.toThrow(
      "/i/character/c/new",
    );
    expect(mocks.create.mock.calls[0][0].data.steps).toEqual({
      create: { kind: "ASSEMBLY", position: 0 },
    });
    expect(mocks.create.mock.calls[0][0].data.motion.referenceIds).toEqual([
      "first",
    ]);
  });
});
