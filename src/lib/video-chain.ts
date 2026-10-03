import type { Prisma, Step } from "@/generated/prisma/client";
import { REEL } from "@/lib/content-plan";
import { quote, startPlan, submit, UserError, type PlanItem } from "@/lib/generation";
import { getProvider } from "@/lib/provider";
import { prisma } from "@/lib/prisma";
import { MERGE_MODEL, METADATA_MODEL } from "@/lib/providers/ffmpeg";
import type { GenerationResult, GenParams } from "@/lib/providers/model-provider";

export type VideoClip = { url: string; duration: number; usd: number; brl: number; endFrameUrl: string };
export type VideoChain = { phase: "video" | "metadata"; prompt: string; clips: VideoClip[]; pendingUrl?: string };
const round4 = (n: number) => Math.round(n * 10000) / 10000;

export function reelItem(prompt: string, imageUrl: string): PlanItem {
  return { role: null, model: REEL.video.model, quantity: REEL.video.blocks, params: {
    prompt, image_url: imageUrl, duration: "5", chain: { phase: "video", prompt, clips: [] } satisfies VideoChain,
  } };
}
export const videoQuote = () => quote([reelItem("estimate", "https://estimate")]);

export async function startContentVideo(input: { userId: string; influencerId: string; contentId: string; intentId: string; expectedBrl: number; prompt: string }) {
  const prompt = input.prompt.trim();
  if (!prompt || prompt.length > 2000) throw new UserError("Descreva o movimento em até 2.000 caracteres.");
  const scene = await prisma.asset.findFirst({
    where: { userId: input.userId, contentId: input.contentId, content: { influencerId: input.influencerId }, kind: "IMAGE", step: { kind: "IMAGE", status: { in: ["DONE", "APPROVED"] } } },
    orderBy: { createdAt: "desc" },
  });
  if (!scene) throw new UserError("Gere a imagem da cena antes do vídeo.");
  return startPlan({ ...input, contentKind: "VIDEO", plan: [reelItem(prompt, scene.url)] });
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
    const media = (result.raw as { media: { duration: number; end_frame_url: string } }).media;
    if (!Number.isFinite(media?.duration) || media.duration <= 0 || !media.end_frame_url || !chain.pendingUrl) {
      throw new Error("Não foi possível verificar a duração e o último quadro.");
    }
    // Same pricing function as V1, now with duration read from the actual media instead of the requested 5s.
    const actual = getProvider().estimateCost(REEL.video.model, { prompt: chain.prompt, duration: media.duration });
    const clips = [...chain.clips, { url: chain.pendingUrl, duration: media.duration, usd: actual.usd, brl: actual.brl, endFrameUrl: media.end_frame_url }];
    consumed = round4(clips.reduce((sum, clip) => sum + clip.brl, 0));
    if (clips.length === REEL.video.blocks) {
      return {
        provider: "fal", model: REEL.video.model, requestId: result.requestId, images: [],
        videos: clips.map((clip) => ({ url: clip.url, durationSeconds: clip.duration })),
        cost: { usd: clips.reduce((sum, clip) => sum + clip.usd, 0), brl: consumed, billingMode: "api" }, raw: { clips },
      };
    }
    next = {
      prompt: `Continue the action smoothly from this last frame. Keep the same face, outfit, lighting and scene.\n\nScene context: ${chain.prompt}`,
      image_url: media.end_frame_url, duration: "5", chain: { phase: "video", prompt: chain.prompt, clips } satisfies VideoChain,
    };
    model = REEL.video.model;
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
    where: { contentId: input.contentId, content: { influencerId: input.influencerId, influencer: { userId: input.userId } }, kind: "VIDEO", status: "DONE" },
    include: { assets: true },
  });
  // Asset timestamps share the transaction timestamp. Persisted chain order is the source of truth.
  const clips = (video?.input as { chain?: { clips?: VideoClip[] } } | undefined)?.chain?.clips ?? [];
  if (clips.length !== REEL.video.blocks || clips.some((clip) => !video?.assets.some((asset) => asset.url === clip.url))) throw new UserError("Conclua os três clipes antes de montar o vídeo.");
  return startPlan({ ...input, contentKind: "ASSEMBLY", plan: [{ role: null, model: MERGE_MODEL, params: { video_urls: clips.map((clip) => clip.url) } }] });
}
