"use server";

import { revalidatePath } from "next/cache";

import { startPlan, UserError } from "@/lib/generation";
import { cardOf, loadKit, planFor } from "@/lib/kit";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export type KitState = { error?: string };

export async function startKit(influencerId: string, phase: "SHEET" | "PORTRAITS", _previous: KitState, data: FormData): Promise<KitState> {
  const userId = await requireUserId();
  const intentId = String(data.get("intent") ?? "");
  const expectedBrl = Number(data.get("expectedBrl"));
  if (!/^[0-9a-f-]{36}$/.test(intentId) || !Number.isFinite(expectedBrl)) return { error: "Pedido inválido. Recarregue a página." };

  try {
    const influencer = await prisma.influencer.findFirst({ where: { id: influencerId, userId } });
    if (!influencer) return { error: "Influencer não encontrado." };
    const kit = await loadKit(influencerId);
    const plan = planFor(phase, cardOf(influencer), kit);
    if (plan.length === 0) return { error: "Não há nada para gerar." };
    await startPlan({ userId, influencerId, intentId, plan, expectedBrl });
    // Using the sheet to make the portraits is what approves it.
    if (phase === "PORTRAITS" && kit.sheet) await prisma.step.updateMany({ where: { id: kit.sheet.id, status: "DONE" }, data: { status: "APPROVED" } });
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    console.error("[startKit]", error);
    return { error: "Não foi possível iniciar a geração. Nada foi cobrado." };
  }
  revalidatePath(`/i/${influencerId}`);
  return {};
}
