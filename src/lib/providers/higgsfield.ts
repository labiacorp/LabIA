import { randomUUID } from "node:crypto";
import type {
  GenParams,
  GenerationResult,
  JobHandle,
  ModelInfo,
} from "./model-provider";
import { MOTION_MODEL, motionEstimate, type MotionBrief } from "@/lib/motion";
export class HiggsfieldProvider {
  id = "higgsfield";
  constructor(private mock = false) {}
  listModels(): ModelInfo[] {
    return [];
  }
  estimateCost(model: string, params: GenParams) {
    if (model !== MOTION_MODEL) throw Error("Unsupported motion model");
    const estimate = motionEstimate(
      Number(params.sourceDuration),
      params.resolution as MotionBrief["resolution"],
    );
    return {
      usd: estimate.usd,
      brl: estimate.brl,
      usdBrlRate: estimate.rate,
      billingMode: "api" as const,
    };
  }
  async generate(model: string, params: GenParams): Promise<JobHandle> {
    if (model !== MOTION_MODEL) throw Error("Unsupported motion model");
    if (this.mock)
      return {
        id: `motion-mock-${Date.now()}-${randomUUID()}`,
        provider: this.id,
        model,
      };
    const response = await fetch(`https://api.higgsfield.ai/${MOTION_MODEL}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${process.env.HF_CREDENTIALS}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: params.prompt,
        video_url: params.video_url,
        image_urls: params.image_urls,
        resolution: params.resolution,
      }),
      signal: AbortSignal.timeout(25000),
      redirect: "error",
    });
    if (!response.ok) throw Error("O provedor não confirmou o envio.");
    const body = await response.json();
    if (
      typeof body.request_id !== "string" ||
      !/^[\w-]{1,100}$/.test(body.request_id)
    )
      throw Error("O provedor não confirmou o pedido.");
    return { id: body.request_id, provider: this.id, model };
  }
  async checkResult(
    handle: JobHandle,
    params: GenParams,
  ): Promise<
    { state: "pending" } | { state: "done"; result: GenerationResult }
  > {
    let url: string;
    if (this.mock) {
      if (Date.now() - Number(handle.id.split("-")[2]) < 500)
        return { state: "pending" };
      url = "/mock/reel.mp4";
    } else {
      const response = await fetch(
        `https://api.higgsfield.ai/requests/${encodeURIComponent(handle.id)}/status`,
        {
          headers: { Authorization: `Key ${process.env.HF_CREDENTIALS}` },
          signal: AbortSignal.timeout(20000),
          cache: "no-store",
          redirect: "error",
        },
      );
      if (!response.ok) throw Error("Não foi possível consultar o vídeo.");
      const body = await response.json();
      if (["queued", "in_progress"].includes(body.status))
        return { state: "pending" };
      if (body.status !== "completed" || typeof body.video?.url !== "string")
        throw Error("O provedor não entregou um vídeo concluído.");
      const source = new URL(body.video.url);
      if (source.protocol !== "https:" || source.username || source.password)
        throw Error("Origem de vídeo inválida.");
      url = source.toString();
    }
    return {
      state: "done",
      result: {
        provider: this.id,
        model: handle.model,
        requestId: handle.id,
        images: [],
        videos: [
          {
            url,
            contentType: "video/mp4",
            durationSeconds: Number(params.sourceDuration),
          },
        ],
        cost: this.estimateCost(handle.model, params),
        raw: { billingVerified: this.mock },
      },
    };
  }
  async waitForResult(
    handle: JobHandle,
    params: GenParams,
  ): Promise<GenerationResult> {
    const result = await this.checkResult(handle, params);
    if (result.state !== "done") throw Error("Ainda em andamento.");
    return result.result;
  }
}
