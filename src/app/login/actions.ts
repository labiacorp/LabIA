"use server";
import { redirect } from "next/navigation";
import { AuthError, CredentialsSignin } from "next-auth";
import { z } from "zod";
import { cookies } from "next/headers";
import { ownersOnly, signIn } from "@/auth";
import { hashPassword, passwordError } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { clientIp, hit, TOO_MANY_ATTEMPTS } from "@/lib/rate-limit";
import { registerSignIn, REFERRAL_COOKIE } from "@/lib/referrals";
import { googleConfigured } from "@/lib/auth-config";
import { emailEnabled } from "@/lib/email";
import { issueEmailToken } from "@/lib/email-tokens";
import { sendAccountExists, sendVerifyEmail } from "@/lib/account-emails";
// Terms are accepted after the first sign-in, on "Antes de começar" (/consentimento), for every account alike.
export async function loginGoogle() {
  if (!googleConfigured()) return;
  try {
    await signIn("google", { redirectTo: "/painel" });
  } catch (error) {
    if (error instanceof AuthError)
      redirect(`/login?error=${encodeURIComponent(error.type)}`);
    throw error;
  }
}
export async function loginDevelopment(
  _previous: { error: string },
  form: FormData,
) {
  if (process.env.NODE_ENV !== "development")
    return { error: "Use o login com Google." };
  const parsed = z.email().safeParse(
    String(form.get("email") ?? "")
      .trim()
      .toLowerCase(),
  );
  if (!parsed.success) return { error: "Digite um e-mail válido." };
  try {
    await signIn("dev", { email: parsed.data, redirectTo: "/painel" });
  } catch (error) {
    if (error instanceof AuthError)
      return {
        error: "Este e-mail não está liberado. Confira seu acesso à beta.",
      };
    throw error;
  }
  return { error: "" };
}

export type PasswordState = { error: string; unverified?: string };

// Signup is the same for everyone (closed only when LABIA_CLOSED=1 in production). It never signs in: it sends a confirmation link and code, and the password provider refuses an
// unconfirmed address (src/auth.ts). An address that already has an account gets a "you already have
// an account" e-mail instead, and the form answers identically, so it reveals nothing.
export async function authenticatePassword(
  _previous: PasswordState,
  form: FormData,
): Promise<PasswordState> {
  const create = form.get("mode") === "signup";
  const email = z.email().safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  const password = String(form.get("password") ?? "");
  if (!email.success) return { error: "Digite um e-mail válido." };
  if (create) {
    if (ownersOnly() || !emailEnabled()) return { error: "A LabIA ainda não está aberta para novas contas." };
    const invalid = passwordError(password);
    if (invalid) return { error: invalid };
    if (!(await hit(`signup-ip:${await clientIp()}`, 5, 3600)))
      return { error: TOO_MANY_ATTEMPTS };
    try {
      if (await prisma.user.findUnique({ where: { email: email.data }, select: { id: true } })) {
        await sendAccountExists(email.data);
      } else {
        const name = String(form.get("name") ?? "").trim().slice(0, 80) || undefined;
        const user = await registerSignIn({ email: email.data, name }, (await cookies()).get(REFERRAL_COOKIE)?.value);
        // Only claims an account that still has no password, so a racing signup cannot overwrite another one.
        const claimed = await prisma.user.updateMany({
          where: { id: user.id, passwordHash: null },
          data: { passwordHash: await hashPassword(password) },
        });
        if (claimed.count === 1) {
          const { token, code } = await issueEmailToken(user.id, "VERIFY");
          await sendVerifyEmail(email.data, token, code!);
        } else await sendAccountExists(email.data);
      }
    } catch {
      return { error: "Não conseguimos enviar o e-mail de confirmação. Tente novamente em instantes." };
    }
    redirect(`/verificar-email?email=${encodeURIComponent(email.data)}`);
  }
  try {
    await signIn("password", { email: email.data, password, redirectTo: "/painel" });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error instanceof CredentialsSignin && error.code === "unverified")
        return emailEnabled()
          ? { error: "Confirme seu e-mail para entrar. Enviamos um link quando você criou a conta.", unverified: email.data }
          : { error: "Este e-mail ainda não foi confirmado. Fale com a equipe da LabIA." };
      return { error: "E-mail ou senha não conferem." };
    }
    throw error;
  }
  return { error: "" };
}
