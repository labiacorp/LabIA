import type { Prisma, Step } from "@/generated/prisma/client";
import { REEL } from "@/lib/content-plan";
import { quote, startPlan, submit, UserError, type PlanItem } from "@/lib/generation";
import { getProvider } from "@/lib/provider";
import { prisma } from "@/lib/prisma";
import { MERGE_MODEL, METADATA_MODEL } from "@/lib/providers/ffmpeg";
import type { GenerationResult, GenParams } from "@/lib/providers/model-provider";
import { prepareVideo, settleVideo, type VideoPricingSnapshot } from "@/lib/providers/video-models";
import { videoUsdBrlRate, type VideoSelection } from "@/lib/video-options";

export type VideoClip = { url: string; duration: number; usd: number; brl: number; endFrameUrl: string };
export type VideoRecipe = { model: string; blocks: number; params: GenParams; pricing: VideoPricingSnapshot };
export type VideoChain = { phase: "video" | "metadata"; prompt: string; clips: VideoClip[]; pendingUrl?: string; recipe?: VideoRecipe };
const round4 = (n: number) => Math.round(n * 10000) / 10000;

export function reelItem(prompt: string, imageUrl: string, selection?: VideoSelection, source?: { width: number | null; height: number | null }): PlanItem {
  const native = selection?.strategy === "clip";
  if (selection && !native && (selection.model !== REEL.video.model || selection.duration !== 15 || selection.resolution !== "default" || selection.audio)) throw new UserError("Sequência de vídeo inválida.");
  const model = native ? selection.model : REEL.video.model;
  const params: GenParams = native ? {
    prompt, image_url: imageUrl, duration: selection.duration, resolution: selection.resolution,
    generate_audio: selection.audio, image_width: source?.width, image_height: source?.height,
  } : { prompt, image_url: imageUrl, duration: "5", resolution: "default", generate_audio: false };
  const prepared = prepareVideo(model, params, videoUsdBrlRate());
  const blocks = native ? 1 : REEL.video.blocks;
  const recipe: VideoRecipe = { model, blocks, params, pricing: prepared.snapshot };
  return { role: null, model, quantity: blocks, params: {
    ...params, videoPricing: prepared.snapshot, chain: { phase: "video", prompt, clips: [], recipe } satisfies VideoChain,
  } };
}
export const videoQuote = () => quote([reelItem("estimate", "https://estimate")]);

export async function startContentVideo(input: { userId: string; influencerId: string; contentId: string; intentId: string; expectedBrl: number; prompt: string; selection?: VideoSelection }) {
  const prompt = input.prompt.trim();
  if (!prompt || prompt.length > 2000) throw new UserError("Descreva o movimento em até 2.000 caracteres.");
  const scene = await prisma.asset.findFirst({
    where: { userId: input.userId, contentId: input.contentId, content: { influencerId: input.influencerId }, kind: "IMAGE", step: { kind: "IMAGE", status: { in: ["DONE", "APPROVED"] } } },
    orderBy: { createdAt: "desc" },
  });
  if (!scene) throw new UserError("Gere a imagem da cena antes do vídeo.");
  let item: PlanItem;
  try { item = reelItem(prompt, scene.url, input.selection, { width: scene.width, height: scene.height }); }
  catch (error) { throw new UserError(error instanceof Error ? error.message : "Configuração de vídeo inválida."); }
  return startPlan({ ...input, contentKind: "VIDEO", plan: [item] });
}

