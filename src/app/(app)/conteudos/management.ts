"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PIPELINE } from "@/lib/pipeline";
import { requireUserId } from "@/lib/session";
export async function createProduction(_previous: string, form: FormData) {
  const userId = await requireUserId();
  const input = z
    .object({
      influencerId: z.string().min(1),
      title: z.string().trim().min(1).max(120),
      idea: z.string().trim().max(2000),
      aspectRatio: z.enum(["9:16", "16:9", "1:1"]),
    })
    .safeParse(Object.fromEntries(form));
  if (!input.success)
    return "Escolha um personagem e preencha um título de até 120 caracteres e uma ideia de até 2.000 caracteres.";
  let id: string;
  try {
    const character = await prisma.influencer.findFirst({
      where: { id: input.data.influencerId, userId },
      select: { id: true },
    });
    if (!character) return "Escolha um personagem da sua conta.";
    const content = await prisma.content.create({
      data: {
        ...input.data,
        steps: {
          create: PIPELINE.map((step, position) => ({
            kind: step.kind,
            position,
          })),
        },
      },
    });
    id = content.id;
  } catch {
    return "Não conseguimos criar o rascunho. Tente novamente.";
  }
  revalidatePath("/conteudos");
  revalidatePath("/painel");
  redirect(`/i/${input.data.influencerId}/c/${id}`);
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
