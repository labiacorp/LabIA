"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createContentDraft } from "@/lib/content-draft";
import { requireUserId } from "@/lib/session";
export type CreateState = { error: string; created?: string };
// Novo conteúdo (design): influencer + idea. The title is the idea's first clause; the format is 9:16 unless a
// copied or template brief brings another one. Creating is free; the success screen links to the content.
export async function createProduction(_previous: CreateState, form: FormData): Promise<CreateState> {
  const userId = await requireUserId();
  const input = z
    .object({
      influencerId: z.string().min(1),
      title: z.string().trim().max(120).optional(),
      idea: z.string().trim().min(1).max(2000),
      script: z.string().trim().max(2000).default(""),
      aspectRatio: z.enum(["9:16", "16:9", "1:1"]).default("9:16"),
    })
    .safeParse(Object.fromEntries(form));
  if (!input.success) return { error: "Escolha uma influencer e conte a ideia em pelo menos uma frase." };
  const title = input.data.title || input.data.idea.split(/[,.;!?\n]/)[0].trim().slice(0, 120) || input.data.idea.slice(0, 120);
  try {
    const content = await createContentDraft(userId, { ...input.data, title });
    if (!content) return { error: "Escolha uma influencer da sua conta." };
    revalidatePath("/conteudos");
    revalidatePath("/painel");
    return { error: "", created: `/i/${input.data.influencerId}/c/${content.id}` };
  } catch {
    return { error: "Não conseguimos criar o conteúdo. Tente novamente." };
  }
}
export async function setArchive(
  contentId: string,
  archived: boolean,
  _previous: string,
): Promise<string> {
  void _previous;
  const userId = await requireUserId();
  try {
    const count = await prisma.$transaction(async (tx) => {
      // Serialize archive with paid starts, which lock the same owner row.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      return tx.content.updateMany({
        where: {
          id: contentId,
          influencer: { userId },
          steps: { none: { status: "RUNNING" } },
          archivedAt: archived ? null : { not: null },
        },
        data: { archivedAt: archived ? new Date() : null },
      });
    });
    if (!count.count)
      return "Não foi possível alterar: conteúdo indisponível ou geração em andamento.";
  } catch {
    return "Não conseguimos organizar este conteúdo. Tente novamente.";
  }
  revalidatePath("/", "layout");
  return "";
}
