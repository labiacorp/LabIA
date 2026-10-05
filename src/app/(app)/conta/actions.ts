"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

export async function updateAccount(
  _previous: { message: string; ok: boolean },
  form: FormData,
) {
  const userId = await requireUserId();
  const result = z
    .object({
      name: z.string().trim().min(1).max(80),
      bio: z.string().trim().max(240).optional(),
      defaultAspectRatio: z.enum(["9:16", "16:9", "1:1"]).optional(),
      defaultContentView: z.enum(["steps", "canvas"]).optional(),
    })
    .safeParse(Object.fromEntries(form));
  if (!result.success)
    return {
      ok: false,
      message:
        "Confira o nome e os valores informados.",
    };
  try {
    await prisma.user.update({
      where: { id: userId },
      data: result.data,
    });
  } catch {
    return {
      ok: false,
      message: "Não conseguimos salvar seu perfil. Tente novamente.",
    };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Seu perfil foi atualizado." };
}