// V1 video-extend: keep the scene context, continue from the last frame. Here the frame/duration
// come from queued fal metadata instead of local ffmpeg + Supabase, so Vercel never downloads the clip.
export async function advanceVideo(step: Step, result: GenerationResult): Promise<GenerationResult | null> {
  const input = step.input as GenParams;
  const chain = input.chain as VideoChain;
  let next: GenParams;
  let model: string;
  let consumed = Number(step.actualCostBrl?.toString() ?? 0);
  if (chain.phase === "video") {
    const video = result.videos?.[0];
    if (!video?.url) throw new Error("O modelo não retornou o clipe.");
    next = { media_url: video.url, extract_frames: true, chain: { ...chain, phase: "metadata", pendingUrl: video.url } };
    model = METADATA_MODEL;
  } else {
    const media = (result.raw as { media: { duration: number; end_frame_url: string; resolution?: { width: number; height: number } } }).media;
    if (!Number.isFinite(media?.duration) || media.duration <= 0 || !media.end_frame_url || !chain.pendingUrl) {
      throw new Error("Não foi possível verificar a duração e o último quadro.");
    }
    // Same pricing function as V1, now with duration read from the actual media instead of the requested 5s.
    const actual = chain.recipe ? settleVideo(chain.recipe.pricing, { url: chain.pendingUrl, durationSeconds: media.duration, width: media.resolution?.width, height: media.resolution?.height })
      : getProvider().estimateCost(REEL.video.model, { prompt: chain.prompt, duration: media.duration });
    const clips = [...chain.clips, { url: chain.pendingUrl, duration: media.duration, usd: actual.usd, brl: actual.brl, endFrameUrl: media.end_frame_url }];
    consumed = round4(clips.reduce((sum, clip) => sum + clip.brl, 0));
    if (clips.length === (chain.recipe?.blocks ?? REEL.video.blocks)) {
      return {
        provider: "fal", model: chain.recipe?.model ?? REEL.video.model, requestId: result.requestId, images: [],
        videos: clips.map((clip) => ({ url: clip.url, durationSeconds: clip.duration, ...(clips.length === 1 ? { width: media.resolution?.width, height: media.resolution?.height } : {}) })),
        cost: { usd: clips.reduce((sum, clip) => sum + clip.usd, 0), brl: consumed, billingMode: "api", source: actual.source }, raw: { ...chain, clips },
      };
    }
    next = {
      ...(chain.recipe?.params ?? {}),
      prompt: `Continue the action smoothly from this last frame. Keep the same face, outfit, lighting and scene.\n\nScene context: ${chain.prompt}`,
      image_url: media.end_frame_url, duration: "5", ...(chain.recipe ? { videoPricing: chain.recipe.pricing } : {}), chain: { phase: "video", prompt: chain.prompt, clips, ...(chain.recipe ? { recipe: chain.recipe } : {}) } satisfies VideoChain,
    };
    model = chain.recipe?.model ?? REEL.video.model;
  }
  // Compare the request id as well as status: an old concurrent poll cannot advance a newer phase.
  const claimed = await prisma.step.updateMany({
    where: { id: step.id, status: "RUNNING", submissionState: "submitted", falRequestId: step.falRequestId },
    data: { model, input: next as Prisma.InputJsonValue, falRequestId: null, submissionState: "not_submitted", error: null, actualCostBrl: consumed },
  });
  if (claimed.count === 1) await submit({ id: step.id, model, params: next });
  return null;
}

export async function startAssembly(input: { userId: string; influencerId: string; contentId: string; intentId: string; expectedBrl: number }) {
  const video = await prisma.step.findFirst({
    where: { contentId: input.contentId, content: { influencerId: input.influencerId, influencer: { userId: input.userId } }, kind: "VIDEO", status: { in: ["DONE", "APPROVED"] } },
    include: { assets: true },
  });
  // Asset timestamps share the transaction timestamp. Persisted chain order is the source of truth.
  const clips = (video?.input as { chain?: { clips?: VideoClip[] } } | undefined)?.chain?.clips ?? [];
  const recipe = (video?.input as { chain?: VideoChain } | undefined)?.chain?.recipe;
  if (clips.length !== (recipe?.blocks ?? REEL.video.blocks) || clips.some((clip) => !video?.assets.some((asset) => asset.url === clip.url))) throw new UserError("Conclua a geração antes de finalizar o vídeo.");
  if (clips.length === 1 && video) {
    // Native output is already complete: reuse it without another provider request or charge.
    return prisma.$transaction(async (tx) => {
      const assembly = await tx.step.findFirst({ where: { contentId: input.contentId, kind: "ASSEMBLY" } });
      if (!assembly) throw new UserError("Etapa de montagem não encontrada.");
      const claimed = await tx.step.updateMany({ where: { id: assembly.id, status: { in: ["PENDING", "QUOTED"] } }, data: {
        status: "DONE", submissionState: "completed", model: "labia/reuse-video", estimatedCostBrl: 0, actualCostBrl: 0,
        completedAt: new Date(), operationKey: `${input.intentId}:ASSEMBLY`, input: { sourceStepId: video.id },
      } });
      if (!claimed.count) return { started: 0 };
      const asset = video.assets.find((item) => item.url === clips[0].url)!;
      await tx.asset.create({ data: { userId: input.userId, influencerId: input.influencerId, contentId: input.contentId, stepId: assembly.id, kind: "VIDEO", url: asset.url, width: asset.width, height: asset.height, durationSec: asset.durationSec } });
      await tx.content.update({ where: { id: input.contentId }, data: { status: "REVIEW" } });
      return { started: 1 };
    });
  }
  return startPlan({ ...input, contentKind: "ASSEMBLY", plan: [{ role: null, model: MERGE_MODEL, params: { video_urls: clips.map((clip) => clip.url) } }] });
}
