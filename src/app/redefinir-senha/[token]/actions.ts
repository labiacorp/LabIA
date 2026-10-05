"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, passwordError } from "@/lib/password";
import { consumeEmailToken } from "@/lib/email-tokens";

export type ResetState = { error: string };

// The link proves the address, so it also confirms it. Every session ends: whoever was in with the
// old password is out.
export async function resetPassword(token: string, _previous: ResetState, form: FormData): Promise<ResetState> {
  const password = String(form.get("password") ?? "");
  const invalid = passwordError(password);
  if (invalid) return { error: invalid };
  const row = await consumeEmailToken(token, ["RESET"]);
  if (!row) return { error: "Este link já foi usado ou expirou. Peça um novo." };
  const user = await prisma.user.findUniqueOrThrow({ where: { id: row.userId }, select: { emailVerifiedAt: true } });
  await prisma.user.update({
    where: { id: row.userId },
    data: { passwordHash: await hashPassword(password), emailVerifiedAt: user.emailVerifiedAt ?? new Date(), tokenVersion: { increment: 1 } },
  });
  redirect("/login?aviso=senha-redefinida");
}
