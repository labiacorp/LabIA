"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { DEFAULT_AFTER_LOGIN_PATH } from "@/lib/auth/next-path";
import { RECOVERY_COOKIE } from "@/lib/auth/recovery";
import { createSupabaseServerClient } from "@/lib/auth/session";

export type ResetState = { error?: string };

const passwordSchema = z.object({
  password: z.string().min(8, "A senha precisa ter de 8 a 72 caracteres.").max(72, "A senha precisa ter de 8 a 72 caracteres."),
  confirm: z.string(),
});

export async function resetPasswordAction(_previous: ResetState, formData: FormData): Promise<ResetState> {
  const cookieStore = await cookies();
  if (!cookieStore.get(RECOVERY_COOKIE)) redirect("/esqueci-a-senha?link=invalido");

  const parsed = passwordSchema.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (parsed.data.password !== parsed.data.confirm) return { error: "As senhas não são iguais." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { error: "Escolha uma senha diferente da atual." };
    if (error.code === "weak_password") return { error: "Senha fraca demais. Use uma senha mais longa ou menos comum." };
    return { error: "Não foi possível salvar a nova senha. Peça um novo link e tente de novo." };
  }

  // Quem tinha a senha antiga (ou uma sessão aberta com ela) sai: as outras sessões caem.
  await supabase.auth.signOut({ scope: "others" });
  cookieStore.delete({ name: RECOVERY_COOKIE, path: "/redefinir-senha" });
  redirect(DEFAULT_AFTER_LOGIN_PATH);
}
