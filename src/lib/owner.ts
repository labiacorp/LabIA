import { notFound } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Owner = a normal account with role OWNER (granted only by scripts/owner.ts, keyed to the account,
// never to an e-mail string, since a password signup proves nothing about the address it typed).
// The power also needs a Google session: a guessed password yields a normal account, never this.
// The dev provider stands in for Google only in local development.
export function ownerSession(session: Session | null) {
  const method = session?.authMethod;
  return method === "google" || (process.env.NODE_ENV === "development" && method === "dev");
}

// Read from the database on every call (not the JWT) so `owner.ts revoke` applies on the next request.
// notFound(), never a redirect: to anyone else /admin must look like a URL that was never built.
// Every admin page AND every admin action calls this; a layout does not protect a server action.
export async function requireOwner(): Promise<string> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId || !ownerSession(session)) notFound();
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "OWNER") notFound();
  return userId;
}
