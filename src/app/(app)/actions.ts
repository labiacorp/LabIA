"use server";

import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";

// Bumps tokenVersion first, so a copy of this cookie stops working too: "sair" and "sair de todos os
// navegadores" are the same operation (no per-device tracking), same as Leaner's logoutAction.
export async function logout() {
  const userId = await requireUserId();
  await prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } } });
  await signOut({ redirectTo: "/login" });
}
