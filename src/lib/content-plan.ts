import type { StepKind } from "@/generated/prisma/enums";
import { getProvider } from "@/lib/provider";
import { usdBrlRate } from "@/lib/fx";
import { prepareVideo } from "@/lib/providers/video-models";
import { DEFAULT_VIDEO } from "@/lib/plan";

// Default recipe for a 15s reel: one scene image from the front portrait, then the default video (one native
// 15s clip). REEL.video is the legacy three-block Kling sequence, still offered in the video form.
export const REEL = {
  image: { model: "fal-ai/nano-banana-2/edit", params: { prompt: "estimate", image_urls: ["https://estimate"], resolution: "1K" } },
  video: { model: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video", params: { prompt: "estimate", image_url: "https://estimate", duration: "5", generate_audio: false }, blocks: 3 },
} as const;

// Kling clips come back a little over 5s often enough (measured 5.0 to 6.7s, billed per measured second), so the
// 15s reel is reserved at 6s per clip (x1.2) and the difference is returned when the real cost settles.
export const KLING_REEL_ALLOWANCE = 1.2;

// null = no price yet (the script step has no model chosen). Voice and lip sync are not priced yet either.
export function estimateReel(): { perStep: Partial<Record<StepKind, number | null>>; totalBrl: number } {
  const image = getProvider().estimateCost(REEL.image.model, REEL.image.params).brl;
  const video = prepareVideo(DEFAULT_VIDEO.model, { prompt: "estimate", image_url: "https://estimate", duration: DEFAULT_VIDEO.duration, resolution: DEFAULT_VIDEO.resolution, generate_audio: true }, usdBrlRate()).cost.brl;
  const round = (value: number) => Math.round(value * 100) / 100;
  return { perStep: { SCRIPT: null, IMAGE: round(image), VIDEO: round(video), ASSEMBLY: 0 }, totalBrl: round(image + video) };
}
