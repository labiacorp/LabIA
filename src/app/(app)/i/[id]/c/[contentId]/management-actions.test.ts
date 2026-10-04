import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  userId: vi.fn(),
  find: vi.fn(),
  step: vi.fn(),
  review: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ requireUserId: mocks.userId }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (callback: (tx: unknown) => unknown) =>
      callback({
        content: { findFirst: mocks.find },
        step: { updateMany: mocks.step },
      }),
    content: { updateMany: mocks.review },
  },
}));
vi.mock("@/lib/generation", () => ({
  UserError: class UserError extends Error {},
}));
import { saveScript, reviewContent } from "./management-actions";
const previous = { error: "", message: "" };
const form = (field: string, value: string) => {
  const data = new FormData();
  data.set(field, value);
  return data;
};
describe("production management", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.userId.mockResolvedValue("owner");
    mocks.find.mockResolvedValue({ id: "content" });
    mocks.step.mockResolvedValue({ count: 1 });
    mocks.review.mockResolvedValue({ count: 1 });
  });
  it("saves a bounded, free script only for owned content", async () => {
    expect(
      (
        await saveScript(
          "character",
          "content",
          previous,
          form("script", "  Cena  "),
        )
      ).error,
    ).toBe("");
    expect(mocks.find).toHaveBeenCalledWith({
      where: {
        id: "content",
        influencerId: "character",
        influencer: { userId: "owner" },
      },
    });
    expect(mocks.step.mock.calls[0][0].data.input.script).toBe("Cena");
    expect(mocks.step.mock.calls[0][0].data.actualCostBrl).toBe(0);
  });
  it("rejects foreign content and oversized scripts without modifying a step", async () => {
    mocks.find.mockResolvedValue(null);
    expect(
      (await saveScript("foreign", "content", previous, form("script", "Cena")))
        .error,
    ).toBe("Conteúdo não encontrado.");
    expect(
      (
        await saveScript(
          "character",
          "content",
          previous,
          form("script", "x".repeat(2001)),
        )
      ).error,
    ).toContain("2.000");
    expect(mocks.step).not.toHaveBeenCalled();
  });
  it("requires a completed owned final video and no running step before approval", async () => {
    await reviewContent(
      "character",
      "content",
      previous,
      form("decision", "APPROVED"),
    );
    const where = mocks.review.mock.calls[0][0].where;
    expect(where.influencer).toEqual({ userId: "owner" });
    expect(where.steps.some).toEqual({
      kind: "ASSEMBLY",
      status: "DONE",
      assets: { some: { kind: "VIDEO", userId: "owner" } },
    });
    expect(where.steps.none).toEqual({ status: "RUNNING" });
    mocks.review.mockResolvedValue({ count: 0 });
    expect(
      (
        await reviewContent(
          "character",
          "content",
          previous,
          form("decision", "APPROVED"),
        )
      ).error,
    ).toContain("vídeo final");
  });
  it("rejects forged review statuses", async () => {
    expect(
      (
        await reviewContent(
          "character",
          "content",
          previous,
          form("decision", "IN_PROGRESS"),
        )
      ).error,
    ).not.toBe("");
    expect(mocks.review).not.toHaveBeenCalled();
  });
});
