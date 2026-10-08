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
  // Sources: Kling's official Motion Control guide (kling.ai/quickstart/motion-control-user-guide: background and camera come from the prompt, the video defines the movement)
  // and fal's Kling 2.6 prompt guide (fal.ai/learn/devs/kling-video-2-6-motion-control-prompt-guide: do not describe the choreography). Genjutsu's `@image1` form is the one
  // Higgsfield's own prompt box documents (higgsfield.ai/ai/video?model=genjutsu); whether its API honours it is not confirmed. Not yet tested on a real run.
  "motion-kling": {
    label: "Motion recreation: Kling",
    where: "Starting text on the Trends screen for Kling 2.6/3 Motion Control. Source: Kling's official guide (kling.ai/quickstart/motion-control-user-guide) and fal's prompt guide (fal.ai/learn/devs/kling-video-2-6-motion-control-prompt-guide), both say the video already defines the movement, so the prompt names only the character, the face and the scene.",
    vars: [],
    text: "Replace the person in the video with the character from the reference image. Keep the character's face, hair and outfit identical to the reference image. Keep the original framing and background.",
  },
  "motion-genjutsu": {
    label: "Motion recreation: Genjutsu",
    where: "Starting text on the Trends screen for Higgsfield Genjutsu. Source: the example prompts in Higgsfield's own prompt box (higgsfield.ai/ai/video?model=genjutsu) cite images as @image1, @image2.",
    vars: [],
    text: "Replace the person in the video with the character from @image1. If the video shows more people, replace them in order with @image2 and @image3. Keep the exact motion, timing, camera and background of the original video. Keep each character's face, hair and outfit identical to their image.",
  },
  ...Object.fromEntries(TRENDS.map((trend) => [`trend-${trend.id}`, {
    label: `Trend: ${trend.name} (previous text)`,
    where: "The first text this screen shipped with, kept to compare against the model texts above in a test. No longer preselected.",
    vars: [],
    text: trend.prompt,
  } satisfies PromptDefinition])),
} as Record<string, PromptDefinition> as Record<PromptKey, PromptDefinition>;

export const motionPromptKey = (modelId: string): PromptKey => (modelId.startsWith("higgsfield/") ? "motion-genjutsu" : "motion-kling");
export type PromptKey = "face-preview" | "sheet" | "sheet-from-face" | "profile-from-face" | "portrait" | "scene" | "video-continue" | "motion-kling" | "motion-genjutsu" | `trend-${(typeof TRENDS)[number]["id"]}`;
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
