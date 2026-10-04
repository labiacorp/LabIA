import type { VideoFormOption } from "@/app/(app)/i/[id]/c/[contentId]/video-form";
import { prepareVideo, VIDEO_DEFINITIONS } from "./providers/video-models";
import { REEL } from "./content-plan";

export type VideoSelection = { model: string; duration: number; resolution: string; audio: boolean; strategy: "clip" | "reel" };
export const videoUsdBrlRate = () => Number(process.env.USD_BRL_RATE) || 5.4;

export function getVideoOptions(source?: { width: number | null; height: number | null }): VideoFormOption[] {
  const options: VideoFormOption[] = VIDEO_DEFINITIONS.map((model) => {
    const configurations: VideoFormOption["configurations"] = [];
    let notice: string | undefined;
    for (const duration of model.durations) for (const resolution of model.resolutions) {
      const audios = model.audio === "optional" ? [true, false] : [model.audio === "included"];
      for (const audio of audios) {
        try {
          const prepared = prepareVideo(model.id, { prompt: "estimate", image_url: "https://estimate", duration, resolution, generate_audio: audio, image_width: source?.width, image_height: source?.height }, videoUsdBrlRate());
          configurations.push({ duration, resolution, audio, brl: prepared.cost.brl });
        } catch (error) { notice = error instanceof Error ? error.message : "Configuração não disponível."; }
      }
    }
    if (configurations.length) notice = undefined;
    if (model.durationAllowance) notice = "Estimativa inclui até 0,7s adicionais de saída e usa a tarifa regular, sem desconto promocional.";
    if (model.mayChargeFailure) notice = "Este modelo pode cobrar solicitações recusadas por sua política de conteúdo.";
    if (model.tokenRates && configurations.length) notice = "Estimativa reservada antes de gerar. O custo é calculado pelas dimensões e duração do vídeo pronto.";
    const convert = (rates: Record<string, number>) => Object.fromEntries(Object.entries(rates).map(([key, usd]) => [key, Math.round(usd * videoUsdBrlRate() * 10000) / 10000]));
    return { key: model.id, model: model.id, name: model.name, strategy: "clip", configurations, notice, pricing: {
      ratesBrl: convert(model.rates), audioRatesBrl: model.audioRates ? convert(model.audioRates) : undefined,
      baseFeesBrl: model.baseRates ? convert(model.baseRates) : undefined, imageFeeBrl: Math.round((model.imageUsd ?? 0) * videoUsdBrlRate() * 10000) / 10000,
      perClip: model.mapping === "hailuo" || model.billingUnit === "clip", approximate: !!model.tokenRates,
      checkedOn: model.verifiedOn ?? "2026-10-03", exchangeRate: videoUsdBrlRate(), source: `https://fal.ai/models/${model.id}`,
    } };
  });
  const legacy = prepareVideo(REEL.video.model, { prompt: "estimate", image_url: "https://estimate", duration: 5, resolution: "default", generate_audio: false }, videoUsdBrlRate());
  return [{ key: "legacy-reel", model: legacy.definition.id, name: "Kling 2.5 — sequência de 15s (3 clipes)", strategy: "reel", configurations: [{ duration: 15, resolution: "default", audio: false, brl: Math.round(legacy.cost.brl * 3 * 10000) / 10000 }], pricing: options.find((option) => option.model === REEL.video.model)?.pricing }, ...options];
}
