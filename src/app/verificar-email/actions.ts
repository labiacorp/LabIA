"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, hit, TOO_MANY_ATTEMPTS } from "@/lib/rate-limit";
import { consumeEmailToken, consumeVerifyCode, issueEmailToken } from "@/lib/email-tokens";
import { sendEmailChangedNotice, sendVerifyEmail } from "@/lib/account-emails";

export type VerifyState = { error: string; message?: string };
const emailSchema = z.email();

export async function verifyCode(_previous: VerifyState, form: FormData): Promise<VerifyState> {
  const email = emailSchema.safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  if (!email.success || code.length !== 6) return { error: "Digite os 6 números do código." };
  if (!(await hit(`verify-code:${email.data}`, 10, 900))) return { error: TOO_MANY_ATTEMPTS };
  const user = await prisma.user.findUnique({ where: { email: email.data }, select: { id: true, emailVerifiedAt: true } });
  if (!user || user.emailVerifiedAt || !(await consumeVerifyCode(user.id, code)))
    return { error: "Código inválido ou expirado. Confira o último e-mail ou peça um novo." };
  await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
  redirect("/login?aviso=verificado");
}

// Same answer whether or not the address has an unconfirmed account.
export async function resendVerification(_previous: VerifyState, form: FormData): Promise<VerifyState> {
  const email = emailSchema.safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { error: "Digite um e-mail válido." };
  if (!(await hit(`verify-resend:${email.data}`, 3, 900)) || !(await hit(`verify-resend-ip:${await clientIp()}`, 10, 900)))
    return { error: TOO_MANY_ATTEMPTS };
  const user = await prisma.user.findUnique({ where: { email: email.data }, select: { id: true, emailVerifiedAt: true, passwordHash: true } });
  if (user && !user.emailVerifiedAt && user.passwordHash) {
    const { token, code } = await issueEmailToken(user.id, "VERIFY");
    try {
      await sendVerifyEmail(email.data, token, code!);
    } catch {
      return { error: "Não conseguimos enviar o e-mail. Tente novamente em instantes." };
    }
  }
  return { error: "", message: "Se este e-mail tiver uma conta aguardando confirmação, um novo link e código foram enviados." };
}

// The link opens a page with a button rather than confirming on GET, so a mail scanner that
// prefetches links cannot spend the token. Handles both a new account and an e-mail change.
export async function confirmEmailLink(token: string) {
  const row = await consumeEmailToken(token, ["VERIFY", "CHANGE_EMAIL"]);
  if (!row) redirect("/verificar-email?invalido=1");
  if (row.purpose === "VERIFY") {
    await prisma.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: new Date() } });
    redirect("/login?aviso=verificado");
  }
  const user = await prisma.user.findUniqueOrThrow({ where: { id: row.userId }, select: { email: true } });
  try {
    // Switching the login address ends every session: the next sign-in uses the new one.
    await prisma.user.update({ where: { id: row.userId }, data: { email: row.newEmail!, emailVerifiedAt: new Date(), tokenVersion: { increment: 1 } } });
  } catch {
    redirect("/verificar-email?invalido=em-uso");
  }
  await sendEmailChangedNotice(user.email, row.newEmail!).catch(() => {});
  redirect("/login?aviso=email-alterado");
}
