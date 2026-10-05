"use server";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { cookies } from "next/headers";
import { isAllowed, signIn } from "@/auth";
import { hasPass } from "@/lib/access";
import { hashPassword, passwordError } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { clientIp, hit, TOO_MANY_ATTEMPTS } from "@/lib/rate-limit";
import { registerSignIn, REFERRAL_COOKIE } from "@/lib/referrals";
import { googleConfigured } from "@/lib/auth-config";
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

export type PasswordState = { error: string };

// Closed beta: signup needs the access pass and, when ALLOWED_EMAILS is set, a listed e-mail.
// ponytail: no e-mail verification yet, so the pass + allowlist are what stop someone claiming another person's address. Add a mailed link before opening the beta.
export async function authenticatePassword(
  _previous: PasswordState,
  form: FormData,
): Promise<PasswordState> {
  const create = form.get("mode") === "signup";
  const email = z.email().safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  const password = String(form.get("password") ?? "");
  if (!email.success) return { error: "Digite um e-mail válido." };
  if (!(await hasPass())) redirect("/acesso");
  if (create) {
    const invalid = passwordError(password);
    if (invalid) return { error: invalid };
    if (!isAllowed(email.data))
      return { error: "Este e-mail não tem acesso à beta. Confira o convite que você recebeu." };
    if (!(await hit(`signup-ip:${await clientIp()}`, 5, 3600)))
      return { error: TOO_MANY_ATTEMPTS };
    if (await prisma.user.findUnique({ where: { email: email.data }, select: { id: true } }))
      return { error: "Já existe uma conta com este e-mail. Entre com a sua senha ou com o Google." };
    const user = await registerSignIn({ email: email.data }, (await cookies()).get(REFERRAL_COOKIE)?.value);
    // Only claims an account that still has no password, so a racing signup cannot overwrite another one.
    const claimed = await prisma.user.updateMany({
      where: { id: user.id, passwordHash: null },
      data: { passwordHash: await hashPassword(password) },
    });
    if (claimed.count !== 1) return { error: "Já existe uma conta com este e-mail." };
  }
  try {
    await signIn("password", { email: email.data, password, redirectTo: "/painel" });
  } catch (error) {
    if (error instanceof AuthError)
      return { error: create ? "Conta criada, mas não foi possível entrar. Tente entrar de novo." : "E-mail ou senha incorretos. Se ainda não tem conta, use "criar com senha" abaixo." };
    throw error;
  }
  return { error: "" };
}
