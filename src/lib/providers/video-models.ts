import type { CostEstimate, GenParams, GeneratedAsset } from "./model-provider";

type Mapping = "grok" | "seedance" | "kling25" | "kling3" | "klingTurbo" | "wan25" | "wan3" | "veo" | "hailuo" | "ltx" | "generic";
export type VideoDefinition = {
  id: string; name: string; mapping: Mapping; durations: number[]; resolutions: string[];
  audio: "optional" | "included" | "none"; clipRates?: Record<string, Record<string, number>>; baseRates?: Record<string, number>; audioDurations?: number[]; rates: Record<string, number>; audioRates?: Record<string, number>;
  imageLimits?: { minimum: number; minRatio: number; maxRatio: number }; wire?: { imageField?: string; durationType?: "number" | "string"; audioField?: string; resolutionUppercase?: boolean; omitResolution?: boolean; omitDuration?: boolean; defaults?: Record<string, unknown> }; billingUnit?: "clip"; durationAllowance?: number; billingDuration?: "requested" | "measured"; imageUsd?: number; tokenRates?: Record<string, number>; mayChargeFailure?: boolean; verifiedOn?: string;
};
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const seedance = { mapping: "seedance", durations: range(4, 30), resolutions: ["720p", "480p", "1080p"], audio: "optional" } as const;

