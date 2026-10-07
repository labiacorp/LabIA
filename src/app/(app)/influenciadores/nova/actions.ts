"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { previewItems, profileFromFaceItem, sheetFromFaceItem } from "@/lib/character";
import { startPlan, UserError } from "@/lib/generation";
import { refreshRate } from "@/lib/fx";
import { cardOf } from "@/lib/kit";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { NICHES } from "./niches";

export type InfluencerState = { error?: string };

const brief = z.object({
  name: z.string().trim().min(1, "Dê um nome para ela.").max(60),
  niche: z.string().trim().min(1).max(80),
  description: z.string().trim().min(20, "Descreva com pelo menos 20 caracteres: idade, cabelo, estilo.").max(400),
});
const paid = z.object({ intent: z.uuid(), expectedBrl: z.coerce.number().finite() });
const firstError = (error: z.ZodError) => error.issues[0]?.message ?? "Revise os campos.";

// Step 1: the brief and the four face previews under one cost confirm. Without credits nothing is kept.
export async function createInfluencer(_previous: InfluencerState, form: FormData): Promise<InfluencerState> {
  const userId = await requireUserId();
  await refreshRate();
  const input = brief.safeParse(Object.fromEntries(form));
  if (!input.success) return { error: firstError(input.error) };
  const money = paid.safeParse(Object.fromEntries(form));
  if (!money.success) return { error: "Pedido inválido. Recarregue a página." };
  if (!NICHES.includes(input.data.niche)) return { error: "Escolha um nicho." };
  const influencer = await prisma.influencer.create({ data: { userId, name: input.data.name, niche: input.data.niche, tone: "natural", visualSignature: input.data.description } });
  try {
    await startPlan({ userId, influencerId: influencer.id, intentId: money.data.intent, plan: previewItems(cardOf(influencer)), expectedBrl: money.data.expectedBrl });
  } catch (error) {
    await prisma.influencer.delete({ where: { id: influencer.id } });
    if (error instanceof UserError) return { error: error.message };
    console.error("[createInfluencer]", error);
    return { error: "Não foi possível gerar as prévias. Nada foi cobrado." };
  }
  revalidatePath("/influenciadores");
  redirect(`/influenciadores/nova?id=${influencer.id}`);
}

export async function regeneratePreviews(influencerId: string, _previous: InfluencerState, form: FormData): Promise<InfluencerState> {
  const userId = await requireUserId();
  await refreshRate();
  const money = paid.safeParse(Object.fromEntries(form));
  if (!money.success) return { error: "Pedido inválido. Recarregue a página." };
  const influencer = await prisma.influencer.findFirst({ where: { id: influencerId, userId, faceAssetId: null } });
  if (!influencer) return { error: "Influencer não encontrada." };
  try {
    await startPlan({ userId, influencerId, intentId: money.data.intent, plan: previewItems(cardOf(influencer)), expectedBrl: money.data.expectedBrl });
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    console.error("[regeneratePreviews]", error);
    return { error: "Não foi possível gerar as prévias. Nada foi cobrado." };
  }
  revalidatePath(`/influenciadores/nova`);
  return {};
}

// Step 2: approving a face charges the character sheet made from it; the face is kept only if that charge goes through.
export async function approveFace(influencerId: string, _previous: InfluencerState, form: FormData): Promise<InfluencerState> {
  const userId = await requireUserId();
  await refreshRate();
  const money = paid.safeParse(Object.fromEntries(form));
  const assetId = String(form.get("asset") ?? "");
  if (!money.success || !assetId) return { error: "Escolha um rosto." };
  const influencer = await prisma.influencer.findFirst({ where: { id: influencerId, userId, faceAssetId: null } });
  const asset = await prisma.asset.findFirst({ where: { id: assetId, userId, influencerId, kind: "IMAGE", role: null, step: { kind: "CHARACTER", role: null, status: "DONE" } } });
  if (!influencer || !asset) return { error: "Este rosto não está disponível." };
  try {
    await startPlan({ userId, influencerId, intentId: money.data.intent, plan: [sheetFromFaceItem(cardOf(influencer), asset.url), profileFromFaceItem(cardOf(influencer), asset.url)], expectedBrl: money.data.expectedBrl });
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    console.error("[approveFace]", error);
    return { error: "Não foi possível aprovar agora. Nada foi cobrado." };
  }
  await prisma.$transaction([
    prisma.asset.update({ where: { id: asset.id }, data: { role: "FRONT" } }),
    prisma.influencer.update({ where: { id: influencerId }, data: { faceAssetId: asset.id } }),
  ]);
  revalidatePath("/", "layout");
  redirect(`/influenciadores/nova?id=${influencerId}&pronta=1`);
}

export async function editInfluencer(influencerId: string, _previous: InfluencerState, form: FormData): Promise<InfluencerState> {
  const userId = await requireUserId();
  const input = brief.safeParse(Object.fromEntries(form));
  if (!input.success) return { error: firstError(input.error) };
  const updated = await prisma.influencer.updateMany({ where: { id: influencerId, userId }, data: { name: input.data.name, niche: input.data.niche, visualSignature: input.data.description } });
  if (updated.count !== 1) return { error: "Influencer não encontrada." };
  revalidatePath("/", "layout");
  return {};
}

// Deletes the influencer, her contents and every file of hers in the library. Ledger rows stay, so what was spent
// remains in the statement. Typing her name is the confirmation; refused while a generation is running.
export async function deleteInfluencer(influencerId: string, _previous: InfluencerState, form: FormData): Promise<InfluencerState> {
  const userId = await requireUserId();
  const typed = String(form.get("confirm") ?? "").trim().toLowerCase();
  const done = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    const influencer = await tx.influencer.findFirst({ where: { id: influencerId, userId }, select: { name: true } });
    if (!influencer) return "Influencer não encontrada.";
    if (typed !== influencer.name.trim().toLowerCase()) return "Digite o nome dela para confirmar.";
    const running = await tx.step.count({ where: { status: "RUNNING", OR: [{ influencerId }, { content: { influencerId } }] } });
    if (running) return "Não dá para excluir enquanto uma geração está em andamento.";
    await tx.asset.deleteMany({ where: { userId, OR: [{ influencerId }, { content: { influencerId } }] } });
    await tx.influencer.delete({ where: { id: influencerId } });
    return "";
  });
  if (done) return { error: done };
  revalidatePath("/", "layout");
  redirect("/influenciadores");
}
