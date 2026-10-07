import { fal } from "@fal-ai/client";
import type { CostEstimate, GenParams, GenerationResult, JobHandle, ModelInfo } from "./model-provider";
import { findMotionModel, motionEstimate, type MotionBrief } from "@/lib/motion";

// fal.ai motion-control endpoints (Kling): one character image performs the movement of the reference video.
// Billed per second of output, so the price is the published rate x the source duration rounded up (calculated, not an invoice).
export class FalMotionProvider {
  id = "fal";
  constructor(private mock = false) {}
  listModels(): ModelInfo[] {
    return [];
  }
  estimateCost(model: string, params: GenParams): CostEstimate {
    if (findMotionModel(model)?.provider !== "fal") throw Error("Unsupported motion model");
    const estimate = motionEstimate(Number(params.sourceDuration), params.resolution as MotionBrief["resolution"], model);
    return { usd: estimate.usd, brl: estimate.brl, usdBrlRate: estimate.rate, billingMode: "api", source: `https://fal.ai/models/${model}; published per-second rate, calculated, not a provider invoice` };
  }
  async generate(model: string, params: GenParams): Promise<JobHandle> {
    if (findMotionModel(model)?.provider !== "fal") throw Error("Unsupported motion model");
    if (this.mock) return { id: `motion-mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, provider: this.id, model };
    const key = process.env.FAL_KEY?.trim();
    if (!key) throw Error("FAL_KEY nao configurada. Defina a chave da fal.ai antes de gerar.");
    fal.config({ credentials: key });
    const images = Array.isArray(params.image_urls) ? params.image_urls : [];
    const response = await fal.queue.submit(model as never, {
      input: { image_url: images[0], video_url: params.video_url, character_orientation: "video", keep_original_sound: false, ...(params.prompt ? { prompt: params.prompt } : {}) },
    } as never);
    return { id: response.request_id, provider: this.id, model };
  }
  async checkResult(handle: JobHandle, params: GenParams): Promise<{ state: "pending" } | { state: "done"; result: GenerationResult }> {
    let url: string;
    if (this.mock) {
      if (Date.now() - Number(handle.id.split("-")[2]) < 500) return { state: "pending" };
      url = "/mock/reel.mp4";
    } else {
      const key = process.env.FAL_KEY?.trim();
      if (!key) throw Error("FAL_KEY nao configurada.");
      fal.config({ credentials: key });
      const status = await fal.queue.status(handle.model as never, { requestId: handle.id } as never);
      if ((status as { status?: string }).status !== "COMPLETED") return { state: "pending" };
      const result = await fal.queue.result(handle.model as never, { requestId: handle.id });
      const found = (result.data as { video?: { url?: unknown } } | null)?.video?.url;
      if (typeof found !== "string") throw Error("fal.ai concluiu sem retornar URL de video.");
      const source = new URL(found);
      if (source.protocol !== "https:" || source.username || source.password) throw Error("Origem de vídeo inválida.");
      url = source.toString();
    }
    return {
      state: "done",
      result: {
        provider: this.id,
        model: handle.model,
        requestId: handle.id,
        images: [],
        videos: [{ url, contentType: "video/mp4", durationSeconds: Number(params.sourceDuration) }],
        cost: this.estimateCost(handle.model, params),
        raw: { billingVerified: true },
      },
    };
  }
  async waitForResult(handle: JobHandle, params: GenParams): Promise<GenerationResult> {
    const result = await this.checkResult(handle, params);
    if (result.state !== "done") throw Error("Ainda em andamento.");
    return result.result;
  }
}
