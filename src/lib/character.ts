import { usdBrlRate } from "@/lib/fx";
import type { AssetRole } from "@/generated/prisma/enums";
import { quote } from "@/lib/generation";
import { chargeBrl } from "@/lib/plan";
import { prepareImage, SCENE_DEFINITIONS, SHEET_DEFINITIONS } from "@/lib/providers/image-models";
import { renderPrompt, type PromptTemplates } from "@/lib/prompts";

export type CharacterCard = { name: string; role: string; mood: string; visualSignature: string; persona: string };
export type KitItem = { role: AssetRole; model: string; params: Record<string, unknown> };

// `prompt`: the user's edited text; empty or missing means the standard prompt built from the character card.
export type SheetSelection = { model: string; resolution: string; prompt?: string };
export const DEFAULT_SHEET: SheetSelection = { model: "fal-ai/nano-banana-2", resolution: "2K" };
const PORTRAIT_MODEL = "fal-ai/nano-banana-2/edit";
export const PORTRAIT_ROLES = ["FRONT", "PROFILE", "DETAIL"] as const;

export const ROLE_LABEL: Record<AssetRole, string> = {
  SHEET: "Ficha completa",
  FRONT: "Retrato de frente",
  PROFILE: "Perfil",
  DETAIL: "Detalhes",
};

function cardVars(card: CharacterCard) {
  return { identity: identity(card), name: card.name, role: card.role, mood: card.mood, visualSignature: card.visualSignature || "-" };
}
function identity(card: CharacterCard) {
  const parts = [`${card.name}, ${card.role}`, `mood: ${card.mood}`];
  if (card.visualSignature) parts.push(`always looks like: ${card.visualSignature}`);
  if (card.persona) parts.push(card.persona);
  return parts.join(". ");
}

// One image with the whole kit, in the layout the founders use (turnaround, hero, poses, expressions, details, ID block).
export function sheetItem(card: CharacterCard, selection: SheetSelection = DEFAULT_SHEET, templates: PromptTemplates = {}): KitItem {
  const standard = renderPrompt("sheet", cardVars(card), templates);
  const prompt = selection.prompt?.trim() || standard;
  const item: KitItem = { role: "SHEET", model: selection.model, params: { prompt, aspect_ratio: "3:2", resolution: selection.resolution } };
  // Validates the model/quality pair and captures the per-image price used to settle the step.
  item.params.imagePricing = prepareImage(item.model, item.params, usdBrlRate()).snapshot;
  return item;
}

// Create-influencer flow (design): four face previews from the description, then the sheet made from the approved
// face, so every later image keeps that face. Previews are CHARACTER steps with no role until one is approved.
export const PREVIEW = { model: "bytedance/seedream/v5/lite/text-to-image", resolution: "2K", count: 4 } as const;
export const SHEET_FROM_FACE_MODEL = "fal-ai/nano-banana-2/edit";
// The quality a model opens on when the user only picks the model: 2K, else 1K, else the middle level, else its only one.
export function defaultResolution(rates: Record<string, number>) {
  const keys = Object.keys(rates);
  return ["2K", "1K", "medium", "1k/medium", "default"].find((key) => keys.includes(key)) ?? keys[0];
}
export function previewItems(card: Pick<CharacterCard, "name" | "role" | "visualSignature">, templates: PromptTemplates = {}, model: string = PREVIEW.model): KitItemPlan[] {
  const prompt = renderPrompt("face-preview", { role: card.role, visualSignature: card.visualSignature }, templates);
  const definition = SHEET_DEFINITIONS.find((item) => item.id === model);
  if (!definition) throw new Error("Modelo de imagem não disponível.");
  const resolution = model === PREVIEW.model ? PREVIEW.resolution : defaultResolution(definition.rates);
  return Array.from({ length: PREVIEW.count }, () => {
    const params: Record<string, unknown> = { prompt, aspect_ratio: "4:5", resolution };
    params.imagePricing = prepareImage(model, params, usdBrlRate()).snapshot;
    return { role: null, model, params };
  });
}
export function sheetFromFaceItem(card: CharacterCard, faceUrl: string, templates: PromptTemplates = {}, model: string = SHEET_FROM_FACE_MODEL): KitItem {
  const sheet = String(sheetItem(card, DEFAULT_SHEET, templates).params.prompt);
  const prompt = renderPrompt("sheet-from-face", { ...cardVars(card), sheet }, templates);
  const definition = SCENE_DEFINITIONS.find((item) => item.id === model);
  if (!definition) throw new Error("Modelo de imagem não disponível.");
  const params: Record<string, unknown> = { prompt, image_urls: [faceUrl], aspect_ratio: "3:2", resolution: model === SHEET_FROM_FACE_MODEL ? "2K" : defaultResolution(definition.rates) };
  params.imagePricing = prepareImage(model, params, usdBrlRate()).snapshot;
  return { role: "SHEET", model, params };
}
// Side portrait made straight from the approved face (the face itself is the front one), so the kit is ready at creation.
export function profileFromFaceItem(card: CharacterCard, faceUrl: string, templates: PromptTemplates = {}): KitItem {
  const prompt = renderPrompt("profile-from-face", { ...cardVars(card), shot: PORTRAIT_SPEC.PROFILE.text }, templates);
  const params: Record<string, unknown> = { prompt, image_urls: [faceUrl], aspect_ratio: PORTRAIT_SPEC.PROFILE.aspect, resolution: "1K" };
  params.imagePricing = prepareImage(PORTRAIT_MODEL, params, usdBrlRate()).snapshot;
  return { role: "PROFILE", model: PORTRAIT_MODEL, params };
}
type KitItemPlan = { role: AssetRole | null; model: string; params: Record<string, unknown> };

