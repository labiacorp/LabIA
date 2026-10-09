import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  update: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
  lock: vi.fn(),
  stepUpdate: vi.fn(),
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
        step: { updateMany: mocks.stepUpdate },
      }),
  },
}));
import { createProduction, setArchive } from "./management";
import { getImageOptions } from "@/lib/content-generation";
import { getVideoOptions } from "@/lib/video-options";
describe("content organization", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue("owner");
    mocks.update.mockResolvedValue({ count: 1 });
    mocks.stepUpdate.mockResolvedValue({ count: 1 });
    mocks.find.mockResolvedValue({ id: "character" });
    mocks.create.mockResolvedValue({ id: "new" });
  });
  it("keeps the chosen image and video settings in a free draft and computes estimates on the server", async () => {
    const image = getImageOptions("16:9").find((item) => item.configurations.length)!;
    const video = getVideoOptions().find((item) => item.strategy === "clip" && item.configurations.length)!;
    const imageConfig = image.configurations.at(-1)!;
    const videoConfig = video.configurations.at(-1)!;
    const f = new FormData();
    for (const [key, value] of Object.entries({ influencerId: "character", idea: "A test video", aspectRatio: "16:9", imageModel: image.model, imageResolution: imageConfig.resolution, videoModel: video.model, videoStrategy: video.strategy, videoDuration: String(videoConfig.duration), videoResolution: videoConfig.resolution, videoAudio: String(videoConfig.audio), expectedBrl: "0" })) f.set(key, value);
    expect((await createProduction({ error: "" }, f)).created).toBe("/i/character/c/new");
    const steps = mocks.create.mock.calls[0][0].data.steps.create;
    expect(steps.find((step: { kind: string }) => step.kind === "IMAGE")).toMatchObject({ input: { selection: { model: image.model, resolution: imageConfig.resolution } }, estimatedCostBrl: imageConfig.brl });
    expect(steps.find((step: { kind: string }) => step.kind === "VIDEO")).toMatchObject({ input: { selection: { model: video.model, strategy: "clip", duration: videoConfig.duration, resolution: videoConfig.resolution, audio: videoConfig.audio } }, estimatedCostBrl: videoConfig.brl });
  });
  it("rejects an invented model before saving a draft", async () => {
    const f = new FormData();
    for (const [key, value] of Object.entries({ influencerId: "character", idea: "A test", imageModel: "invented", imageResolution: "1K" })) f.set(key, value);
    expect((await createProduction({ error: "" }, f)).error).toContain("image");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("edits only an owned draft before paid generation starts", async () => {
    const f = new FormData();
    for (const [key, value] of Object.entries({ contentId: "draft", influencerId: "character", idea: "Updated draft", aspectRatio: "16:9" })) f.set(key, value);
    expect((await createProduction({ error: "" }, f)).created).toBe("/i/character/c/draft");
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.lock).toHaveBeenCalled();
    expect(mocks.update.mock.calls[0][0].where).toMatchObject({ id: "draft", influencerId: "character", influencer: { userId: "owner" }, archivedAt: null, steps: { none: { kind: { in: ["IMAGE", "VIDEO"] } } } });
    mocks.update.mockResolvedValue({ count: 0 });
    expect((await createProduction({ error: "" }, f)).error).toContain("cannot be edited");
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
    f.set("script", "Um roteiro reutilizado.");
    f.set("title", "Novo");
    f.set("idea", "Uma ideia");
    f.set("aspectRatio", "16:9");
    f.set("influencerId", "character");
    f.set("userId", "foreign");
    expect(await createProduction({ error: "" }, f)).toEqual({ error: "", created: "/i/character/c/new" });
    expect(mocks.find).toHaveBeenCalledWith({
      where: { id: "character", userId: "owner" },
      select: { id: true },
    });
    expect(mocks.create.mock.calls[0][0].data.aspectRatio).toBe("16:9");
    const steps = mocks.create.mock.calls[0][0].data.steps.create;
    expect(steps).toHaveLength(4);
    expect(
      steps.find((s: { kind: string }) => s.kind === "SCRIPT"),
    ).toMatchObject({
      status: "DONE",
      input: { script: "Um roteiro reutilizado." },
      actualCostBrl: 0,
    });
    expect(
      steps
        .filter((s: { kind: string }) => s.kind !== "SCRIPT")
        .every(
          (s: { status?: string; operationKey?: string }) =>
            !s.operationKey && (!s.status || s.status === "PENDING"),
        ),
    ).toBe(true);
  });
  it("rejects invalid formats and foreign characters before creation", async () => {
    const f = new FormData();
    f.set("title", "Novo");
    f.set("idea", "Uma ideia");
    f.set("aspectRatio", "invalid");
    f.set("influencerId", "foreign");
    expect((await createProduction({ error: "" }, f)).error).toContain("Escolha");
    f.set("aspectRatio", "9:16");
    mocks.find.mockResolvedValue(null);
    expect((await createProduction({ error: "" }, f)).error).toContain("sua conta");
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("takes the title from the idea's first clause and defaults to 9:16", async () => {
    const f = new FormData();
    f.set("idea", "3 hábitos de quem acorda às 5h, tom leve, gancho nos 2 primeiros segundos.");
    f.set("influencerId", "character");
    await createProduction({ error: "" }, f);
    expect(mocks.create.mock.calls[0][0].data).toMatchObject({ title: "3 hábitos de quem acorda às 5h", aspectRatio: "9:16" });
    expect((await createProduction({ error: "" }, (f.set("idea", " "), f))).error).toContain("ideia");
  });
});
