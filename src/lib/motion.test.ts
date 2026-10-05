import { afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { motionSchema, MOTION_MODEL, motionEstimate } from "./motion";
import { HiggsfieldProvider } from "./providers/higgsfield";
import { prisma } from "./prisma";
import { startPlan, collectRunning, reconcileReservation } from "./generation";
const ids: string[] = [];
afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("motion recreation", () => {
  it("bounds references, preserves ordering and rounds input duration upward", () => {
    expect(
      motionSchema.safeParse({
        version: 1,
        trend: "parking",
        sourceId: "v",
        referenceIds: ["a", "a"],
        prompt: "",
        resolution: "720p",
      }).success,
    ).toBe(false);
    expect(motionEstimate(4.1, "720p").seconds).toBe(5);
  });
  it("uses documented REST submission, excludes internal billing fields, and marks actual cost unverified", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ request_id: "request-123" })),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: "completed",
            video: { url: "https://cdn.higgsfield.ai/example.mp4" },
          }),
        ),
      );
    vi.stubGlobal("fetch", mockFetch);
    vi.stubEnv("HF_CREDENTIALS", "test-id:test-secret");
    try {
      const provider = new HiggsfieldProvider();
      const params = {
        sourceDuration: 5,
        resolution: "720p",
        video_url: "https://example.com/video.mp4",
        image_urls: ["https://example.com/a.webp"],
        prompt: "hello",
      };
      const handle = await provider.generate(MOTION_MODEL, params);
      expect(JSON.parse(mockFetch.mock.calls[0][1].body)).not.toHaveProperty(
        "sourceDuration",
      );
      expect(await provider.checkResult(handle, params)).toMatchObject({
        state: "done",
        result: { raw: { billingVerified: false } },
      });
    } finally {
      vi.unstubAllGlobals();
      vi.unstubAllEnvs();
    }
  });
  it("reserves once, completes once, and puts the mock output into review", async () => {
    vi.stubEnv("FAL_MOCK", "1");
    const user = await prisma.user.create({
      data: { email: `motion-${randomUUID()}@example.com` },
    });
    ids.push(user.id);
    const influencer = await prisma.influencer.create({
      data: { userId: user.id, name: "QA", niche: "QA", tone: "QA" },
    });
    const content = await prisma.content.create({
      data: {
        influencerId: influencer.id,
        title: "QA",
        steps: { create: { kind: "ASSEMBLY", position: 0 } },
      },
    });
    await prisma.ledgerEntry.create({
      data: {
        userId: user.id,
        deltaBrl: 100,
        reason: "TOPUP",
        note: "Disposable mock test",
      },
    });
    const params = {
      sourceDuration: 5,
      resolution: "720p",
      video_url: "/mock/clip.mp4",
      image_urls: ["/mock/portrait.svg"],
      prompt: "QA",
    };
    const input = {
      userId: user.id,
      influencerId: influencer.id,
      contentId: content.id,
      contentKind: "ASSEMBLY" as const,
      intentId: randomUUID(),
      expectedBrl: motionEstimate(5, "720p").brl,
      plan: [{ model: MOTION_MODEL, role: null, params }],
    };
    await Promise.all([startPlan(input), startPlan(input)]);
    expect(
      await prisma.ledgerEntry.count({
        where: { userId: user.id, reason: "SPEND" },
      }),
    ).toBe(1);
    await new Promise((resolve) => setTimeout(resolve, 550));
    const originalCheck = HiggsfieldProvider.prototype.checkResult;
    const completion = vi.spyOn(HiggsfieldProvider.prototype, "checkResult").mockImplementation(async (handle, input) => {
      const outcome = await originalCheck.call(new HiggsfieldProvider(true), handle, input);
      if (outcome.state === "done") outcome.result.raw = { billingVerified: false };
      return outcome;
    });
    await Promise.all([
      collectRunning(user.id, influencer.id),
      collectRunning(user.id, influencer.id),
    ]);
    expect(
      (await prisma.content.findUniqueOrThrow({ where: { id: content.id } }))
        .status,
    ).toBe("REVIEW");
    expect(await prisma.asset.count({ where: { contentId: content.id } })).toBe(
      1,
    );
    // Real provider responses do not include verified billing: reconciliation retains artifacts.
    const step = await prisma.step.findFirstOrThrow({
      where: { contentId: content.id },
    });
    completion.mockRestore();
    expect(step.actualCostBrl).toBeNull();
    expect(step.submissionState).toBe("cost_unknown");
    expect(await prisma.ledgerEntry.count({where:{stepId:step.id,reason:"REFUND"}})).toBe(0);
    await reconcileReservation(user.id, step.id, 2);
    expect(
      (
        await prisma.step.findUniqueOrThrow({ where: { id: step.id } })
      ).actualCostBrl?.toString(),
    ).toBe("2");
    expect(await prisma.asset.count({ where: { contentId: content.id } })).toBe(
      1,
    );
  });
});
