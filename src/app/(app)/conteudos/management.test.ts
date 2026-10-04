import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  update: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
  lock: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ requireUserId: mocks.user }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    influencer: { findFirst: mocks.find },
    content: { create: mocks.create },
    $transaction: async (callback: (tx: unknown) => unknown) =>
      callback({
        $queryRaw: mocks.lock,
        content: { updateMany: mocks.update },
      }),
  },
}));
import { createProduction, setArchive } from "./management";
describe("content organization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue("owner");
    mocks.update.mockResolvedValue({ count: 1 });
    mocks.find.mockResolvedValue({ id: "character" });
    mocks.create.mockResolvedValue({ id: "new" });
  });
  it("archives only owned idle content while locking against concurrent paid starts", async () => {
    expect(await setArchive("content", true, "")).toBe("");
    expect(mocks.lock).toHaveBeenCalled();
    expect(mocks.update.mock.calls[0][0].where).toEqual({
      id: "content",
      influencer: { userId: "owner" },
      steps: { none: { status: "RUNNING" } },
      archivedAt: null,
    });
    expect(mocks.update.mock.calls[0][0].data.archivedAt).toBeInstanceOf(Date);
  });
  it("restores without deleting or changing media and returns a controlled unavailable error", async () => {
    await setArchive("content", false, "");
    expect(mocks.update.mock.calls[0][0].data).toEqual({ archivedAt: null });
    mocks.update.mockResolvedValue({ count: 0 });
    expect(await setArchive("foreign", true, "")).toContain("indisponível");
  });
  it("creates a free owned draft with an explicit format and fresh pipeline steps", async () => {
    const f = new FormData();
    f.set("title", "Novo");
    f.set("idea", "");
    f.set("aspectRatio", "16:9");
    f.set("influencerId", "character");
    f.set("userId", "foreign");
    await expect(createProduction("", f)).rejects.toThrow(
      "redirect:/i/character/c/new",
    );
    expect(mocks.find).toHaveBeenCalledWith({
      where: { id: "character", userId: "owner" },
      select: { id: true },
    });
    expect(mocks.create.mock.calls[0][0].data.aspectRatio).toBe("16:9");
    expect(mocks.create.mock.calls[0][0].data.steps.create).toHaveLength(4);
  });
  it("rejects invalid formats and foreign characters before creation", async () => {
    const f = new FormData();
    f.set("title", "Novo");
    f.set("idea", "");
    f.set("aspectRatio", "invalid");
    f.set("influencerId", "foreign");
    expect(await createProduction("", f)).toContain("Escolha");
    f.set("aspectRatio", "9:16");
    mocks.find.mockResolvedValue(null);
    expect(await createProduction("", f)).toContain("sua conta");
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
