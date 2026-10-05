import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({ config: vi.fn(), submit: vi.fn(), status: vi.fn(), result: vi.fn(), subscribeToStatus: vi.fn() }));
vi.mock("@fal-ai/client", () => ({ fal: { config: sdk.config, queue: sdk } }));
import { FalProvider } from "./fal";
import { MockProvider } from "./mock";
import { prepareVideo, settleVideo, VIDEO_DEFINITIONS } from "./video-models";
import { getVideoOptions } from "../video-options";

const provider = () => new FalProvider({ apiKey: "mock-only-no-network", usdBrlRate: 5.4 });
const input = { prompt: "The creator waves", image_url: "https://fixture/image.png", duration: 5, resolution: "720p", generate_audio: true, image_width: 1280, image_height: 720 };
beforeEach(() => { vi.clearAllMocks(); sdk.submit.mockResolvedValue({ request_id: "mock-video" }); });
afterEach(() => vi.unstubAllEnvs());

describe("selectable fal video model contracts", () => {
  it("separates per-second video rates from Grok's per-image surcharge", () => {
    vi.stubEnv("USD_BRL_RATE", "5.4");
    const options = getVideoOptions({ width: 1280, height: 720 });
    const grok = options.find((option) => option.model === "xai/grok-imagine-video/v1.5/lite/image-to-video")!;
    expect(grok.pricing?.ratesBrl).toMatchObject({ "480p": 0.108, "720p": 0.162, "1080p": 0.756 });
    expect(grok.pricing?.imageFeeBrl).toBeCloseTo(0.054, 6);
    const veo = options.find((option) => option.model === "fal-ai/veo3.1/image-to-video")!;
    expect(veo.pricing?.ratesBrl["720p"]).toBeCloseTo(1.08, 6);
    expect(veo.pricing?.audioRatesBrl?.["720p"]).toBeCloseTo(2.16, 6);
  });
  it("keeps the legacy reel available when catalog entries are reordered", () => {
    const original = [...VIDEO_DEFINITIONS];
    try {
      VIDEO_DEFINITIONS.reverse();
      const options = getVideoOptions({ width: 1280, height: 720 });
      expect(options[0]).toMatchObject({ key: "legacy-reel", model: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video", strategy: "reel" });
      expect(options[0].configurations[0].brl).toBeCloseTo(5.67, 4);
    } finally { VIDEO_DEFINITIONS.splice(0, VIDEO_DEFINITIONS.length, ...original); }
  });
  it("uses the updated catalog rate when quoting an existing selectable endpoint", () => {
    const kling = VIDEO_DEFINITIONS.find((model) => model.id === "fal-ai/kling-video/v2.5-turbo/pro/image-to-video")!;
    const previous = kling.rates.default;
    try {
      kling.rates.default = 0.08;
      expect(provider().estimateCost(kling.id, { ...input, resolution: "default", generate_audio: false }).usd).toBeCloseTo(0.4, 6);
    } finally { kling.rates.default = previous; }
  });
  it.each([
    ["xai/grok-imagine-video/v1.5/image-to-video", 0.71],
    ["xai/grok-imagine-video/v1.5/lite/image-to-video", 0.16],
    ["bytedance/seedance-2.5/image-to-video", 2.365],
    ["bytedance/seedance-2.5/us/image-to-video", 2.838],
    ["fal-ai/kling-video/v3/pro/image-to-video", 0.84],
    ["fal-ai/kling-video/v3/turbo/pro/image-to-video", 0.7],
    ["alibaba/wan-3.0/image-to-video", 0.5],
  ])("quotes %s with its own billing rule", (model, usd) => {
    const cost = provider().estimateCost(model, model.includes("kling-video") ? { ...input, resolution: "default" } : input);
    expect(cost.usd).toBeCloseTo(usd, 6);
    expect(cost.brl).toBeCloseTo(usd * 5.4, 4);
  });
  it("maps Kling 3 Pro's first frame without falling into the Kling 2.5 branch", async () => {
    const handle = await provider().generate("fal-ai/kling-video/v3/pro/image-to-video", { ...input, resolution: "default" });
    expect(handle.model).toBe("fal-ai/kling-video/v3/pro/image-to-video");
    expect(sdk.submit.mock.calls[0][1].input).toMatchObject({ start_image_url: input.image_url, duration: "5", generate_audio: true });
    expect(sdk.submit.mock.calls[0][1].input).not.toHaveProperty("image_url");
    expect(sdk.submit.mock.calls[0][1].input).not.toHaveProperty("image_width");
  });
  it("validates duration and required image during quoting, before funds can be reserved", () => {
    expect(() => provider().estimateCost("xai/grok-imagine-video/v1.5/image-to-video", { ...input, image_url: "" })).toThrow();
    expect(() => provider().estimateCost("fal-ai/kling-video/v3/pro/image-to-video", { ...input, duration: 2 })).toThrow();
    expect(() => provider().estimateCost("bytedance/seedance-2.5/image-to-video", { ...input, duration: "auto" })).toThrow();
    expect(sdk.submit).not.toHaveBeenCalled();
  });
  it("does not quote token-billed Seedance without trusted source dimensions", () => {
    expect(() => provider().estimateCost("bytedance/seedance-2.5/image-to-video", { ...input, image_width: undefined })).toThrow();
    expect(() => provider().estimateCost("bytedance/seedance-2.5/image-to-video", { ...input, image_width: 3000, image_height: 720 })).toThrow();
  });
  it("lets measured mock video duration differ from the valid requested duration", async () => {
    vi.stubEnv("FAL_MOCK_VIDEO_DURATION", "5.04");
    const mock = new MockProvider();
    const handle = await mock.generate("xai/grok-imagine-video/v1.5/image-to-video", input);
    const outcome = await mock.checkResult(handle, input, true);
    expect(outcome.state).toBe("done");
    if (outcome.state === "done") expect(outcome.result.videos?.[0].durationSeconds).toBe(5.04);
  });
  it.each([
    ["fal-ai/pixverse/v6/image-to-video", "720p", true, 5, { duration: 5, generate_audio_switch: true }, .3],
    ["fal-ai/vidu/q3/image-to-video/turbo", "1080p", false, 5, { duration: 5, audio: false }, .385],
    ["minimax/h3-max/image-to-video", "768p", true, 5, { duration: 5, resolution: "768P", prompt_expansion_mode: "balanced" }, .456],
    ["minimax/h3-max-turbo/image-to-video", "1080p", true, 5, { duration: 5, resolution: "1080P", prompt_expansion_mode: "balanced" }, .456],
    ["fal-ai/minimax/hailuo-02/standard/image-to-video", "768p", false, 6, { duration: "6", resolution: "768P" }, .27],
  ] as const)("submits the verified new %s wire contract and quote", async (id, resolution, audio, duration, wire, usd) => {
    const params = { ...input, resolution, duration, generate_audio: audio };
    expect(prepareVideo(id, params, 5.4).cost.usd).toBeCloseTo(usd, 6);
    await provider().generate(id, params);
    expect(sdk.submit).toHaveBeenCalledWith(id, expect.objectContaining({ input: expect.objectContaining(wire) }));
  });
  it("settles MiniMax from measured output and reserves the documented overrun", () => {
    const quote = prepareVideo("minimax/h3-max/image-to-video", { ...input, resolution: "768p" }, 5.4);
    expect(settleVideo(quote.snapshot, { url: "https://fixture/video.mp4", durationSeconds: 5.7 }).usd).toBeCloseTo(.456, 6);
  });

  it("keeps chosen H3 quality and duration instead of overwriting them with defaults", async () => {
    await provider().generate("minimax/h3/image-to-video", { ...input, duration: 10, resolution: "768p" });
    expect(sdk.submit.mock.calls[0][1].input).toMatchObject({ duration: 10, resolution: "768P" });
  });

  it("quotes Vidu Q2's fixed fee and restricts background music to four seconds", () => {
    const id = "fal-ai/vidu/q2/image-to-video/pro";
    expect(prepareVideo(id, { ...input, duration: 4, resolution: "1080p" }, 5.4).cost.usd).toBeCloseTo(.7, 6);
    expect(() => prepareVideo(id, { ...input, duration: 5 }, 5.4)).toThrow();
    const quote = prepareVideo(id, { ...input, duration: 5, generate_audio: false }, 5.4);
    expect(settleVideo(quote.snapshot, { url: "https://fixture/video.mp4", durationSeconds: 5 }).usd).toBeCloseTo(.35, 6);
  });
  it("quotes PixVerse 5 as a resolution-dependent clip, not a per-second amount", () => {
    const quote = prepareVideo("fal-ai/pixverse/v5/image-to-video", { ...input, generate_audio: false }, 5.4);
    expect(quote.cost.usd).toBeCloseTo(.2, 6);
    expect(quote.input.duration).toBe("5");
    expect(settleVideo(quote.snapshot, { url: "https://fixture/video.mp4", durationSeconds: 5.2 }).usd).toBeCloseTo(.2, 6);
  });

});
