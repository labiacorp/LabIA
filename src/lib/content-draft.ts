import { prisma } from "@/lib/prisma";
import { PIPELINE } from "@/lib/pipeline";

// One place that makes a free draft (content + its empty pipeline), used by the app form and the MCP tool.
// Returns null when the influencer is not the user's. An optional script marks the script step done at no cost.
export async function createContentDraft(userId: string, input: { influencerId: string; title: string; idea: string; script?: string; aspectRatio: "9:16" | "16:9" | "1:1" }) {
  const character = await prisma.influencer.findFirst({ where: { id: input.influencerId, userId }, select: { id: true } });
  if (!character) return null;
  const { script, ...draft } = input;
  return prisma.content.create({
    data: {
      ...draft,
      steps: {
        create: PIPELINE.map((step, position) => ({
          kind: step.kind,
          position,
          ...(step.kind === "SCRIPT" && script ? { input: { script }, status: "DONE" as const, actualCostBrl: 0, completedAt: new Date() } : {}),
        })),
      },
    },
    select: { id: true, influencerId: true },
  });
}
