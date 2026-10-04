"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { normalizeProfilePhoto } from "@/lib/profile-photo";
export async function updateAvatar(
  _previous: { error: string; message: string },
  form: FormData,
) {
  const userId = await requireUserId();
  const remove = form.get("intent") === "remove";
  let avatar: Uint8Array<ArrayBuffer> | null = null;
  if (!remove) {
    const file = form.get("avatar");
    if (!(file instanceof File))
      return { error: "Escolha uma foto para enviar.", message: "" };
    try {
      avatar = new Uint8Array(await normalizeProfilePhoto(file));
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Não conseguimos preparar a foto.",
        message: "",
      };
    }
  }
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { avatar, avatarUpdatedAt: remove ? null : new Date() },
    });
  } catch {
    return {
      error: "Não conseguimos salvar sua foto. Tente novamente.",
      message: "",
    };
  }
  revalidatePath("/", "layout");
  return {
    error: "",
    message: remove ? "Foto removida." : "Foto de perfil atualizada.",
  };
}
