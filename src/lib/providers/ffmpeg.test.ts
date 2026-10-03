import { beforeEach, describe, expect, it, vi } from "vitest";

// Adapter contract tests: the SDK is replaced entirely, so these cannot submit a real fal job.
const sdk = vi.hoisted(() => ({ config: vi.fn(), submit: vi.fn(), status: vi.fn(), result: vi.fn(), subscribeToStatus: vi.fn() }));
vi.mock("@fal-ai/client", () => ({ fal: { config: sdk.config, queue: {
  submit: sdk.submit, status: sdk.status, result: sdk.result, subscribeToStatus: sdk.subscribeToStatus,
} } }));
import { FalProvider } from "./fal";
import { MERGE_MODEL, METADATA_MODEL } from "./ffmpeg";

beforeEach(() => {
  vi.clearAllMocks();
  sdk.submit.mockResolvedValue({ request_id: "mock-request" });
  sdk.status.mockResolvedValue({ status: "COMPLETED" });
  sdk.subscribeToStatus.mockResolvedValue({});
});
const provider = () => new FalProvider({ apiKey: "mock-only-no-network", usdBrlRate: 5.4 });

describe("fal FFmpeg queue contracts", () => {
  it("submits metadata with frame extraction instead of normalizing it as an image model", async () => {
    const handle = await provider().generate(METADATA_MODEL, { media_url: "https://fixture/clip.mp4", chain: { private: true } });
    expect(handle.model).toBe(METADATA_MODEL);
    expect(sdk.submit).toHaveBeenCalledWith(METADATA_MODEL, { input: { media_url: "https://fixture/clip.mp4", extract_frames: true }, webhookUrl: undefined });
  });
  it("submits merge URLs in order and preserves the first video's aspect ratio", async () => {
    await provider().generate(MERGE_MODEL, { video_urls: ["https://fixture/1", "https://fixture/2", "https://fixture/3"] });
    expect(sdk.submit).toHaveBeenCalledWith(MERGE_MODEL, { input: { video_urls: ["https://fixture/1", "https://fixture/2", "https://fixture/3"], resolution_aspect_ratio_video_index: 0 }, webhookUrl: undefined });
  });
  it("keeps pending metadata non-blocking", async () => {
    sdk.status.mockResolvedValueOnce({ status: "IN_PROGRESS" });
    expect(await provider().checkResult({ id: "mock-request", provider: "fal", model: METADATA_MODEL }, {})).toEqual({ state: "pending" });
    expect(sdk.result).not.toHaveBeenCalled(); expect(sdk.subscribeToStatus).not.toHaveBeenCalled();
  });
  it("preserves the measured duration and frame, without treating metadata as a generated image", async () => {
    sdk.result.mockResolvedValueOnce({ requestId: "mock-request", data: { media: { duration: 5.24, end_frame_url: "https://fixture/frame.jpg" } } });
    const result = await provider().checkResult({ id: "mock-request", provider: "fal", model: METADATA_MODEL }, {});
    expect(result).toMatchObject({ state: "done", result: { images: [], cost: { brl: 0 }, raw: { media: { duration: 5.24 } } } });
  });
  it("rejects missing duration and missing merge video instead of recording success", async () => {
    sdk.result.mockResolvedValueOnce({ requestId: "mock-request", data: { media: { end_frame_url: "https://fixture/frame.jpg" } } });
    await expect(provider().checkResult({ id: "mock-request", provider: "fal", model: METADATA_MODEL }, {})).rejects.toThrow(/duration/);
    sdk.result.mockResolvedValueOnce({ requestId: "mock-request", data: {} });
    await expect(provider().checkResult({ id: "mock-request", provider: "fal", model: MERGE_MODEL }, {})).rejects.toThrow(/video URL/);
  });
});
