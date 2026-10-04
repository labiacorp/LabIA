"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
const schema = z.object({
  faceAssetId: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(60),
  niche: z.string().trim().min(1).max(80),
  tone: z.string().trim().min(1).max(80),
  persona: z.string().trim().max(2000),
  visualSignature: z.string().trim().max(500),
});
export async function saveInfluencer(
  id: string,
  _previous: { error: string; message: string },
  form: FormData,
) {
  const userId = await requireUserId();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      error: "Confira nome, nicho e tom e respeite os limites dos campos.",
      message: "",
    };
  try {
    if (
      parsed.data.faceAssetId &&
      !(await prisma.asset.findFirst({
        where: {
          id: parsed.data.faceAssetId,
          userId,
          influencerId: id,
          kind: "IMAGE",
          role: "FRONT",
          step: { status: { in: ["DONE", "APPROVED"] } },
        },
        select: { id: true },
      }))
    )
      return {
        error: "Escolha um retrato pronto deste personagem.",
        message: "",
      };
    const result = await prisma.influencer.updateMany({
      where: { id, userId },
      data: parsed.data,
    });
    if (result.count !== 1)
      return { error: "Personagem não encontrado.", message: "" };
  } catch {
    return {
      error: "Não conseguimos salvar o perfil. Tente novamente.",
      message: "",
    };
  }
  revalidatePath("/", "layout");
  return {
    error: "",
    message: "Perfil salvo. As referências já geradas continuam disponíveis.",
  };
}
