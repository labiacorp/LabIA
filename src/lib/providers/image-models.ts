import type { CostEstimate, GenParams } from "./model-provider";

// `textOnly` endpoints take no reference image (the character sheet, before a face exists); the others edit from the owned FRONT portrait.
// `estimated`: fal.ai bills this endpoint by token, so the rate is the published per-image figure for the sheet size, not an exact price.
type ImageDefinition = { id: string; name: string; mapping: "banana" | "seedream" | "kontext" | "qwen" | "gpt" | "grok" | "muse"; rates: Record<string, number>; maxPrompt?: number; textOnly?: true; estimated?: true };
export const IMAGE_DEFINITIONS: ImageDefinition[] = [
  { id: "fal-ai/nano-banana-2/edit", name: "Nano Banana 2", mapping: "banana", rates: { "0.5K": .06, "1K": .08, "2K": .12, "4K": .16 } },
  { id: "fal-ai/nano-banana-pro/edit", name: "Nano Banana Pro", mapping: "banana", rates: { "1K": .15, "2K": .15, "4K": .3 } },
  { id: "bytedance/seedream/v5/lite/edit", name: "Seedream 5.0 Lite", mapping: "seedream", rates: { "2K": .035, "3K": .035, "4K": .035 } },
  { id: "fal-ai/bytedance/seedream/v4.5/edit", name: "Seedream 4.5", mapping: "seedream", rates: { "2K": .04, "4K": .04 } },
  { id: "fal-ai/flux-pro/kontext", name: "FLUX.1 Kontext Pro", mapping: "kontext", rates: { default: .04 } },
  { id: "fal-ai/flux-pro/kontext/max", name: "FLUX.1 Kontext Max", mapping: "kontext", rates: { default: .08 } },
  { id: "fal-ai/qwen-image-max/edit", name: "Qwen Image Max", mapping: "qwen", rates: { "1K": .075, "2K": .075 }, maxPrompt: 800 },
  // Character-sheet models (text only). Ids and per-image rates audited against fal.ai on 2026-10-05; the order is the order shown.
  { id: "fal-ai/nano-banana-2", name: "Nano Banana 2", mapping: "banana", rates: { "0.5K": .06, "1K": .08, "2K": .12, "4K": .16 }, textOnly: true },
  { id: "openai/gpt-image-2.5/flare/text-to-image", name: "GPT Image 2.5 Flare", mapping: "gpt", rates: { low: .0047, medium: .0103, high: .0412, xhigh: .0738 }, textOnly: true, estimated: true },
  { id: "xai/grok-imagine-image/v2.0/text-to-image", name: "Grok Imagine 2.0", mapping: "grok", rates: { "1k/low": .04, "1k/medium": .06, "2k/low": .06, "2k/medium": .08 }, textOnly: true },
  { id: "meta/muse-image/text-to-image", name: "Muse Image", mapping: "muse", rates: { default: .01 }, textOnly: true },
  { id: "bytedance/seedream/v5/lite/text-to-image", name: "Seedream 5.0 Lite", mapping: "seedream", rates: { "2K": .035, "3K": .035, "4K": .035 }, textOnly: true },
  { id: "fal-ai/nano-banana-pro", name: "Nano Banana Pro", mapping: "banana", rates: { "1K": .15, "2K": .15, "4K": .3 }, textOnly: true },
];
export const SCENE_DEFINITIONS = IMAGE_DEFINITIONS.filter((item) => !item.textOnly);
export const SHEET_DEFINITIONS = IMAGE_DEFINITIONS.filter((item) => item.textOnly);
export const findImageDefinition = (id: string) => IMAGE_DEFINITIONS.find((item) => item.id === id);
export type ImagePricingSnapshot = { model: string; unitUsd: number; usdBrlRate: number; source: string; verifiedOn: string; estimated?: true };
const QUALITY_LABEL: Record<string, string> = { low: "baixa", medium: "média", high: "alta", xhigh: "máxima" };
// What the user reads for a quality key: "2k/medium" -> "2K · média", "high" -> "Alta", "default" -> "Definida pelo modelo".
export function qualityLabel(key: string) {
  if (key === "default") return "Definida pelo modelo";
  const [size, level] = key.includes("/") ? key.split("/") : [undefined, key];
  const text = QUALITY_LABEL[level] ?? level;
  return size ? `${size.toUpperCase()} · ${text}` : QUALITY_LABEL[level] ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}
