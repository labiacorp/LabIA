import type { StepKind } from "@/generated/prisma/enums";
import { getProvider } from "@/lib/provider";

// Default recipe for a 15s reel: one scene image from the front portrait, then three chained 5s video blocks.
// Kling 2.5 turbo matches the 5s block from the meeting; Hailuo 2.3 is cheaper per clip but only does 6s or 10s.
export const REEL = {
  image: { model: "fal-ai/nano-banana-2/edit", params: { prompt: "estimate", image_urls: ["https://estimate"], resolution: "1K" } },
  video: { model: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video", params: { prompt: "estimate", duration: "5" }, blocks: 3 },
} as const;

// null = no price yet (the script step has no model chosen). Voice and lip sync are not priced yet either.
export function estimateReel(): { perStep: Partial<Record<StepKind, number | null>>; totalBrl: number } {
  const provider = getProvider();
  const image = provider.estimateCost(REEL.image.model, REEL.image.params).brl;
  const video = provider.estimateCost(REEL.video.model, REEL.video.params).brl * REEL.video.blocks;
  const round = (value: number) => Math.round(value * 100) / 100;
  return { perStep: { SCRIPT: null, IMAGE: round(image), VIDEO: round(video), ASSEMBLY: 0 }, totalBrl: round(image + video) };
}
