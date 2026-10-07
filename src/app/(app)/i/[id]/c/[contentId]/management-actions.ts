"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
        where: {
          id: contentId,
          influencerId,
          influencer: { userId },
          archivedAt: null,
        },
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
      archivedAt: null,
      id: contentId,
      influencerId,
      influencer: { userId },
      status: { in: ["REVIEW", "APPROVED", "REJECTED"] },
      steps: {
        some: {
          kind: "ASSEMBLY",
          status: { in: ["DONE", "APPROVED"] },
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

// "Aprovar" on a finished take: the next stage opens. Approving the montage approves the content.
export async function approveStep(influencerId: string, contentId: string, stepId: string): Promise<ManagementState> {
  const userId = await requireUserId();
  const approved = await prisma.$transaction(async (tx) => {
    const step = await tx.step.updateMany({
      where: { id: stepId, contentId, kind: { in: ["IMAGE", "VIDEO", "ASSEMBLY"] }, status: "DONE", submissionState: "completed", content: { influencerId, influencer: { userId }, archivedAt: null } },
      data: { status: "APPROVED" },
    });
    if (step.count !== 1) return false;
    if ((await tx.step.findUniqueOrThrow({ where: { id: stepId }, select: { kind: true } })).kind === "ASSEMBLY")
      await tx.content.update({ where: { id: contentId }, data: { status: "APPROVED" } });
    return true;
  });
  if (!approved) return { error: "Esta etapa não pode ser aprovada agora.", message: "" };
  revalidatePath(`/i/${influencerId}/c/${contentId}`);
  revalidatePath("/conteudos");
  revalidatePath("/painel");
  return { error: "", message: "" };
}

// Deletes the content, its steps and media rows. Ledger rows stay (their step link is set to null), so what was
// spent remains in the statement. Refused while a generation is running: its reservation is still open.
export async function deleteContent(influencerId: string, contentId: string): Promise<ManagementState> {
  const userId = await requireUserId();
  const deleted = await prisma.$transaction(async (tx) => {
    // Same per-user lock as paid starts, so a generation cannot begin while the content is being deleted.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
    return tx.content.deleteMany({ where: { id: contentId, influencerId, influencer: { userId }, steps: { none: { status: "RUNNING" } } } });
  });
  if (deleted.count !== 1) return { error: "Não dá para excluir enquanto uma geração está em andamento.", message: "" };
  revalidatePath("/conteudos");
  revalidatePath("/painel");
  redirect("/conteudos");
}
