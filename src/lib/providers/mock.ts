import { usdBrlRate } from "@/lib/fx";
import { FalProvider } from "./fal";
import { ffmpegResult, MERGE_MODEL, METADATA_MODEL } from "./ffmpeg";
import { findFalVideoModel } from "./fal-models";
import { findVideoDefinition, type VideoPricingSnapshot } from "./video-models";
import type { CostEstimate, GenParams, GenerationResult, JobHandle, ModelInfo, ModelKind, ModelProvider } from "./model-provider";

// Dev/test only (FAL_MOCK=1, never in production): no network, no spend. Prices come from the real catalog.
// Prompt switches simulate failures: "[mock-submit-error]" fails on submit, "[mock-fail]" fails the job.
const delayMs = () => Number(process.env.FAL_MOCK_DELAY_MS ?? 3500);
const prices = () => new FalProvider({ usdBrlRate: usdBrlRate() });

export class MockProvider implements ModelProvider {
  id = "fal";

  listModels(kind: ModelKind): ModelInfo[] {
    return prices().listModels(kind);
  }

  estimateCost(model: string, params: GenParams): CostEstimate {
    return prices().estimateCost(model, params);
  }

  validate(model: string, params: GenParams): void { prices().validateInput(model, params); }

  async generate(model: string, params: GenParams): Promise<JobHandle> {
    if (String(params.prompt).includes("[mock-submit-error]")) throw new Error("mock: falha de rede no envio");
    return { id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, provider: this.id, model };
  }

  async waitForResult(handle: JobHandle, params: GenParams): Promise<GenerationResult> {
    const done = await this.checkResult(handle, params, true);
    if (done.state !== "done") throw new Error("mock: ainda em andamento");
    return done.result;
  }

  async checkResult(handle: JobHandle, params: GenParams, skipDelay = false): Promise<{ state: "pending" } | { state: "done"; result: GenerationResult }> {
    const startedAt = Number(handle.id.split("-")[1]);
    if (!skipDelay && Date.now() - startedAt < delayMs()) return { state: "pending" };
    if (String(params.prompt).includes("[mock-fail]")) throw new Error("mock: o fal recusou o conteúdo");
    if (handle.model === METADATA_MODEL) {
      if (process.env.FAL_MOCK_METADATA_FAIL === "1") throw new Error("mock: metadata unavailable");
      const recipe = (params.chain as { recipe?: { pricing: VideoPricingSnapshot } } | undefined)?.recipe;
      return { state: "done", result: ffmpegResult(handle.model, handle.id, { media: {
        duration: Number(process.env.FAL_MOCK_VIDEO_DURATION ?? recipe?.pricing.requestedDuration ?? 5),
        resolution: { width: 1280, height: 720 }, end_frame_url: `/mock/portrait.svg?frame=${handle.id}`,
      } }) };
    }
    if (handle.model === MERGE_MODEL) return { state: "done", result: ffmpegResult(handle.model, handle.id, { video: { url: "/mock/reel.mp4" } }) };
    if (findVideoDefinition(handle.model) || findFalVideoModel(handle.model)) {
      const duration = Number(process.env.FAL_MOCK_VIDEO_DURATION ?? parseFloat(String(params.duration ?? 5)));
      return { state: "done", result: {
        provider: this.id, model: handle.model, requestId: handle.id, images: [],
        videos: [{ url: `/mock/clip.mp4?job=${handle.id}`, contentType: "video/mp4", durationSeconds: duration }],
        cost: params.videoPricing ? {
          usd: (params.videoPricing as VideoPricingSnapshot).quotedUsd, brl: (params.videoPricing as VideoPricingSnapshot).quotedBrl,
          usdBrlRate: (params.videoPricing as VideoPricingSnapshot).usdBrlRate, billingMode: "api", source: "Mock quote snapshot; pending metadata settlement",
        } : this.estimateCost(handle.model, findVideoDefinition(handle.model) ? params : { ...params, duration }), raw: {},
      } };
    }
    const sheet = params.aspect_ratio === "3:2";
    return {
      state: "done",
      result: {
        provider: this.id,
        model: handle.model,
        requestId: handle.id,
        images: [{ url: sheet ? "/mock/sheet.svg" : "/mock/portrait.svg", contentType: "image/svg+xml", width: sheet ? 1536 : 768, height: sheet ? 1024 : 1024 }],
        cost: prices().estimateActualCost(handle.model, params, [{ url: sheet ? "/mock/sheet.svg" : "/mock/portrait.svg" }]),
        raw: {},
      },
    };
  }
}
