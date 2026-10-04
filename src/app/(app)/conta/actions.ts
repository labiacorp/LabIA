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
      bio: z.string().trim().max(240).default(""),
      defaultAspectRatio: z.enum(["9:16", "16:9", "1:1"]).default("9:16"),
      defaultContentView: z.enum(["steps", "canvas"]).default("steps"),
    })
    .safeParse(Object.fromEntries(form));
  if (!result.success)
    return {
      ok: false,
      message:
        "Use um nome entre 1 e 80 caracteres, uma bio de até 240 e preferências válidas.",
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

export async function revokeSessions() {
  const userId = await requireUserId();
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
  const { signOut } = await import("@/auth");
  await signOut({ redirectTo: "/login" });
}
