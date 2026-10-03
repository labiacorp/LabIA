import type { CostEstimate, GenParams, GenerationResult } from "./model-provider";

// Verified against fal's official schemas/prices on 2026-10-03; both are listed at $0/compute second.
// Metadata with extract_frames returns end_frame_url AND real duration, avoiding a separate paid extraction.
export const METADATA_MODEL = "fal-ai/ffmpeg-api/metadata";
export const MERGE_MODEL = "fal-ai/ffmpeg-api/merge-videos";
export const isFfmpeg = (model: string) => model === METADATA_MODEL || model === MERGE_MODEL;
export const ffmpegCost = (): CostEstimate => ({ usd: 0, brl: 0, billingMode: "api", source: "fal.ai FFmpeg API pricing, 2026-10-03" });

export function ffmpegInput(model: string, params: GenParams) {
  if (model === METADATA_MODEL) return { media_url: params.media_url, extract_frames: true };
  return { video_urls: params.video_urls, resolution_aspect_ratio_video_index: 0 };
}

export function ffmpegResult(model: string, requestId: string, raw: unknown): GenerationResult {
  const data = raw as { media?: { duration?: number; end_frame_url?: string }; video?: { url?: string }; metadata?: unknown };
  if (model === METADATA_MODEL && (!Number.isFinite(data.media?.duration) || Number(data.media?.duration) <= 0 || !data.media?.end_frame_url)) {
    throw new Error("fal metadata did not return a valid duration and end frame");
  }
  if (model === MERGE_MODEL && !data.video?.url) throw new Error("fal merge did not return a video URL");
  return { provider: "fal", model, requestId, images: [], videos: data.video?.url ? [{ url: data.video.url }] : [], cost: ffmpegCost(), raw };
}
