"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { UserError } from "@/lib/generation";
export type ManagementState = { error: string; message: string };
export async function saveScript(
  influencerId: string,
  contentId: string,
  _previous: ManagementState,
  form: FormData,
): Promise<ManagementState> {
  const userId = await requireUserId();
  const result = z
    .string()
    .trim()
    .min(1)
    .max(2000)
    .safeParse(form.get("script"));
  if (!result.success)
    return {
      error: "Escreva um roteiro de até 2.000 caracteres.",
      message: "",
    };
  try {
    await prisma.$transaction(async (tx) => {
      const content = await tx.content.findFirst({
        where: { id: contentId, influencerId, influencer: { userId } },
      });
      if (!content) throw new UserError("Conteúdo não encontrado.");
      const updated = await tx.step.updateMany({
        where: {
          contentId,
          kind: "SCRIPT",
          status: { in: ["PENDING", "QUOTED", "DONE", "APPROVED"] },
        },
        data: {
          input: { script: result.data },
          status: "DONE",
          completedAt: new Date(),
          actualCostBrl: 0,
        },
      });
      if (updated.count !== 1)
        throw new UserError("Não foi possível editar esta etapa agora.");
    });
  } catch (error) {
    return {
      error:
        error instanceof UserError
          ? error.message
          : "Não conseguimos salvar o roteiro. Tente novamente.",
      message: "",
    };
  }
  revalidatePath(`/i/${influencerId}/c/${contentId}`);
  revalidatePath("/painel");
  revalidatePath("/conteudos");
  return {
    error: "",
    message: "Roteiro salvo. As próximas cenas sugerem esta direção.",
  };
}
export async function reviewContent(
  influencerId: string,
  contentId: string,
  _previous: ManagementState,
  form: FormData,
): Promise<ManagementState> {
  const userId = await requireUserId();
  const decision = form.get("decision");
  if (
    decision !== "APPROVED" &&
    decision !== "REJECTED" &&
    decision !== "REVIEW"
  )
    return { error: "Escolha uma revisão válida.", message: "" };
  const result = await prisma.content.updateMany({
    where: {
      id: contentId,
      influencerId,
      influencer: { userId },
      status: { in: ["REVIEW", "APPROVED", "REJECTED"] },
      steps: {
        some: {
          kind: "ASSEMBLY",
          status: "DONE",
          assets: { some: { kind: "VIDEO", userId } },
        },
        none: { status: "RUNNING" },
      },
    },
    data: { status: decision },
  });
  if (result.count !== 1)
    return {
      error: "A revisão fica disponível quando o vídeo final está pronto.",
      message: "",
    };
  revalidatePath(`/i/${influencerId}/c/${contentId}`);
  revalidatePath("/painel");
  revalidatePath("/conteudos");
  return {
    error: "",
    message:
      decision === "APPROVED"
        ? "Vídeo aprovado."
        : decision === "REJECTED"
          ? "Vídeo marcado para ajustes."
          : "Vídeo devolvido à revisão.",
  };
}

export async function updateBrief(
  influencerId: string,
  contentId: string,
  _previous: ManagementState,
  form: FormData,
): Promise<ManagementState> {
  const userId = await requireUserId();
  const parsed = z
    .object({
      title: z.string().trim().min(1).max(120),
      idea: z.string().trim().max(2000),
    })
    .safeParse({ title: form.get("title"), idea: form.get("idea") });
  if (!parsed.success)
    return {
      error:
        "Use um título de até 120 caracteres e uma ideia de até 2.000 caracteres.",
      message: "",
    };
  try {
    const changed = await prisma.content.updateMany({
      where: {
        id: contentId,
        influencerId,
        influencer: { userId },
        steps: { none: { status: "RUNNING" } },
      },
      data: parsed.data,
    });
    if (changed.count !== 1)
      return {
        error:
          "Conteúdo indisponível ou com geração em andamento. Aguarde para editar.",
        message: "",
      };
  } catch {
    return {
      error: "Não conseguimos salvar o briefing. Tente novamente.",
      message: "",
    };
  }
  revalidatePath(`/i/${influencerId}/c/${contentId}`);
  revalidatePath(`/i/${influencerId}`);
  revalidatePath("/conteudos");
  revalidatePath("/painel");
  return {
    error: "",
    message: "Briefing salvo. As mídias existentes foram preservadas.",
  };
}
