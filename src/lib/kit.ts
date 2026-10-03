import type { Asset, Influencer, Step } from "@/generated/prisma/client";
import type { AssetRole } from "@/generated/prisma/enums";
import { type CharacterCard, PORTRAIT_ROLES, portraitItem, sheetItem } from "@/lib/character";
import { type PlanItem, UserError } from "@/lib/generation";
import { prisma } from "@/lib/prisma";

export const cardOf = (influencer: Pick<Influencer, "name" | "niche" | "tone" | "visualSignature" | "persona">): CharacterCard => ({
  name: influencer.name,
  role: influencer.niche,
  mood: influencer.tone,
  visualSignature: influencer.visualSignature,
  persona: influencer.persona,
});

export type KitStep = Step & { assets: Asset[] };

// The latest attempt for each role of the character kit.
export async function loadKit(influencerId: string) {
  const steps = await prisma.step.findMany({ where: { influencerId, kind: "CHARACTER" }, orderBy: { createdAt: "asc" }, include: { assets: true } });
  const latest = (role: AssetRole) => steps.filter((step) => step.role === role).at(-1) ?? null;
  const sheet = latest("SHEET");
  const portraits = Object.fromEntries(PORTRAIT_ROLES.map((role) => [role, latest(role)])) as Record<(typeof PORTRAIT_ROLES)[number], KitStep | null>;
  const sheetUrl = sheet && (sheet.status === "DONE" || sheet.status === "APPROVED") ? (sheet.assets[0]?.url ?? null) : null;
  const running = steps.some((step) => step.status === "RUNNING");
  return { steps, sheet, portraits, sheetUrl, running };
}

export type Kit = Awaited<ReturnType<typeof loadKit>>;

const alive = (step: KitStep | null) => !!step && (step.status === "RUNNING" || step.status === "DONE" || step.status === "APPROVED");

export function planFor(phase: "SHEET" | "PORTRAITS", card: CharacterCard, kit: Kit): PlanItem[] {
  if (phase === "SHEET") return [sheetItem(card)];
  if (!kit.sheetUrl) throw new UserError("Gere e aprove a ficha antes dos retratos.");
  const sheetUrl = kit.sheetUrl;
  return PORTRAIT_ROLES.filter((role) => !alive(kit.portraits[role])).map((role) => portraitItem(role, card, sheetUrl));
}
