"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { CONSENT_FIELDS, consentAcceptedNow } from "@/lib/consent";

export async function acceptTerms(_previous: { error: string }, form: FormData) {
  const userId = await requireUserId();
  if (CONSENT_FIELDS.some((field) => form.get(field) !== "on")) return { error: "Accept the terms to continue." };
  // Only the first acceptance is recorded; a replayed submit never rewrites its date or version.
  await prisma.user.updateMany({ where: { id: userId, consentAcceptedAt: null }, data: consentAcceptedNow() });
  redirect("/painel");
}
