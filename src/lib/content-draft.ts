import { prisma } from "@/lib/prisma";
import { PIPELINE } from "@/lib/pipeline";
import type { ImageSelection } from "@/lib/content-generation";
import type { VideoSelection } from "@/lib/video-options";

export type DraftSettings = {
  image?: ImageSelection & { brl: number };
  video?: VideoSelection & { brl: number };
};

function stepSettings(chosen: DraftSettings["image"] | DraftSettings["video"]) {
  if (!chosen) return {};
  const { brl, ...selection } = chosen;
  return { model: selection.model, input: { selection }, estimatedCostBrl: brl };
}

// One place that makes a free draft (content + its empty pipeline), used by the app form and the MCP tool.
// Returns null when the influencer is not the user's. An optional script marks the script step done at no cost.
export async function createContentDraft(userId: string, input: { influencerId: string; title: string; idea: string; script?: string; aspectRatio: "9:16" | "16:9" | "1:1"; settings?: DraftSettings }) {
  const character = await prisma.influencer.findFirst({ where: { id: input.influencerId, userId }, select: { id: true } });
  if (!character) return null;
  const { script, settings, ...draft } = input;
  return prisma.content.create({
    data: {
      ...draft,
      steps: {
        create: PIPELINE.map((step, position) => ({
          kind: step.kind,
          position,
          ...stepSettings(step.kind === "IMAGE" ? settings?.image : step.kind === "VIDEO" ? settings?.video : undefined),
          ...(step.kind === "SCRIPT" && script ? { input: { script }, status: "DONE" as const, actualCostBrl: 0, completedAt: new Date() } : {}),
        })),
      },
    },
    select: { id: true, influencerId: true },
  });
}
