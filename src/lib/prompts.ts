import { prisma } from "@/lib/prisma";
import { TRENDS } from "@/lib/motion";
import { fillPrompt } from "@/lib/prompt-fill";

// Every prompt the app writes around what the user typed. An admin can replace any of them (admin > Prompts); the replacement
// is read at generation time and wins over the default. `{name}` placeholders are filled from the generation (see `vars`).
export type PromptDefinition = { label: string; where: string; vars: string[]; text: string };

const SHEET = [
  "Character reference sheet for a social-media creator on a warm beige paper background, thin rust-colored section dividers and small-caps rust headings.",
  "The same single character appears in every panel: {identity}.",
  "Panels: TURNAROUND (full body front, back and side), HERO (large central full-body portrait with two short handwritten rust annotations about the mood),",
  "POSES & ANGLES (five candid creator-style shots using props that fit the role), SILHOUETTE & EXPRESSION (three black full-body silhouettes and four close-up face expressions),",
  "DETAILS (four close-ups: a signature prop, an accessory, the clothing neckline, a flat lay of the creator's tools),",
  "and a CHARACTER ID text block reading exactly: NAME: {name} / ROLE: {role} / CORE MOOD: {mood} / VISUAL SIGNATURE: {visualSignature} (write the values in English).",
  "Photorealistic, natural skin, identical face, hair and outfit in all panels, sharp legible text, no watermark.",
].join(" ");

const CARD_VARS = ["identity", "name", "role", "mood", "visualSignature"];

export const PROMPT_DEFAULTS = {
  "face-preview": {
    label: "Face previews",
    where: "New influencer, step 1: the four face options generated from the description.",
    vars: ["role", "visualSignature"],
    text: "Photorealistic head-and-shoulders portrait of a social-media creator ({role}): {visualSignature}. Natural skin texture, soft daylight, plain light background, looking at the camera, no text, no watermark.",
  },
  sheet: {
    label: "Character sheet",
    where: "The reference sheet made from text alone (character page).",
    vars: CARD_VARS,
    text: SHEET,
  },
  "sheet-from-face": {
    label: "Character sheet from the approved face",
    where: "New influencer, step 2: the sheet generated after a face is approved. {sheet} is the sheet prompt above.",
    vars: [...CARD_VARS, "sheet"],
    text: "Use the person in the reference photo as the only character: keep exactly the same face. {sheet}",
  },
  "profile-from-face": {
    label: "Side portrait from the approved face",
    where: "New influencer, step 2: the profile portrait made together with the sheet.",
    vars: [...CARD_VARS, "shot"],
    text: "Using the person in the reference photo ({identity}), create {shot}. Keep exactly the same face, hair and clothing. No text, no watermark.",
  },
  portrait: {
    label: "Portraits from the sheet",
    where: "Front, side and detail portraits made from the approved sheet. {shot} is the shot description for that portrait.",
    vars: [...CARD_VARS, "shot"],
    text: "Using the character in the reference sheet ({identity}), create {shot}. Keep exactly the same face, hair and outfit as the sheet. No text, no watermark.",
  },
  scene: {
    label: "Content image (scene)",
    where: "The image step of a content. {scene} is what the user typed in the scene box.",
    vars: ["scene"],
    text: "Create a photorealistic scene with the person in the reference portrait. Keep the same face and identity. No text or watermark. Scene: {scene}",
  },
  "video-continue": {
    label: "Video: continue the next clip",
    where: "Chained video clips after the first one. {scene} is the user's movement text.",
    vars: ["scene"],
    text: "Continue the action smoothly from this last frame. Keep the same face, outfit, lighting and scene.\n\nScene context: {scene}",
  },
  ...Object.fromEntries(TRENDS.map((trend) => [`trend-${trend.id}`, {
    label: `Trend: ${trend.name}`,
    where: "Starting text of the scene instructions on the Trends screen (the user can still edit it per recreation).",
    vars: [],
    text: trend.prompt,
  } satisfies PromptDefinition])),
} as Record<PromptKey, PromptDefinition>;

export type PromptKey = "face-preview" | "sheet" | "sheet-from-face" | "profile-from-face" | "portrait" | "scene" | "video-continue" | `trend-${(typeof TRENDS)[number]["id"]}`;
export const PROMPT_KEYS = Object.keys(PROMPT_DEFAULTS) as PromptKey[];
export const PROMPT_MAX = 6000;
export type PromptTemplates = Partial<Record<PromptKey, string>>;

// Fills `{name}` from vars; a name with no value stays visible so a typo in an override shows in the generated prompt.
export function renderPrompt(key: PromptKey, vars: Record<string, string> = {}, templates: PromptTemplates = {}) {
  const template = templates[key]?.trim() ? templates[key]! : PROMPT_DEFAULTS[key].text;
  return fillPrompt(template, vars);
}

// Admin replacements, read on every generation start (a handful of rows).
export async function loadPromptTemplates(): Promise<PromptTemplates> {
  // A database that has not run the prompt_overrides migration yet must not stop generation: fall back to the defaults.
  const rows = await prisma.promptOverride.findMany().catch((error: unknown) => {
    console.error("[prompts] could not read overrides, using defaults", error instanceof Error ? error.message : error);
    return [];
  });
  const known = new Set<string>(PROMPT_KEYS);
  return Object.fromEntries(rows.filter((row) => known.has(row.key)).map((row) => [row.key, row.text]));
}
