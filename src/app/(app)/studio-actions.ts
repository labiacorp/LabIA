"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { PIPELINE } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { parseStudioSelection, studioPersona } from "@/lib/studio";

export type StudioState = { error?: string };

const characterSchema = z.object({
  name: z.string().trim().min(1).max(60),
  niche: z.string().trim().min(1).max(80),
  tone: z.string().trim().min(1).max(80),
  visualSignature: z.string().trim().max(300),
  persona: z.string().trim().max(1000),
});

// Creating the brief is free. Paid generation still requires the existing kit quote/approval.
export async function createStudioCharacter(_: StudioState, data: FormData): Promise<StudioState> {
  const userId = await requireUserId();
  let id: string;
  try {
    const selections = parseStudioSelection(String(data.get("selections") ?? "{}"));
    const input = characterSchema.parse({
      ...Object.fromEntries(data),
      persona: studioPersona(selections, String(data.get("persona") ?? "")),
    });
    const influencer = await prisma.influencer.create({ data: { ...input, userId } });
    id = influencer.id;
  } catch (error) {
    return { error: error instanceof z.ZodError || error instanceof SyntaxError || (error instanceof Error && error.message === "Invalid studio selection")
      ? "Revise os campos e as características do personagem."
      : "Não foi possível salvar o personagem. Tente novamente." };
  }
  revalidatePath("/");
  redirect(`/i/${id}?aba=personagem`);
}

export async function createStudioMotion(_: StudioState, data: FormData): Promise<StudioState> {
  const userId = await requireUserId();
  let influencerId: string;
  let contentId: string;
  try {
    const input = z.object({
      influencerId: z.string().min(1),
      title: z.string().trim().min(1).max(120),
      idea: z.string().trim().max(2000),
    }).parse(Object.fromEntries(data));
    const owned = await prisma.influencer.findFirst({ where: { id: input.influencerId, userId }, select: { id: true, faceAssetId: true } });
    if (!owned?.faceAssetId) return { error: "Escolha um personagem com retrato de frente aprovado." };
    const content = await prisma.content.create({ data: {
      influencerId: owned.id, title: input.title, idea: input.idea,
      steps: { create: PIPELINE.map((step, position) => ({ kind: step.kind, position })) },
    } });
    influencerId = owned.id;
    contentId = content.id;
  } catch (error) {
    return { error: error instanceof z.ZodError ? "Escolha o personagem e dê um título ao conteúdo." : "Não foi possível criar o conteúdo. Tente novamente." };
  }
  revalidatePath("/");
  redirect(`/i/${influencerId}/c/${contentId}`);
}
