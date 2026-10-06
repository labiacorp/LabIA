"use server";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { SocialError, cancelPost, disconnectAccount } from "@/lib/social/posts";

const FALLBACK = "Não foi possível concluir. Tente de novo.";
const message = (error: unknown) => (error instanceof SocialError ? error.message : FALLBACK);

export async function disconnectAction(accountId: string): Promise<{ error: string } | { canceled: number }> {
  const userId = await requireUserId();
  try {
    const result = await disconnectAccount(userId, accountId);
    revalidatePath("/integracoes");
    return result;
  } catch (error) {
    return { error: message(error) };
  }
}

export async function cancelPostAction(postId: string): Promise<{ error: string } | { ok: true }> {
  const userId = await requireUserId();
  try {
    await cancelPost(userId, postId);
    revalidatePath("/integracoes");
    return { ok: true };
  } catch (error) {
    return { error: message(error) };
  }
}
