import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({ config: vi.fn(), submit: vi.fn(), status: vi.fn(), result: vi.fn() }));
vi.mock("@fal-ai/client", () => ({ fal: { config: sdk.config, queue: sdk } }));
import { FalMotionProvider } from "./fal-motion";

const input = {
  prompt: "Keep the character's appearance",
  image_urls: ["https://fixture/character.png"],
  video_url: "https://fixture/dance.mp4",
  sourceDuration: 4.1,
  resolution: "default",
  character_orientation: "video",
  keep_original_sound: true,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("FAL_KEY", "mock-only-no-network");
  vi.stubEnv("USD_BRL_RATE_FIXED", "5.4");
  sdk.submit.mockResolvedValue({ request_id: "motion-request" });
  sdk.status.mockResolvedValue({ status: "COMPLETED" });
  sdk.result.mockResolvedValue({ data: { video: { url: "https://fixture/output.mp4" } } });
});
afterEach(() => vi.unstubAllEnvs());

describe("Kling Standard motion contracts", () => {
  it.each([
    ["fal-ai/kling-video/v2.6/standard/motion-control", true, 0.35, 1.89],
    ["fal-ai/kling-video/v2.6/standard/motion-control", false, 0.35, 1.89],
    ["fal-ai/kling-video/v3/standard/motion-control", true, 0.63, 3.402],
    ["fal-ai/kling-video/v3/standard/motion-control", false, 0.63, 3.402],
  ] as const)("submits and collects %s with keep_original_sound=%s at its own rate", async (model, sound, usd, brl) => {
    const provider = new FalMotionProvider();
    const params = { ...input, keep_original_sound: sound };
    const handle = await provider.generate(model, params);
    expect(handle).toEqual({ id: "motion-request", provider: "fal", model });
    expect(sdk.submit).toHaveBeenCalledWith(model, {
      input: {
        prompt: input.prompt,
        image_url: input.image_urls[0],
        video_url: input.video_url,
        character_orientation: "video",
        keep_original_sound: sound,
      },
    });
    const outcome = await provider.checkResult(handle, params);
    expect(sdk.status).toHaveBeenCalledWith(model, { requestId: "motion-request" });
    expect(sdk.result).toHaveBeenCalledWith(model, { requestId: "motion-request" });
    expect(outcome.state).toBe("done");
    if (outcome.state === "done") {
      expect(outcome.result.videos).toEqual([{ url: "https://fixture/output.mp4", contentType: "video/mp4", durationSeconds: 4.1 }]);
      expect(outcome.result.model).toBe(model);
      expect(outcome.result.cost.usd).toBeCloseTo(usd, 6);
      expect(outcome.result.cost.brl).toBeCloseTo(brl, 4);
      expect(outcome.result.cost.source).toContain(`https://fal.ai/models/${model}`);
    }
  });
  it("keeps a Standard request pending without fetching an unfinished result", async () => {
    sdk.status.mockResolvedValue({ status: "IN_PROGRESS" });
    const provider = new FalMotionProvider();
    const handle = await provider.generate("fal-ai/kling-video/v3/standard/motion-control", input);
    expect(await provider.checkResult(handle, input)).toEqual({ state: "pending" });
    expect(sdk.result).not.toHaveBeenCalled();
  });
});
