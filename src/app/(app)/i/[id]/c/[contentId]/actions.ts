"use server";

import { revalidatePath } from "next/cache";
import { startContentImage } from "@/lib/content-generation";
import { UserError } from "@/lib/generation";
import { requireUserId } from "@/lib/session";

export type ContentState = { error?: string };

export async function generateScene(influencerId: string, contentId: string, _previous: ContentState, data: FormData): Promise<ContentState> {
  const userId = await requireUserId();
  const intentId = String(data.get("intent") ?? "");
  const expectedBrl = Number(data.get("expectedBrl"));
  if (!/^[0-9a-f-]{36}$/.test(intentId) || !Number.isFinite(expectedBrl)) return { error: "Pedido inválido. Recarregue a página." };
  try {
    await startContentImage({ userId, influencerId, contentId, intentId, expectedBrl, prompt: String(data.get("prompt") ?? "") });
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    console.error("[generateScene]", error);
    return { error: "Não foi possível confirmar o pedido. Recarregue a página para conferir a etapa e o saldo antes de tentar novamente." };
  }
  revalidatePath(`/i/${influencerId}/c/${contentId}`);
  revalidatePath(`/i/${influencerId}`);
  return {};
}

export async function generateVideo(influencerId: string, contentId: string, _previous: ContentState, data: FormData): Promise<ContentState> {
  const { startContentVideo } = await import("@/lib/video-chain");
  return runVideoAction(influencerId, contentId, data, (input) => startContentVideo({ ...input, prompt: String(data.get("prompt") ?? "") }));
}

export async function assembleVideo(influencerId: string, contentId: string, _previous: ContentState, data: FormData): Promise<ContentState> {
  const { startAssembly } = await import("@/lib/video-chain");
  return runVideoAction(influencerId, contentId, data, startAssembly);
}

async function runVideoAction(influencerId: string, contentId: string, data: FormData, start: (input: { userId: string; influencerId: string; contentId: string; intentId: string; expectedBrl: number }) => Promise<unknown>): Promise<ContentState> {
  const userId = await requireUserId();
  const intentId = String(data.get("intent") ?? "");
  const expectedBrl = Number(data.get("expectedBrl"));
  if (!/^[0-9a-f-]{36}$/.test(intentId) || !Number.isFinite(expectedBrl)) return { error: "Pedido inválido. Recarregue a página." };
  try {
    await start({ userId, influencerId, contentId, intentId, expectedBrl });
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    console.error("[contentVideo]", error);
    return { error: "Não foi possível confirmar o pedido. Recarregue para conferir a etapa e o saldo." };
  }
  revalidatePath(`/i/${influencerId}/c/${contentId}`);
  revalidatePath(`/i/${influencerId}`);
  return {};
}
