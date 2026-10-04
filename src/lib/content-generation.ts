import { prepareImage, IMAGE_DEFINITIONS } from "./providers/image-models";
import { REEL } from "@/lib/content-plan";
import { quote, startPlan, UserError, type PlanItem } from "@/lib/generation";
import { prisma } from "@/lib/prisma";

export type ImageSelection = { model: string; resolution: string };
export function sceneItem(prompt: string, frontUrl: string, aspectRatio: string, selection: ImageSelection = { model: REEL.image.model, resolution: "1K" }): PlanItem {
  const item: PlanItem = {
    role: null,
    model: selection.model,
    params: {
      prompt: `Create a photorealistic scene with the person in the reference portrait. Keep the same face and identity. No text or watermark. Scene: ${prompt}`,
      image_urls: [frontUrl],
      aspect_ratio: aspectRatio,
      resolution: selection.resolution,
    },
  };
  const prepared = prepareImage(item.model, item.params, Number(process.env.USD_BRL_RATE) || 5.4);
  item.params.imagePricing = prepared.snapshot;
  return item;
}

export const sceneQuote = (selection?: ImageSelection, aspectRatio = "9:16") => quote([sceneItem("estimate", "https://estimate", aspectRatio, selection)]);
export function getImageOptions(aspectRatio: string) {
  return IMAGE_DEFINITIONS.map((model) => ({ model: model.id, name: model.name, configurations: Object.keys(model.rates).flatMap((resolution) => {
    try { return [{ resolution, brl: sceneQuote({ model: model.id, resolution }, aspectRatio).totalBrl }]; } catch { return []; }
  }), maxPrompt: Math.min(2000, (model.maxPrompt ?? 4000) - 180), source: `https://fal.ai/models/${model.id}`, checkedOn: "2026-10-04" }));
}

export async function startContentImage(input: { userId: string; influencerId: string; contentId: string; intentId: string; expectedBrl: number; prompt: string; selection?: ImageSelection }) {
  const prompt = input.prompt.trim();
  if (!prompt || prompt.length > 2000) throw new UserError("Descreva a cena em até 2.000 caracteres.");
  const content = await prisma.content.findFirst({
    where: { id: input.contentId, influencerId: input.influencerId, influencer: { userId: input.userId } },
  });
  if (!content) throw new UserError("Conteúdo não encontrado.");
  const front = await prisma.asset.findFirst({
    where: { userId: input.userId, influencerId: input.influencerId, role: "FRONT", kind: "IMAGE", step: { status: { in: ["DONE", "APPROVED"] } } },
    orderBy: { createdAt: "desc" },
  });
  if (!front) throw new UserError("Gere o retrato de frente na aba Personagem antes de criar a cena.");
  let item: PlanItem;
  try { item = sceneItem(prompt, front.url, content.aspectRatio, input.selection); } catch (error) { throw new UserError(error instanceof Error ? error.message : "Configuração de imagem inválida."); }
  return startPlan({ ...input, plan: [item] });
}
