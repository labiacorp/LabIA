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
  const result = z.string().trim().min(1).max(80).safeParse(form.get("name"));
  if (!result.success)
    return { ok: false, message: "Use um nome entre 1 e 80 caracteres." };
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { name: result.data },
    });
  } catch {
    return {
      ok: false,
      message: "Não conseguimos salvar seu nome. Tente novamente.",
    };
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Seu nome foi atualizado." };
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
