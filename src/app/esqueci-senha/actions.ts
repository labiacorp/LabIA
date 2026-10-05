"use server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, hit, TOO_MANY_ATTEMPTS } from "@/lib/rate-limit";
import { issueEmailToken } from "@/lib/email-tokens";
import { sendResetEmail } from "@/lib/account-emails";

export type ForgotState = { error: string; sent?: boolean };

// Same answer whether or not the address has an account. Works for Google-only accounts too: the
// link proves the address, so it is also how such an account gets a password.
export async function requestPasswordReset(_previous: ForgotState, form: FormData): Promise<ForgotState> {
  const email = z.email().safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { error: "Digite um e-mail válido." };
  if (!(await hit(`reset-email:${email.data}`, 3, 900)) || !(await hit(`reset-ip:${await clientIp()}`, 10, 900)))
    return { error: TOO_MANY_ATTEMPTS };
  const user = await prisma.user.findUnique({ where: { email: email.data }, select: { id: true } });
  if (user) {
    const { token } = await issueEmailToken(user.id, "RESET");
    try {
      await sendResetEmail(email.data, token);
    } catch {
      return { error: "Não conseguimos enviar o e-mail. Tente novamente em instantes." };
    }
  }
  return { error: "", sent: true };
}
