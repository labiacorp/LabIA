"use server";
import { redirect } from "next/navigation";
import { AuthError, CredentialsSignin } from "next-auth";
import { z } from "zod";
import { cookies } from "next/headers";
import { isAllowed, signIn } from "@/auth";
import { hashPassword, passwordError } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { clientIp, hit, TOO_MANY_ATTEMPTS } from "@/lib/rate-limit";
import { admitted, registerSignIn, REFERRAL_COOKIE } from "@/lib/referrals";
import { googleConfigured } from "@/lib/auth-config";
import { emailEnabled } from "@/lib/email";
import { issueEmailToken } from "@/lib/email-tokens";
import { CONSENT_FIELD, consentAcceptedNow, GOOGLE_TERMS_COOKIE } from "@/lib/consent";
import { sendAccountExists, sendVerifyEmail } from "@/lib/account-emails";
// Terms are accepted BEFORE the Google account is created: the checkbox is required here, and the cookie
// carries the acceptance across the OAuth round trip so the new account is recorded as having accepted.
export async function loginGoogle(form: FormData) {
  if (!googleConfigured()) return;
  if (form.get(CONSENT_FIELD) !== "on") redirect("/login?error=consent");
  (await cookies()).set(GOOGLE_TERMS_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 900, path: "/" });
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

// Closed beta: signup needs the access pass and, when ALLOWED_EMAILS is set, a listed e-mail.
// Signup never signs in: it sends a confirmation link and code, and the password provider refuses an
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
  if (!(await admitted())) redirect("/acesso");
  if (create) {
    if (!emailEnabled()) return { error: "O cadastro com senha ainda não está disponível." };
    const invalid = passwordError(password);
    if (invalid) return { error: invalid };
    if (form.get(CONSENT_FIELD) !== "on")
      return { error: "Para criar a conta, aceite os Termos de Uso e a Política de Privacidade." };
    if (!isAllowed(email.data))
      return { error: "Este e-mail não tem acesso à beta. Confira o convite que você recebeu." };
    if (!(await hit(`signup-ip:${await clientIp()}`, 5, 3600)))
      return { error: TOO_MANY_ATTEMPTS };
    try {
      if (await prisma.user.findUnique({ where: { email: email.data }, select: { id: true } })) {
        await sendAccountExists(email.data);
      } else {
        const user = await registerSignIn({ email: email.data }, (await cookies()).get(REFERRAL_COOKIE)?.value);
        // Only claims an account that still has no password, so a racing signup cannot overwrite another one.
        const claimed = await prisma.user.updateMany({
          where: { id: user.id, passwordHash: null },
          data: { passwordHash: await hashPassword(password), ...consentAcceptedNow() },
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
      return { error: "E-mail ou senha incorretos. Se ainda não tem conta, use a opção criar com senha abaixo." };
    }
    throw error;
  }
  return { error: "" };
}
