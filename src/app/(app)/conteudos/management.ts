"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createContentDraft, type DraftSettings } from "@/lib/content-draft";
import { getImageOptions } from "@/lib/content-generation";
import { getVideoOptions } from "@/lib/video-options";
import { TEXT_MAX } from "@/lib/limits";
import { requireUserId } from "@/lib/session";
import { Prisma } from "@/generated/prisma/client";
export type CreateState = { error: string; created?: string };
// Creating a draft is free. Optional model settings are validated and estimated on the server.
export async function createProduction(_previous: CreateState, form: FormData): Promise<CreateState> {
  const userId = await requireUserId();
  const input = z
    .object({
      influencerId: z.string().min(1),
      contentId: z.string().min(1).optional(),
      title: z.string().trim().max(120).optional(),
      idea: z.string().trim().min(1).max(TEXT_MAX),
      script: z.string().trim().max(TEXT_MAX).default(""),
      aspectRatio: z.enum(["9:16", "16:9", "1:1"]).default("9:16"),
    })
    .safeParse(Object.fromEntries(form));
  if (!input.success) return { error: "Escolha uma influencer e conte a ideia em pelo menos uma frase." };
  const settings: DraftSettings = {};
  if (form.has("imageModel")) {
    const model = getImageOptions(input.data.aspectRatio).find((item) => item.model === form.get("imageModel"));
    const configuration = model?.configurations.find((item) => item.resolution === form.get("imageResolution"));
    if (!model || !configuration) return { error: "Choose a supported image model and quality." };
    settings.image = { model: model.model, ...configuration };
  }
  if (form.has("videoModel")) {
    const model = getVideoOptions().find((item) => item.model === form.get("videoModel") && item.strategy === form.get("videoStrategy"));
    const audio = form.get("videoAudio");
    const configuration = model?.configurations.find((item) => item.resolution === form.get("videoResolution") && item.duration === Number(form.get("videoDuration")) && String(item.audio) === audio);
    if (!model || !configuration) return { error: "Choose a supported video model, quality, duration and audio option." };
    settings.video = { model: model.model, strategy: model.strategy, ...configuration };
  }
  const title = input.data.title || input.data.idea.split(/[,.;!?\n]/)[0].trim().slice(0, 120) || input.data.idea.slice(0, 120);
  try {
    const { contentId, ...draft } = input.data;
    if (contentId) {
      const saved = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
        const result = await tx.content.updateMany({
          where: { id: contentId, influencerId: draft.influencerId, influencer: { userId }, archivedAt: null, motion: { equals: Prisma.DbNull }, steps: { none: { kind: { in: ["IMAGE", "VIDEO"] }, OR: [{ status: { notIn: ["PENDING", "QUOTED"] } }, { operationKey: { not: null } }, { submissionState: { not: "not_submitted" } }] } } },
          data: { title, idea: draft.idea, aspectRatio: draft.aspectRatio },
        });
        if (!result.count) return false;
        for (const [kind, chosen] of [["IMAGE", settings.image], ["VIDEO", settings.video]] as const) {
          if (!chosen) continue;
          const { brl, ...selection } = chosen;
          await tx.step.updateMany({ where: { contentId, kind }, data: { model: selection.model, input: { selection }, estimatedCostBrl: brl } });
        }
        return true;
      });
      if (!saved) return { error: "This draft cannot be edited: it is unavailable or paid generation has already started." };
      revalidatePath(`/i/${draft.influencerId}/c/${contentId}`);
      revalidatePath("/conteudos");
      return { error: "", created: `/i/${draft.influencerId}/c/${contentId}` };
    }
    const content = await createContentDraft(userId, { ...draft, title, settings });
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
