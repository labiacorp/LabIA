"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { scriptText } from "@/lib/content-templates";
export async function saveTemplate(
  contentId: string,
  _previous: { error: string; message: string },
) {
  void _previous;
  const userId = await requireUserId();
  try {
    const content = await prisma.content.findFirst({
      where: { id: contentId, influencer: { userId } },
      include: {
        steps: { where: { kind: "SCRIPT" }, select: { input: true }, take: 1 },
      },
    });
    if (!content) return { error: "Conteúdo não encontrado.", message: "" };
    const data = {
      name: content.title.slice(0, 80),
      title: content.title,
      idea: content.idea,
      script: scriptText(content.steps[0]?.input),
      aspectRatio: content.aspectRatio,
    };
    await prisma.contentTemplate.upsert({
      where: { userId_sourceContentId: { userId, sourceContentId: contentId } },
      create: { ...data, userId, sourceContentId: contentId },
      update: data,
    });
  } catch {
    return {
      error: "Não conseguimos salvar o modelo. Tente novamente.",
      message: "",
    };
  }
  revalidatePath("/modelos");
  return {
    error: "",
    message: "Modelo salvo. Você pode usá-lo com outro personagem.",
  };
}

export async function deleteTemplate(id: string, _previous: string) {
  void _previous;
  const userId = await requireUserId();
  try {
    await prisma.contentTemplate.deleteMany({ where: { id, userId } });
  } catch {
    return "Não conseguimos excluir o modelo. Tente novamente.";
  }
  revalidatePath("/modelos");
  return "";
}
