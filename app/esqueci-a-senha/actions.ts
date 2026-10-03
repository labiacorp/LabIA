"use server";

import { z } from "zod";

import { allow, clientIp, normalizeEmail, TOO_MANY_ATTEMPTS } from "@/lib/auth/rate-limit";
import { sendPasswordRecovery } from "@/lib/auth/auth-email";
import { getSupabaseAuthEnv } from "@/lib/auth/session";

export type ForgotState = { error?: string; sent?: boolean };

// A resposta é sempre a mesma: exista a conta ou não, o e-mail tenha ou não sido enviado.
export async function forgotPasswordAction(_previous: ForgotState, formData: FormData): Promise<ForgotState> {
  const parsed = z.string().trim().email().max(254).safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Informe um e-mail válido." };
  if (!getSupabaseAuthEnv()) return { error: "Recuperação indisponível: o Supabase não está configurado neste ambiente." };
  const email = normalizeEmail(parsed.data);

  if (!(await allow([["forgot-ip", await clientIp()], ["forgot-email", email]]))) return { error: TOO_MANY_ATTEMPTS };

  const { error } = await sendPasswordRecovery(email);
  // Só o limite do Supabase aparece (vale para qualquer e-mail, então não revela nada).
  if (error?.status === 429) return { error: TOO_MANY_ATTEMPTS };
  return { sent: true };
}
