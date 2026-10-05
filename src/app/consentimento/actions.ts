"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { CONSENT_FIELD, consentAcceptedNow } from "@/lib/consent";

export async function acceptTerms(_previous: { error: string }, form: FormData) {
  const userId = await requireUserId();
  if (form.get(CONSENT_FIELD) !== "on") return { error: "Para continuar, aceite os Termos de Uso e a Política de Privacidade." };
  // Only the first acceptance is recorded; a replayed submit never rewrites its date or version.
  await prisma.user.updateMany({ where: { id: userId, consentAcceptedAt: null }, data: consentAcceptedNow() });
  redirect("/painel");
}
