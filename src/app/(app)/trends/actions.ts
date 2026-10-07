"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { refreshRate } from "@/lib/fx";
import { requireUserId } from "@/lib/session";
import { findMotionModel, motionSchema, type MotionBrief } from "@/lib/motion";
import { startPlan, UserError } from "@/lib/generation";
import { providerMediaUrl } from "@/lib/media-access";
import { readReference } from "@/lib/reference-storage";

async function ownedInputs(userId: string, brief: MotionBrief) {
  const source = await prisma.asset.findFirst({
    where: {
      id: brief.sourceId,
      userId,
      kind: "VIDEO",
      storageKey: { not: null },
    },
  });
  const references = await prisma.asset.findMany({
    where: {
      id: { in: brief.referenceIds },
      userId,
      kind: "IMAGE",
      OR: [
        { storageKey: { not: null } },
        { step: { status: { in: ["DONE", "APPROVED"] } } },
      ],
    },
  });
  if (
    !source ||
    !source.durationSec ||
    source.durationSec < 4 ||
    source.durationSec > 30 ||
    references.length !== brief.referenceIds.length
  )
    throw new UserError(
      "Escolha um vídeo importado válido e imagens da sua biblioteca.",
    );
  return {
    source,
    references: brief.referenceIds.map(
      (id) => references.find((asset) => asset.id === id)!,
    ),
  };
}
export async function createMotion(_previous: string, form: FormData) {
  const userId = await requireUserId();
  await refreshRate(); // quote on a fresh USD→BRL rate
  const referenceIds = form.getAll("referenceIds");
  while (referenceIds.length && !referenceIds.at(-1)) referenceIds.pop();
  if (referenceIds.some((id) => !id))
    return "Preencha as referências em ordem, sem pular personagens.";
  const parsed = motionSchema.safeParse({
    version: 1,
    trend: form.get("trend"),
    sourceId: form.get("sourceId"),
    referenceIds,
    prompt: form.get("prompt"),
    resolution: form.get("resolution"),
    model: form.get("model") ?? undefined,
  });
  const title = String(form.get("title") ?? "").trim();
  const influencerId = String(form.get("influencerId") ?? "");
  const modelIssue = parsed.success ? undefined : parsed.error.issues.find((issue) => issue.code === "custom" && issue.message !== "Invalid input");
  if (modelIssue) return `${modelIssue.message}. Pick another model or change the references.`;
  if (!parsed.success || !title || title.length > 120)
    return "Confira o título, o vídeo e as referências. Não repita a mesma referência.";
  let id: string;
  try {
    if (
      !(await prisma.influencer.findFirst({
        where: { id: influencerId, userId },
      }))
    )
      return "Escolha um personagem da sua conta para organizar a produção.";
    await ownedInputs(userId, parsed.data);
    const content = await prisma.content.create({
      data: {
        influencerId,
        title,
        idea: parsed.data.prompt,
        motion: parsed.data,
        steps: { create: { kind: "ASSEMBLY", position: 0 } },
      },
    });
    id = content.id;
  } catch (error) {
    return error instanceof UserError
      ? error.message
      : "Não conseguimos salvar. Suas escolhas continuam no formulário.";
  }
  revalidatePath("/conteudos");
  redirect(`/i/${influencerId}/c/${id}`);
}
export async function generateMotion(
  influencerId: string,
  contentId: string,
  _previous: { error?: string },
  form: FormData,
) {
  const userId = await requireUserId();
  await refreshRate(); // quote on a fresh USD→BRL rate
  const intentId = String(form.get("intent") ?? "");
  const expectedBrl = Number(form.get("expectedBrl"));
  if (!/^[0-9a-f-]{36}$/.test(intentId) || !Number.isFinite(expectedBrl))
    return { error: "Recarregue a página para confirmar o pedido." };
  try {
    const content = await prisma.content.findFirst({
      where: {
        id: contentId,
        influencerId,
        influencer: { userId },
        archivedAt: null,
      },
    });
    const parsed = motionSchema.safeParse(content?.motion);
    if (!parsed.success) throw new UserError("Recriação não encontrada.");
    const { source, references } = await ownedInputs(userId, parsed.data);
    // Fail before reservation if the stored source or an imported reference disappeared.
    await Promise.all(
      [source, ...references]
        .filter((a) => a.storageKey)
        .map((a) => readReference(a.storageKey!)),
    );
    await startPlan({
      userId,
      influencerId,
      contentId,
      contentKind: "ASSEMBLY",
      intentId,
      expectedBrl,
      plan: [
        {
          role: null,
          model: parsed.data.model,
          params: {
            prompt: parsed.data.prompt,
            video_url: providerMediaUrl(source),
            image_urls: references.slice(0, findMotionModel(parsed.data.model)?.maxReferences).map(providerMediaUrl),
            resolution: parsed.data.resolution,
            sourceDuration: source.durationSec,
          },
        },
      ],
    });
  } catch (error) {
    return {
      error:
        error instanceof UserError
          ? error.message
          : "Não foi possível iniciar. Confira suas referências e a configuração do provedor.",
    };
  }
  revalidatePath(`/i/${influencerId}/c/${contentId}`);
  return {};
}
