"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { refreshRate } from "@/lib/fx";
import { requireOwner } from "@/lib/owner";
import { findMotionModel, KLING_FIXED_PARAMS, MIN_REFERENCE_PX, motionSchema, referenceTooSmall, type MotionBrief } from "@/lib/motion";
import { startPlan, UserError } from "@/lib/generation";
import { providerMediaUrl } from "@/lib/media-access";
import { readReference, removeReference, storeReference } from "@/lib/reference-storage";
import { MIN_TRIM_SECONDS, trimMp4 } from "@/lib/video-trim";
import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";

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
  if (referenceTooSmall(findMotionModel(brief.model), references.find((asset) => asset.id === brief.referenceIds[0])))
    throw new UserError(`A imagem do personagem precisa ter pelo menos ${MIN_REFERENCE_PX} px no lado menor para o Kling.`);
  return {
    source,
    references: brief.referenceIds.map(
      (id) => references.find((asset) => asset.id === id)!,
    ),
  };
}
// Short test versions: keeps the first `seconds` of one of the owner's imported videos as a new library video, so a try-out
// is quoted and billed for those seconds only. The original stays as it was.
export async function trimSource(sourceId: string, seconds: number) {
  const userId = await requireOwner();
  const whole = Math.floor(Number(seconds));
  const source = await prisma.asset.findFirst({ where: { id: sourceId, userId, kind: "VIDEO", storageKey: { not: null } } });
  if (!source?.storageKey || !source.durationSec) return { error: "Escolha um vídeo importado." };
  if (!Number.isFinite(whole) || whole < MIN_TRIM_SECONDS || whole >= source.durationSec)
    return { error: `Use de ${MIN_TRIM_SECONDS} s até menos que a duração do vídeo (${source.durationSec.toFixed(1)} s).` };
  let storageKey: string | undefined;
  try {
    const trimmed = await trimMp4(await readReference(source.storageKey), whole);
    const id = randomUUID();
    storageKey = await storeReference(`references/${id}.mp4`, trimmed.bytes, "video/mp4");
    const name = `${(source.fileName ?? "Vídeo").replace(/\.mp4$/i, "")} (0-${whole}s).mp4`.slice(0, 120);
    const asset = await prisma.asset.create({
      data: { id, userId, kind: "VIDEO", url: `/api/assets/${id}/file`, storageKey, contentType: "video/mp4", fileName: name, sizeBytes: trimmed.bytes.length, width: source.width, height: source.height, durationSec: trimmed.durationSec },
    });
    return { asset: { id: asset.id, url: asset.url, name, durationSec: trimmed.durationSec } };
  } catch {
    if (storageKey) await removeReference(storageKey).catch(() => {});
    return { error: "Não conseguimos cortar este vídeo. Tente outro arquivo." };
  }
}
export async function createMotion(_previous: string, form: FormData) {
  const userId = await requireOwner();
  await refreshRate(); // quote on a fresh USD→BRL rate
  const referenceIds = form.getAll("referenceIds");
  while (referenceIds.length && !referenceIds.at(-1)) referenceIds.pop();
  if (referenceIds.some((id) => !id))
    return "Preencha as referências em ordem, sem pular personagens.";
  const parsed = motionSchema.safeParse({
    version: 1,
    trend: form.get("trend"),
    sourceId: form.get("sourceId"),
    originalSourceId: form.get("originalSourceId") || undefined,
    referenceIds,
    prompt: form.get("prompt"),
    keepSound: form.get("keepSound") === "on",
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
    if (parsed.data.originalSourceId && !(await prisma.asset.findFirst({ where: { id: parsed.data.originalSourceId, userId, kind: "VIDEO", storageKey: { not: null } }, select: { id: true } })))
      return "Choose an original video from your own library.";
    const contentId = String(form.get("contentId") ?? "");
    if (contentId) {
      const saved = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
        return tx.content.updateMany({
          where: { id: contentId, influencerId, influencer: { userId }, archivedAt: null, motion: { not: Prisma.DbNull }, steps: { every: { status: { in: ["PENDING", "QUOTED"] }, operationKey: null, submissionState: "not_submitted" } } },
          data: { title, idea: parsed.data.prompt, motion: parsed.data },
        });
      });
      if (!saved.count) return "This draft cannot be edited: it is unavailable or generation has already started.";
      id = contentId;
    } else {
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
    }
  } catch (error) {
    return error instanceof UserError
      ? error.message
      : "Não conseguimos salvar. Suas escolhas continuam no formulário.";
  }
  revalidatePath("/conteudos");
  revalidatePath(`/i/${influencerId}/c/${id}`);
  redirect(`/i/${influencerId}/c/${id}`);
}
export async function generateMotion(
  influencerId: string,
  contentId: string,
  _previous: { error?: string },
  form: FormData,
) {
  const userId = await requireOwner();
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
            ...(findMotionModel(parsed.data.model)?.provider === "fal" ? { ...KLING_FIXED_PARAMS, keep_original_sound: parsed.data.keepSound } : {}),
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
