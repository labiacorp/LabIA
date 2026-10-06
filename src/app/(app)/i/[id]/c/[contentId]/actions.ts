"use server";

import { revalidatePath } from "next/cache";
import { startContentImage } from "@/lib/content-generation";
import { UserError } from "@/lib/generation";
import { refreshRate } from "@/lib/fx";
import { requireUserId } from "@/lib/session";

export type ContentState = { error?: string };

export async function generateScene(influencerId: string, contentId: string, _previous: ContentState, data: FormData): Promise<ContentState> {
  const userId = await requireUserId();
  await refreshRate(); // quote on a fresh USD→BRL rate
  const intentId = String(data.get("intent") ?? "");
  const expectedBrl = Number(data.get("expectedBrl"));
  if (!/^[0-9a-f-]{36}$/.test(intentId) || !Number.isFinite(expectedBrl)) return { error: "Pedido inválido. Recarregue a página." };
  try {
    await startContentImage({ userId, influencerId, contentId, intentId, expectedBrl, prompt: String(data.get("prompt") ?? ""), selection: data.has("model") ? { model: String(data.get("model")), resolution: String(data.get("resolution")) } : undefined });
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    console.error("[generateScene]", error);
    return { error: "Não foi possível confirmar o pedido. Recarregue a página para conferir a etapa e os créditos antes de tentar novamente." };
  }
  revalidatePath(`/i/${influencerId}/c/${contentId}`);
  revalidatePath(`/i/${influencerId}`);
  return {};
}

export async function generateVideo(influencerId: string, contentId: string, _previous: ContentState, data: FormData): Promise<ContentState> {
  const { startContentVideo } = await import("@/lib/video-chain");
  const strategy = String(data.get("strategy") ?? "reel");
  const audio = String(data.get("generateAudio") ?? "false");
  if (!["reel", "clip"].includes(strategy) || !["true", "false"].includes(audio)) return { error: "Configuração de vídeo inválida." };
  return runVideoAction(influencerId, contentId, data, (input) => startContentVideo({ ...input, prompt: String(data.get("prompt") ?? ""),
    selection: data.has("model") ? { model: String(data.get("model")), duration: Number(data.get("duration")), resolution: String(data.get("resolution")), audio: audio === "true", strategy: strategy as "clip" | "reel" } : undefined,
  }));
}

export async function assembleVideo(influencerId: string, contentId: string, _previous: ContentState, data: FormData): Promise<ContentState> {
  const { startAssembly } = await import("@/lib/video-chain");
  return runVideoAction(influencerId, contentId, data, startAssembly);
}

async function runVideoAction(influencerId: string, contentId: string, data: FormData, start: (input: { userId: string; influencerId: string; contentId: string; intentId: string; expectedBrl: number }) => Promise<unknown>): Promise<ContentState> {
  const userId = await requireUserId();
  await refreshRate(); // quote on a fresh USD→BRL rate
  const intentId = String(data.get("intent") ?? "");
  const expectedBrl = Number(data.get("expectedBrl"));
  if (!/^[0-9a-f-]{36}$/.test(intentId) || !Number.isFinite(expectedBrl)) return { error: "Pedido inválido. Recarregue a página." };
  try {
    await start({ userId, influencerId, contentId, intentId, expectedBrl });
  } catch (error) {
    if (error instanceof UserError) return { error: error.message };
    console.error("[contentVideo]", error);
    return { error: "Não foi possível confirmar o pedido. Recarregue para conferir a etapa e os créditos." };
  }
  revalidatePath(`/i/${influencerId}/c/${contentId}`);
  revalidatePath(`/i/${influencerId}`);
  return {};
}
