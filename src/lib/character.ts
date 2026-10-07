import { usdBrlRate } from "@/lib/fx";
import type { AssetRole } from "@/generated/prisma/enums";
import { quote } from "@/lib/generation";
import { chargeBrl } from "@/lib/plan";
import { prepareImage, SHEET_DEFINITIONS } from "@/lib/providers/image-models";

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

function identity(card: CharacterCard) {
  const parts = [`${card.name}, ${card.role}`, `mood: ${card.mood}`];
  if (card.visualSignature) parts.push(`always looks like: ${card.visualSignature}`);
  if (card.persona) parts.push(card.persona);
  return parts.join(". ");
}

// One image with the whole kit, in the layout the founders use (turnaround, hero, poses, expressions, details, ID block).
export function sheetItem(card: CharacterCard, selection: SheetSelection = DEFAULT_SHEET): KitItem {
  const standard = [
    "Character reference sheet for a social-media creator on a warm beige paper background, thin rust-colored section dividers and small-caps rust headings.",
    `The same single character appears in every panel: ${identity(card)}.`,
    "Panels: TURNAROUND (full body front, back and side), HERO (large central full-body portrait with two short handwritten rust annotations about the mood),",
    "POSES & ANGLES (five candid creator-style shots using props that fit the role), SILHOUETTE & EXPRESSION (three black full-body silhouettes and four close-up face expressions),",
    "DETAILS (four close-ups: a signature prop, an accessory, the clothing neckline, a flat lay of the creator's tools),",
    `and a CHARACTER ID text block reading exactly: NAME: ${card.name} / ROLE: ${card.role} / CORE MOOD: ${card.mood} / VISUAL SIGNATURE: ${card.visualSignature || "-"} (write the values in English).`,
    "Photorealistic, natural skin, identical face, hair and outfit in all panels, sharp legible text, no watermark.",
  ].join(" ");
  const prompt = selection.prompt?.trim() || standard;
  const item: KitItem = { role: "SHEET", model: selection.model, params: { prompt, aspect_ratio: "3:2", resolution: selection.resolution } };
  // Validates the model/quality pair and captures the per-image price used to settle the step.
  item.params.imagePricing = prepareImage(item.model, item.params, usdBrlRate()).snapshot;
  return item;
}

// Every text-to-image model and quality that can take this sheet prompt, priced by the server (invalid pairs are left out).
export function getSheetOptions(card: CharacterCard) {
  return SHEET_DEFINITIONS.map((model) => ({
    model: model.id,
    name: model.name,
    estimated: model.estimated === true,
    maxPrompt: model.maxPrompt ?? 4000,
    configurations: Object.keys(model.rates).flatMap((resolution) => {
      try { return [{ resolution, brl: quote([sheetItem(card, { model: model.id, resolution })]).totalBrl }]; } catch { return []; }
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
export function portraitItem(role: (typeof PORTRAIT_ROLES)[number], card: CharacterCard, sheetUrl: string): KitItem {
  const spec = PORTRAIT_SPEC[role];
  const prompt = `Using the character in the reference sheet (${identity(card)}), create ${spec.text}. Keep exactly the same face, hair and outfit as the sheet. No text, no watermark.`;
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
