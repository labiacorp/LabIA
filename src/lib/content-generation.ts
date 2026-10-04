import { REEL } from "@/lib/content-plan";
import { quote, startPlan, UserError, type PlanItem } from "@/lib/generation";
import { prisma } from "@/lib/prisma";

export function sceneItem(
  prompt: string,
  frontUrl: string,
  aspectRatio: string,
): PlanItem {
  return {
    role: null,
    model: REEL.image.model,
    params: {
      prompt: `Create a photorealistic scene with the person in the reference portrait. Keep the same face and identity. No text or watermark. Scene: ${prompt}`,
      image_urls: [frontUrl],
      aspect_ratio: aspectRatio,
      resolution: "1K",
    },
  };
}

export const sceneQuote = () =>
  quote([sceneItem("estimate", "https://estimate", "9:16")]);

export async function startContentImage(input: {
  userId: string;
  influencerId: string;
  contentId: string;
  intentId: string;
  expectedBrl: number;
  prompt: string;
}) {
  const prompt = input.prompt.trim();
  if (!prompt || prompt.length > 2000)
    throw new UserError("Descreva a cena em até 2.000 caracteres.");
  const content = await prisma.content.findFirst({
    where: {
      id: input.contentId,
      influencerId: input.influencerId,
      influencer: { userId: input.userId },
    },
    include: { influencer: { select: { faceAssetId: true } } },
  });
  if (!content) throw new UserError("Conteúdo não encontrado.");
  const front = await prisma.asset.findFirst({
    where: {
      id: content.influencer.faceAssetId ?? "",
      userId: input.userId,
      influencerId: input.influencerId,
      role: "FRONT",
      kind: "IMAGE",
      step: { status: { in: ["DONE", "APPROVED"] } },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!front)
    throw new UserError(
      "Gere o retrato de frente na aba Personagem antes de criar a cena.",
    );
  return startPlan({
    ...input,
    plan: [sceneItem(prompt, front.url, content.aspectRatio)],
  });
}