// Each entry is an exact reviewed I2V endpoint. Add a definition and contract tests; transport/ledger stay shared.
// Public fal.ai endpoint schema/pricing checked 2026-10-03. No endpoint is claimed real-verified.
export const VIDEO_DEFINITIONS: VideoDefinition[] = [
  { id: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video", name: "Kling 2.5 Turbo Pro", mapping: "kling25", durations: [5, 10], resolutions: ["default"], audio: "none", rates: { default: 0.07 } },
  { id: "xai/grok-imagine-video/v1.5/lite/image-to-video", name: "Grok Imagine 1.5 Lite", mapping: "grok", durations: range(1, 15), resolutions: ["720p", "480p", "1080p"], audio: "included", rates: { "480p": 0.02, "720p": 0.03, "1080p": 0.14 }, imageUsd: 0.01, mayChargeFailure: true },
  { id: "xai/grok-imagine-video/v1.5/image-to-video", name: "Grok Imagine 1.5", mapping: "grok", durations: range(1, 15), resolutions: ["720p", "480p", "1080p"], audio: "included", rates: { "480p": 0.08, "720p": 0.14, "1080p": 0.25 }, imageUsd: 0.01, mayChargeFailure: true },
  { ...seedance, durations: [...seedance.durations], resolutions: [...seedance.resolutions], id: "bytedance/seedance-2.5/image-to-video", name: "Seedance 2.5", rates: { "480p": 0.2205, "720p": 0.473, "1080p": 1.164 }, tokenRates: { "480p": 0.0214, "720p": 0.0214, "1080p": 0.0234 } },
  { ...seedance, durations: [...seedance.durations], resolutions: [...seedance.resolutions], id: "bytedance/seedance-2.5/us/image-to-video", name: "Seedance 2.5 US", rates: { "480p": 0.2646, "720p": 0.5676, "1080p": 1.396278 }, tokenRates: { "480p": 0.02568, "720p": 0.02568, "1080p": 0.02808 } },
  { id: "fal-ai/kling-video/v3/pro/image-to-video", name: "Kling 3 Pro", mapping: "kling3", durations: range(3, 15), resolutions: ["default"], audio: "optional", rates: { default: 0.112 }, audioRates: { default: 0.168 } },
  { id: "fal-ai/kling-video/v3/turbo/pro/image-to-video", name: "Kling 3 Turbo Pro", mapping: "klingTurbo", durations: range(3, 15), resolutions: ["default"], audio: "included", rates: { default: 0.14 } },
  { id: "alibaba/wan-3.0/image-to-video", name: "Wan 3.0", mapping: "wan3", durations: [5, 10, 15], resolutions: ["720p", "480p", "1080p"], audio: "optional", rates: { "480p": 0.05, "720p": 0.1, "1080p": 0.2 } },
  { id: "wan/v2.6/image-to-video", name: "Wan 2.6", mapping: "wan25", durations: [5, 10, 15], resolutions: ["720p", "1080p"], audio: "none", rates: { "720p": 0.1, "1080p": 0.15 } },
  { id: "fal-ai/wan-25-preview/image-to-video", name: "Wan 2.5", mapping: "wan25", durations: [5, 10], resolutions: ["1080p", "720p", "480p"], audio: "none", rates: { "480p": 0.05, "720p": 0.1, "1080p": 0.15 } },
  { id: "fal-ai/veo3.1/image-to-video", name: "Veo 3.1", mapping: "veo", durations: [4, 6, 8], resolutions: ["720p", "1080p", "4k"], audio: "optional", rates: { "720p": 0.2, "1080p": 0.2, "4k": 0.4 }, audioRates: { "720p": 0.4, "1080p": 0.4, "4k": 0.6 } },
  { id: "lightricks/ltx-2.5/image-to-video/pro", name: "LTX 2.5 Pro", mapping: "ltx", durations: [6, 8, 10], resolutions: ["1080p", "720p"], audio: "optional", rates: { "720p": 0.12, "1080p": 0.17 } },
  { id: "fal-ai/minimax/hailuo-2.3/standard/image-to-video", name: "Hailuo 2.3 Standard", mapping: "hailuo", durations: [6, 10], resolutions: ["default"], audio: "none", rates: { "6": 0.28, "10": 0.56 } },
  {"id": "fal-ai/pixverse/v6/image-to-video", "name": "PixVerse V6", "mapping": "generic", "durations": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], "resolutions": ["720p", "360p", "540p", "1080p"], "audio": "optional", "rates": {"360p": 0.025, "540p": 0.035, "720p": 0.045, "1080p": 0.09}, "audioRates": {"360p": 0.035, "540p": 0.045, "720p": 0.06, "1080p": 0.115}, "wire": {"imageField": "image_url", "durationType": "number", "audioField": "generate_audio_switch", "defaults": {"resolution": "720p", "duration": 5}}, "billingDuration": "measured", "verifiedOn": "2026-10-04"},
  {"id": "fal-ai/pixverse/c1/image-to-video", "name": "PixVerse C1", "mapping": "generic", "durations": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], "resolutions": ["720p", "360p", "540p", "1080p"], "audio": "optional", "rates": {"360p": 0.03, "540p": 0.04, "720p": 0.05, "1080p": 0.095}, "audioRates": {"360p": 0.04, "540p": 0.05, "720p": 0.065, "1080p": 0.12}, "wire": {"imageField": "image_url", "durationType": "number", "audioField": "generate_audio_switch", "defaults": {"resolution": "720p", "duration": 5}}, "billingDuration": "measured", "verifiedOn": "2026-10-04"},
  {"id": "fal-ai/vidu/q3/image-to-video", "name": "Vidu Q3", "mapping": "generic", "durations": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], "resolutions": ["720p", "360p", "540p", "1080p"], "audio": "optional", "rates": {"360p": 0.07, "540p": 0.07, "720p": 0.154, "1080p": 0.154}, "wire": {"imageField": "image_url", "durationType": "number", "audioField": "audio", "defaults": {"duration": 5, "resolution": "720p", "audio": true}}, "billingDuration": "measured", "verifiedOn": "2026-10-04"},
  {"id": "fal-ai/vidu/q3/image-to-video/turbo", "name": "Vidu Q3 Turbo", "mapping": "generic", "durations": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16], "resolutions": ["720p", "360p", "540p", "1080p"], "audio": "optional", "rates": {"360p": 0.035, "540p": 0.035, "720p": 0.077, "1080p": 0.077}, "wire": {"imageField": "image_url", "durationType": "number", "audioField": "audio", "defaults": {"duration": 5, "resolution": "720p", "audio": true}}, "billingDuration": "measured", "verifiedOn": "2026-10-04"},
  {"id": "alibaba/happy-horse/v1.1/image-to-video", "name": "Happy Horse 1.1", "mapping": "generic", "durations": [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], "resolutions": ["1080p", "720p"], "audio": "included", "rates": {"720p": 0.14, "1080p": 0.18}, "imageLimits": {"minimum": 300, "minRatio": 0.4, "maxRatio": 2.5}, "wire": {"imageField": "image_url", "durationType": "number", "defaults": {"duration": 5, "resolution": "1080p", "enable_safety_checker": true}}, "billingDuration": "measured", "verifiedOn": "2026-10-04"},
  {"id": "minimax/h3-max/image-to-video", "name": "MiniMax H3 Max", "mapping": "generic", "durations": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], "resolutions": ["480p", "768p", "1080p"], "audio": "included", "rates": {"480p": 0.05, "768p": 0.08, "1080p": 0.16}, "durationAllowance": 0.7, "billingDuration": "measured", "wire": {"imageField": "image_url", "durationType": "number", "audioField": "target_audio_url", "resolutionUppercase": true, "defaults": {"prompt_expansion_mode": "balanced"}}, "verifiedOn": "2026-10-04"},
  {"id": "minimax/h3-max-turbo/image-to-video", "name": "MiniMax H3 Max Turbo", "mapping": "generic", "durations": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], "resolutions": ["480p", "768p", "1080p"], "audio": "included", "rates": {"480p": 0.025, "768p": 0.04, "1080p": 0.08}, "durationAllowance": 0.7, "billingDuration": "measured", "wire": {"imageField": "image_url", "durationType": "number", "audioField": "target_audio_url", "resolutionUppercase": true, "defaults": {"prompt_expansion_mode": "balanced"}}, "verifiedOn": "2026-10-04"},
  {"id": "fal-ai/minimax/hailuo-02/standard/image-to-video", "name": "MiniMax Hailuo-02 Standard", "mapping": "generic", "durations": [6, 10], "resolutions": ["512p", "768p"], "audio": "none", "rates": {"512p": 0.017, "768p": 0.045}, "billingDuration": "measured", "wire": {"imageField": "image_url", "durationType": "string", "resolutionUppercase": true, "defaults": {"prompt_optimizer": true}}, "verifiedOn": "2026-10-04"},
  {"id": "fal-ai/minimax/hailuo-02-fast/image-to-video", "name": "MiniMax Hailuo-02 Fast", "mapping": "generic", "durations": [6, 10], "resolutions": ["512p"], "audio": "none", "rates": {"512p": 0.017}, "billingDuration": "measured", "wire": {"imageField": "image_url", "durationType": "string", "omitResolution": true, "defaults": {"prompt_optimizer": true}}, "verifiedOn": "2026-10-04"},
  {"id": "minimax/h3/image-to-video", "name": "MiniMax H3", "mapping": "generic", "durations": [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], "resolutions": ["480p", "768p", "2k", "4k"], "audio": "included", "rates": {"480p": 0.05, "768p": 0.06, "2k": 0.13, "4k": 0.16}, "billingDuration": "measured", "wire": {"imageField": "image_url", "durationType": "number", "audioField": "target_audio_url", "resolutionUppercase": true, "defaults": {"resolution": "2K", "duration": 5}}, "verifiedOn": "2026-10-04"},
  {"id": "google/gemini-omni-flash/v1.1/image-to-video", "name": "Gemini Omni Flash 1.1", "mapping": "generic", "durations": [3, 4, 5, 6, 7, 8, 9, 10], "resolutions": ["720p", "360p", "1080p", "4k"], "audio": "included", "rates": {"360p": 0.03, "720p": 0.1, "1080p": 0.15, "4k": 0.3}, "wire": {"imageField": "image_url", "durationType": "number", "defaults": {"duration": 8, "resolution": "720p", "aspect_ratio": "16:9"}}, "billingDuration": "measured", "verifiedOn": "2026-10-04"},
  {"id": "fal-ai/minimax/hailuo-02/pro/image-to-video", "name": "MiniMax Hailuo-02 Pro", "mapping": "generic", "durations": [6], "resolutions": ["1080p"], "audio": "none", "rates": {"6": 0.48}, "billingUnit": "clip", "wire": {"imageField": "image_url", "durationType": "string", "omitDuration": true, "omitResolution": true, "defaults": {"prompt_optimizer": true}}, "verifiedOn": "2026-10-04"},
  {"id": "fal-ai/minimax/hailuo-2.3-fast/standard/image-to-video", "name": "Hailuo 2.3 Fast Standard", "mapping": "generic", "durations": [6, 10], "resolutions": ["768p"], "audio": "none", "rates": {"6": 0.19, "10": 0.32}, "billingUnit": "clip", "wire": {"imageField": "image_url", "durationType": "string", "omitResolution": true, "defaults": {"prompt_optimizer": true}}, "verifiedOn": "2026-10-04"},
  {"id": "fal-ai/minimax/video-01-director/image-to-video", "name": "MiniMax Video-01 Director", "mapping": "generic", "durations": [6], "resolutions": ["720p"], "audio": "none", "rates": {"6": 0.5}, "billingUnit": "clip", "wire": {"imageField": "image_url", "durationType": "number", "omitDuration": true, "omitResolution": true, "defaults": {"prompt_optimizer": true}}, "verifiedOn": "2026-10-04"},
  {"id": "fal-ai/minimax/video-01-live/image-to-video", "name": "MiniMax Video-01 Live", "mapping": "generic", "durations": [6], "resolutions": ["default"], "audio": "none", "rates": {"6": 0.5}, "billingUnit": "clip", "wire": {"imageField": "image_url", "durationType": "number", "omitDuration": true, "omitResolution": true, "defaults": {"prompt_optimizer": true}}, "verifiedOn": "2026-10-04"},
  {"id": "fal-ai/minimax/video-01/image-to-video", "name": "MiniMax Video-01", "mapping": "generic", "durations": [6], "resolutions": ["720p"], "audio": "none", "rates": {"6": 0.5}, "billingUnit": "clip", "wire": {"imageField": "image_url", "durationType": "number", "omitDuration": true, "omitResolution": true, "defaults": {"prompt_optimizer": true}}, "verifiedOn": "2026-10-04"},
  {"id": "fal-ai/veo3.1/fast/image-to-video", "name": "Veo 3.1 Fast", "mapping": "veo", "durations": [4, 6, 8], "resolutions": ["720p", "1080p", "4k"], "audio": "optional", "rates": {"720p": 0.1, "1080p": 0.1, "4k": 0.3}, "audioRates": {"720p": 0.15, "1080p": 0.15, "4k": 0.35}, "wire": {"omitDuration": false, "omitResolution": false}, "verifiedOn": "2026-10-04"},
  {"id": "fal-ai/wan-pro/image-to-video", "name": "Wan 2.1 Pro", "mapping": "generic", "durations": [6], "resolutions": ["1080p"], "audio": "none", "rates": {"6": 0.8}, "billingUnit": "clip", "wire": {"omitDuration": true, "omitResolution": true}, "verifiedOn": "2026-10-04"},
  {"id": "fal-ai/vidu/q2/image-to-video/pro", "name": "Vidu Q2 Pro", "mapping": "generic", "durations": [2, 3, 4, 5, 6, 7, 8], "resolutions": ["720p", "1080p"], "audio": "optional", "rates": {"720p": 0.05, "1080p": 0.1}, "baseRates": {"720p": 0.1, "1080p": 0.3}, "audioDurations": [4], "wire": {"imageField": "image_url", "durationType": "number", "audioField": "bgm", "defaults": {"duration": 4, "resolution": "720p", "movement_amplitude": "auto", "bgm": false}}, "billingDuration": "measured", "verifiedOn": "2026-10-04"},
  {"id": "fal-ai/vidu/q2/image-to-video/turbo", "name": "Vidu Q2 Turbo", "mapping": "generic", "durations": [2, 3, 4, 5, 6, 7, 8], "resolutions": ["720p", "1080p"], "audio": "optional", "rates": {"720p": 0.05, "1080p": 0.05}, "baseRates": {"720p": 0, "1080p": 0.2}, "audioDurations": [4], "wire": {"imageField": "image_url", "durationType": "number", "audioField": "bgm", "defaults": {"duration": 4, "resolution": "720p", "movement_amplitude": "auto", "bgm": false}}, "billingDuration": "measured", "verifiedOn": "2026-10-04"},
  {"id": "fal-ai/pixverse/v3.5/image-to-video", "name": "PixVerse 3.5", "mapping": "generic", "durations": [5], "resolutions": ["720p", "360p", "540p", "1080p"], "audio": "none", "rates": {}, "clipRates": {"5": {"360p": 0.15, "540p": 0.15, "720p": 0.2, "1080p": 0.4}}, "billingUnit": "clip", "wire": {"durationType": "string"}, "verifiedOn": "2026-10-04"},
  {"id": "fal-ai/pixverse/v4/image-to-video", "name": "PixVerse 4", "mapping": "generic", "durations": [5], "resolutions": ["720p", "360p", "540p", "1080p"], "audio": "none", "rates": {}, "clipRates": {"5": {"360p": 0.15, "540p": 0.15, "720p": 0.2, "1080p": 0.4}}, "billingUnit": "clip", "wire": {"durationType": "string"}, "verifiedOn": "2026-10-04"},
  {"id": "fal-ai/pixverse/v5/image-to-video", "name": "PixVerse 5", "mapping": "generic", "durations": [5], "resolutions": ["720p", "360p", "540p", "1080p"], "audio": "none", "rates": {}, "clipRates": {"5": {"360p": 0.15, "540p": 0.15, "720p": 0.2, "1080p": 0.4}}, "billingUnit": "clip", "wire": {"durationType": "string"}, "verifiedOn": "2026-10-04"},
];

