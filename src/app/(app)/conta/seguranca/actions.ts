"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { hashPassword, passwordError } from "@/lib/password";
import { confirmIdentity, identityMessages } from "@/lib/reauth";
import { emailEnabled } from "@/lib/email";
import { issueEmailToken } from "@/lib/email-tokens";
import { sendEmailChangeConfirm } from "@/lib/account-emails";
import { removeReference } from "@/lib/reference-storage";
import { hit, TOO_MANY_ATTEMPTS } from "@/lib/rate-limit";
import { disconnectAccount } from "@/lib/social/posts";

export type SecurityState = { error: string; message?: string; needsReauth?: boolean };

async function identity(userId: string, form: FormData): Promise<SecurityState | null> {
  const result = await confirmIdentity(userId, await auth(), String(form.get("currentPassword") ?? ""));
  return result === "ok" ? null : { error: identityMessages[result], needsReauth: result === "needs-reauth" };
}

// Setting a first password (Google-only account) or replacing one. Replacing it ends every other
// session, then signs this one back in with the new password so the user stays where they are.
export async function setPassword(_previous: SecurityState, form: FormData): Promise<SecurityState> {
  const userId = await requireUserId();
  const refused = await identity(userId, form);
  if (refused) return refused;
  const password = String(form.get("newPassword") ?? "");
  const invalid = passwordError(password);
  if (invalid) return { error: invalid };
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, passwordHash: true } });
  const hash = await hashPassword(password);
  if (!user.passwordHash) {
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
    return { error: "", message: "Senha criada. Você pode entrar com o Google ou com o e-mail e esta senha." };
  }
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash, tokenVersion: { increment: 1 } } });
  await signIn("password", { email: user.email, password, redirectTo: "/conta/seguranca?aviso=senha" });
  return { error: "" };
}

// The current address keeps working until the new one is confirmed from its own inbox (a typo must not
// lock anyone out). Taken addresses get the same vague answer as any other failure.
export async function requestEmailChange(_previous: SecurityState, form: FormData): Promise<SecurityState> {
  const userId = await requireUserId();
  if (!emailEnabled()) return { error: "A troca de e-mail ainda não está disponível." };
  const email = z.email().safeParse(String(form.get("newEmail") ?? "").trim().toLowerCase());
  if (!email.success) return { error: "Digite um e-mail válido." };
  if (!(await hit(`email-change:${userId}`, 3, 3600))) return { error: TOO_MANY_ATTEMPTS };
  const refused = await identity(userId, form);
  if (refused) return refused;
  const current = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  if (email.data === current.email) return { error: "Este já é o seu e-mail." };
  if (await prisma.user.findUnique({ where: { email: email.data }, select: { id: true } }))
    return { error: "Não foi possível usar este e-mail. Escolha outro." };
  const { token } = await issueEmailToken(userId, "CHANGE_EMAIL", email.data);
  try {
    await sendEmailChangeConfirm(email.data, token);
  } catch {
    return { error: "Não conseguimos enviar o e-mail. Tente novamente em instantes." };
  }
  return { error: "", message: `Enviamos um link para ${email.data}. Seu e-mail atual continua valendo até você confirmar.` };
}

// Refused while money is unresolved: a generation running, a submission whose cost is unknown, or a post being sent.
// The guard sits inside the delete itself, so a generation started a moment earlier still blocks it.
// Ledger rows go with the account (top-ups are manual and there are no card payments yet).
export async function deleteAccount(_previous: SecurityState, form: FormData): Promise<SecurityState> {
  const userId = await requireUserId();
  if (String(form.get("confirmation") ?? "").trim().toUpperCase() !== "EXCLUIR") return { error: "Digite EXCLUIR para confirmar." };
  const refused = await identity(userId, form);
  if (refused) return refused;
  const files = await prisma.asset.findMany({ where: { userId, storageKey: { not: null } }, select: { storageKey: true } });
  const open = { some: { OR: [{ status: "RUNNING" as const }, { submissionState: { in: ["submitting", "submission_unknown", "cost_unknown"] } }] } };
  const stepsBlocked = { OR: [{ steps: open }, { contents: { some: { steps: open } } }] };
  const publishing = { status: "PUBLISHING" as const };
  const PUBLISHING_MESSAGE = "Aguarde a publicação em andamento terminar.";
  const GENERATION_MESSAGE = "Há uma geração em andamento ou com custo a confirmar. Espere ela terminar ou fale com a equipe.";
  // Pre-checks first, so a refused deletion leaves the connected accounts and scheduled posts alone.
  if (await prisma.socialPost.count({ where: { userId, ...publishing } })) return { error: PUBLISHING_MESSAGE };
  if (await prisma.influencer.count({ where: { userId, ...stepsBlocked } })) return { error: GENERATION_MESSAGE };
  // Best effort: cancels scheduled posts with refunds and revokes the X tokens before the cascade.
  const accounts = await prisma.socialAccount.findMany({ where: { userId, status: { not: "DISCONNECTED" } }, select: { id: true } });
  await Promise.allSettled(accounts.map((account) => disconnectAccount(userId, account.id)));
  const deleted = await prisma.user.deleteMany({
    where: { id: userId, influencers: { none: stepsBlocked }, socialPosts: { none: publishing } },
  });
  if (deleted.count === 0) return { error: (await prisma.socialPost.count({ where: { userId, ...publishing } })) ? PUBLISHING_MESSAGE : GENERATION_MESSAGE };
  await Promise.allSettled(files.map((file) => removeReference(file.storageKey!)));
  await signOut({ redirect: false });
  redirect("/login?aviso=conta-excluida");
}

export async function reauthWithGoogle() {
  await signIn("google", { redirectTo: "/conta/seguranca" }, { prompt: "login" });
}
