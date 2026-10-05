import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { hit } from "@/lib/rate-limit";

// Changing the e-mail, the password or deleting the account needs proof it is still the owner:
// the current password when the account has one, otherwise a Google sign-in from the last 5 minutes
// (the dev provider stands in for Google only in development). Same window Leaner uses.
export const REAUTH_WINDOW_MS = 5 * 60_000;

export function recentlySignedIn(session: Session | null, now = Date.now()) {
  const method = session?.authMethod;
  const viaGoogle = method === "google" || (process.env.NODE_ENV === "development" && method === "dev");
  return viaGoogle && typeof session?.authAt === "number" && now - session.authAt < REAUTH_WINDOW_MS;
}

export type Identity = "ok" | "wrong-password" | "needs-reauth" | "too-many";

export async function confirmIdentity(userId: string, session: Session | null, currentPassword: string): Promise<Identity> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true } });
  if (!user.passwordHash) return recentlySignedIn(session) ? "ok" : "needs-reauth";
  if (!(await hit(`reauth:${userId}`, 8, 900))) return "too-many";
  return (await verifyPassword(currentPassword, user.passwordHash)) ? "ok" : "wrong-password";
}

export const identityMessages: Record<Exclude<Identity, "ok">, string> = {
  "wrong-password": "Senha atual incorreta.",
  "needs-reauth": "Por segurança, confirme que é você entrando de novo com o Google.",
  "too-many": "Muitas tentativas. Espere alguns minutos e tente de novo.",
};
