import { FalProvider } from "./fal";
import type { CostEstimate, GenParams, GenerationResult, JobHandle, ModelInfo, ModelKind, ModelProvider } from "./model-provider";

// Dev/test only (FAL_MOCK=1, never in production): no network, no spend. Prices come from the real catalog.
// Prompt switches simulate failures: "[mock-submit-error]" fails on submit, "[mock-fail]" fails the job.
const delayMs = () => Number(process.env.FAL_MOCK_DELAY_MS ?? 3500);
const prices = () => new FalProvider({ usdBrlRate: Number(process.env.USD_BRL_RATE) || 5.4 });

export class MockProvider implements ModelProvider {
  id = "fal";

  listModels(kind: ModelKind): ModelInfo[] {
    return prices().listModels(kind);
  }

  estimateCost(model: string, params: GenParams): CostEstimate {
    return prices().estimateCost(model, params);
  }

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
    const sheet = params.aspect_ratio === "3:2";
    return {
      state: "done",
      result: {
        provider: this.id,
        model: handle.model,
        requestId: handle.id,
        images: [{ url: sheet ? "/mock/sheet.svg" : "/mock/portrait.svg", contentType: "image/svg+xml", width: sheet ? 1536 : 768, height: sheet ? 1024 : 1024 }],
        cost: this.estimateCost(handle.model, params),
        raw: {},
      },
    };
  }
}