// Models offered while creating an influencer, each with the server-computed price of what it would charge (invalid pairs are left out).
export type ModelChoice = { model: string; name: string; brl: number };
export function previewChoices(card: Pick<CharacterCard, "name" | "role" | "visualSignature">, templates: PromptTemplates = {}): ModelChoice[] {
  return SHEET_DEFINITIONS.flatMap((item) => { try { return [{ model: item.id, name: item.name, brl: quote(previewItems(card, templates, item.id)).totalBrl }]; } catch { return []; } });
}
export function sheetFromFaceChoices(card: CharacterCard, templates: PromptTemplates = {}): ModelChoice[] {
  return SCENE_DEFINITIONS.flatMap((item) => { try { return [{ model: item.id, name: item.name, brl: quote([sheetFromFaceItem(card, "https://estimate", templates, item.id), profileFromFaceItem(card, "https://estimate", templates)]).totalBrl }]; } catch { return []; } });
}

// Every text-to-image model and quality that can take this sheet prompt, priced by the server (invalid pairs are left out).
export function getSheetOptions(card: CharacterCard, templates: PromptTemplates = {}) {
  return SHEET_DEFINITIONS.map((model) => ({
    model: model.id,
    name: model.name,
    estimated: model.estimated === true,
    maxPrompt: model.maxPrompt ?? 4000,
    configurations: Object.keys(model.rates).flatMap((resolution) => {
      try { return [{ resolution, brl: quote([sheetItem(card, { model: model.id, resolution }, templates)]).totalBrl }]; } catch { return []; }
    }),
    source: `https://fal.ai/models/${model.id}`,
  }));
}

const PORTRAIT_SPEC: Record<(typeof PORTRAIT_ROLES)[number], { text: string; aspect: string }> = {
  FRONT: { text: "a photorealistic front-facing portrait, head and shoulders, looking at the camera, soft natural light, plain neutral background", aspect: "3:4" },
  PROFILE: { text: "a photorealistic left-side profile portrait, head and shoulders, soft natural light, plain neutral background", aspect: "3:4" },
  DETAIL: { text: "a 2x2 grid of four photorealistic close-ups of the character's signature details (accessory, hair texture, clothing neckline, signature prop)", aspect: "1:1" },
};

// Built from the approved sheet, so the face stays the same across the kit.
export function portraitItem(role: (typeof PORTRAIT_ROLES)[number], card: CharacterCard, sheetUrl: string, templates: PromptTemplates = {}): KitItem {
  const spec = PORTRAIT_SPEC[role];
  const prompt = renderPrompt("portrait", { ...cardVars(card), shot: spec.text }, templates);
  return { role, model: PORTRAIT_MODEL, params: { prompt, image_urls: [sheetUrl], aspect_ratio: spec.aspect, resolution: "1K" } };
}

// Real cost of a kit step, once it is known. `unknown` means a charge may exist that nobody has verified yet (never shown as R$ 0).
type CostStep = { status: string; submissionState: string; actualCostBrl: { toString(): string } | null };

export function stepCost(step: CostStep): { state: "none" } | { state: "unknown" } | { state: "known"; brl: number } {
  if (["submission_unknown", "cost_unknown"].includes(step.submissionState)) return { state: "unknown" };
  if (!["DONE", "APPROVED"].includes(step.status)) return { state: "none" };
  return step.actualCostBrl === null ? { state: "unknown" } : { state: "known", brl: Number(step.actualCostBrl.toString()) };
}

export function kitSpent(steps: CostStep[]): { unknown: boolean; brl: number } {
  const costs = steps.map(stepCost);
  // Each step is charged in whole credits, so the total is the sum of those charges (equal to the sum of the chips).
  return { unknown: costs.some((cost) => cost.state === "unknown"), brl: costs.reduce((sum, cost) => sum + (cost.state === "known" ? chargeBrl(cost.brl) : 0), 0) };
}