// "0.5K" is the provider's wire value (512 px); people never read it. The request still sends "0.5K".
export function resolutionLabel(key: string) {
  return key === "0.5K" ? "512px" : key;
}
export function prepareImage(model: string, params: GenParams, usdBrlRate: number) {
  const definition = findImageDefinition(model);
  if (!definition) throw new Error("Modelo de imagem não disponível.");
  const prompt = typeof params.prompt === "string" ? params.prompt.trim() : "";
  const images = Array.isArray(params.image_urls) ? params.image_urls : [];
  const resolution = String(params.resolution ?? Object.keys(definition.rates)[0]);
  const aspect = String(params.aspect_ratio ?? "9:16");
  if (!prompt || prompt.length > (definition.maxPrompt ?? 4000)) throw new Error("Descrição maior que o limite deste modelo.");
  if (definition.textOnly ? images.length !== 0 : images.length !== 1 || typeof images[0] !== "string" || !images[0]) throw new Error(definition.textOnly ? "Este modelo gera só a partir do texto." : "Uma referência do personagem é obrigatória.");
  if (params.num_images !== undefined && params.num_images !== 1) throw new Error("Esta etapa gera uma imagem por vez.");
  if (!Object.hasOwn(definition.rates, resolution)) throw new Error("Qualidade não suportada por este modelo.");
  if (!["9:16", "16:9", "1:1", "3:4", "4:3", "3:2", "2:3", "4:5", "5:4", "21:9"].includes(aspect)) throw new Error("Proporção de imagem inválida.");
  if ((definition.mapping === "kontext" && ["4:5", "5:4"].includes(aspect)) || (definition.mapping === "grok" && ["4:5", "5:4", "21:9"].includes(aspect))) throw new Error("Este modelo não aceita esta proporção.");
  if (!Number.isFinite(usdBrlRate) || usdBrlRate <= 0) throw new Error("Cotação inválida.");
  const input: Record<string, unknown> = { prompt, num_images: 1, sync_mode: false, output_format: "png" };
  if (definition.mapping === "kontext") Object.assign(input, { aspect_ratio: aspect, safety_tolerance: "2" }, definition.textOnly ? {} : { image_url: images[0] });
  else if (!definition.textOnly) input.image_urls = images;
  if (definition.mapping === "banana") Object.assign(input, { aspect_ratio: aspect, resolution, limit_generations: true, enable_web_search: false, safety_tolerance: "4" });
  if (definition.mapping === "gpt" || definition.mapping === "muse" || definition.mapping === "grok") {
    if (definition.mapping === "gpt") {
      // No aspect_ratio field: a custom size at the ~1.5 MP the published rates are quoted for (3:2 is 1536x1024).
      const [x, y] = aspect.split(":").map(Number);
      input.image_size = { width: Math.round(Math.sqrt(1536 * 1024 * x / y) / 16) * 16, height: Math.round(Math.sqrt(1536 * 1024 * y / x) / 16) * 16 };
      input.quality = resolution;
    } else if (definition.mapping === "grok") {
      const [size, quality] = resolution.split("/");
      Object.assign(input, { aspect_ratio: aspect, resolution: size, quality });
    } else input.aspect_ratio = aspect;
  }
  if (definition.mapping === "seedream" || definition.mapping === "qwen") {
    const [x, y] = aspect.split(":").map(Number);
    const area = definition.mapping === "seedream" ? (resolution === "4K" ? 4096 ** 2 : resolution === "3K" ? 3072 ** 2 : 2048 ** 2) : (resolution === "2K" ? 2048 ** 2 : 1024 ** 2);
    input.image_size = { width: Math.floor(Math.sqrt(area * x / y) / 8) * 8, height: Math.floor(Math.sqrt(area * y / x) / 8) * 8 };
    input.enable_safety_checker = true;
    if (definition.mapping === "seedream") { input.max_images = 1; delete input.output_format; }
  }
  const snapshot: ImagePricingSnapshot = { model, unitUsd: definition.rates[resolution], usdBrlRate, source: `https://fal.ai/models/${model}`, verifiedOn: "2026-10-05", ...(definition.estimated ? { estimated: true as const } : {}) };
  return { definition, input, snapshot, cost: imageCost(snapshot, 1) };
}
export function imageCost(snapshot: ImagePricingSnapshot, quantity: number): CostEstimate {
  const usd = snapshot.unitUsd * quantity;
  return { usd, brl: Math.round(usd * snapshot.usdBrlRate * 10000) / 10000, usdBrlRate: snapshot.usdBrlRate, billingMode: "api", source: `${snapshot.source}; published per-image rate, ${snapshot.verifiedOn}; ${snapshot.estimated ? "estimate (token-billed), " : ""}calculated, not a provider invoice` };
}