export type VideoPricingSnapshot = {
  version: 1; model: string; rule: "second" | "clip" | "token" | "kling25" | "requested";
  usdBrlRate: number; unitUsd: number; imageUsd: number; requestedDuration: number;
  quotedUsd: number; quotedBrl: number; source: string; verifiedOn: string;
};
const round4 = (value: number) => Math.round(value * 10000) / 10000;
export const findVideoDefinition = (id: string) => VIDEO_DEFINITIONS.find((entry) => entry.id === id);

export function prepareVideo(model: string, params: GenParams, usdBrlRate: number) {
  const definition = findVideoDefinition(model);
  if (!definition) throw new Error("Modelo de vídeo não disponível.");
  const prompt = typeof params.prompt === "string" ? params.prompt.trim() : "";
  const image = typeof params.image_url === "string" ? params.image_url : "";
  const duration = Number(params.duration ?? definition.durations.find((value) => value === 5) ?? definition.durations[0]);
  const resolution = String(params.resolution ?? definition.resolutions[0]);
  if (!prompt || prompt.length > 2000) throw new Error("Descreva o movimento em até 2.000 caracteres.");
  if (!image) throw new Error("A imagem da cena é obrigatória.");
  if (!definition.durations.includes(duration)) throw new Error("Duração não suportada por este modelo.");
  if (!definition.resolutions.includes(resolution)) throw new Error("Resolução não suportada por este modelo.");
  if (params.generate_audio !== undefined && typeof params.generate_audio !== "boolean") throw new Error("Opção de áudio inválida.");
  const audio = definition.audio === "optional" ? (params.generate_audio as boolean | undefined) ?? true : definition.audio === "included";
  if (definition.audio !== "optional" && params.generate_audio !== undefined && params.generate_audio !== audio) throw new Error("Este modelo não permite alterar o áudio.");
  if (!Number.isFinite(usdBrlRate) || usdBrlRate <= 0) throw new Error("Câmbio inválido.");
  if (definition.tokenRates) {
    const width = Number(params.image_width), height = Number(params.image_height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) throw new Error("A imagem precisa ter dimensões conhecidas para cotar Seedance.");
    const ratio = width / height;
    if (ratio < 9 / 16 || ratio > 16 / 9) throw new Error("Para Seedance, use uma imagem entre 9:16 e 16:9.");
  }
  if (definition.imageLimits) {
    const width = Number(params.image_width), height = Number(params.image_height);
    const { minimum, minRatio, maxRatio } = definition.imageLimits;
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < minimum || height < minimum || width / height < minRatio || width / height > maxRatio) throw new Error("Este modelo precisa de imagem com ao menos 300px e proporção entre 1:2,5 e 2,5:1.");
  }
  if (audio && definition.audioDurations && !definition.audioDurations.includes(duration)) throw new Error("Áudio não disponível nesta duração.");
  const rate = (audio && definition.audioRates ? definition.audioRates : definition.rates)[resolution];
  const rule = (definition.mapping === "hailuo" || definition.billingUnit === "clip") ? "clip" : definition.billingDuration === "requested" ? "requested" : definition.tokenRates ? "token" : definition.mapping === "kling25" ? "kling25" : "second";
  // Seedance's published per-second figures conservatively reserve the common 16:9 frame area.
  // Only the bounded source ratios above are enabled. Settlement uses measured frame area/token pricing.
  const quotedUsd = (rule === "clip" ? (definition.clipRates?.[String(duration)]?.[resolution] ?? definition.rates[String(duration)]) : (duration + (definition.durationAllowance ?? 0)) * rate) + (definition.imageUsd ?? 0) + (definition.baseRates?.[resolution] ?? 0);
  if (!Number.isFinite(quotedUsd) || quotedUsd < 0) throw new Error("Preço indisponível para esta configuração.");
  const snapshot: VideoPricingSnapshot = {
    version: 1, model, rule, usdBrlRate, unitUsd: definition.tokenRates?.[resolution] ?? (rule === "clip" ? quotedUsd - (definition.imageUsd ?? 0) - (definition.baseRates?.[resolution] ?? 0) : rate),
    imageUsd: (definition.imageUsd ?? 0) + (definition.baseRates?.[resolution] ?? 0), requestedDuration: duration, quotedUsd, quotedBrl: round4(quotedUsd * usdBrlRate),
    source: `https://fal.ai/models/${model}`, verifiedOn: definition.verifiedOn ?? "2026-10-03",
  };
  const input: Record<string, unknown> = { ...definition.wire?.defaults, prompt };
  input[definition.wire?.imageField ?? (definition.mapping === "kling3" || definition.mapping === "wan3" ? "start_image_url" : "image_url")] = image;
  input.duration = definition.wire?.durationType === "number" ? duration : definition.mapping === "veo" ? `${duration}s` : ["grok", "wan3", "ltx"].includes(definition.mapping) ? duration : String(duration);
  if (definition.wire?.omitDuration) delete input.duration;
  if (resolution !== "default" && !definition.wire?.omitResolution) input.resolution = definition.wire?.resolutionUppercase ? resolution.toUpperCase() : resolution;
  if (definition.audio === "optional") input[definition.wire?.audioField ?? (definition.mapping === "wan3" ? "audio" : "generate_audio")] = audio;
  if (definition.mapping === "ltx") { input.fps = 25; input.aspect_ratio = "auto"; }
  if (definition.mapping === "seedance") input.aspect_ratio = "auto";
  if (definition.mapping === "kling25" || definition.mapping === "kling3") {
    input.negative_prompt = "blur, distort, and low quality"; input.cfg_scale = 0.5;
  }
  if (definition.mapping === "hailuo") input.prompt_optimizer = true;
  const cost: CostEstimate = { usd: quotedUsd, brl: snapshot.quotedBrl, usdBrlRate, billingMode: "api", source: `${snapshot.source}; estimate, ${snapshot.verifiedOn}` };
  return { definition, input, snapshot, cost };
}

// Calculate from measured output using the immutable quote rules. This is a calculation, not an invoice.
export function settleVideo(snapshot: VideoPricingSnapshot, video: GeneratedAsset): CostEstimate {
  const duration = Number(video.durationSeconds);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("Duração do vídeo não verificada.");
  let quantity = snapshot.rule === "requested" ? snapshot.requestedDuration : duration;
  if (snapshot.rule === "token") {
    if (!video.width || !video.height || video.width <= 0 || video.height <= 0) throw new Error("Dimensões do vídeo não verificadas.");
    quantity = video.width * video.height * duration * 24 / 1024 / 1000;
  }
  if (snapshot.rule === "clip") quantity = 1;
  if (snapshot.rule === "kling25") quantity = Math.max(5, duration);
  const usd = quantity * snapshot.unitUsd + snapshot.imageUsd;
  return { usd, brl: round4(usd * snapshot.usdBrlRate), usdBrlRate: snapshot.usdBrlRate, billingMode: "api", source: `${snapshot.source}; measured output × quote snapshot (${snapshot.verifiedOn}), not a provider invoice` };
}
