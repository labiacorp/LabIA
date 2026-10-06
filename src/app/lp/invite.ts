"use server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, hit } from "@/lib/rate-limit";

export type InviteState = { ok?: boolean; error?: string };

// Same answer whether the address was new or already on the list, so the form cannot be used to probe it.
export async function requestInvite(_previous: InviteState, form: FormData): Promise<InviteState> {
  const email = z.email().max(200).safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { error: "Confere o e-mail, falta o @ ou o domínio." };
  if (!(await hit(`invite-ip:${await clientIp()}`, 5, 3600))) return { error: "Muitas tentativas. Tente de novo mais tarde." };
  await prisma.inviteRequest.upsert({ where: { email: email.data }, update: {}, create: { email: email.data } });
  return { ok: true };
}
