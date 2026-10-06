"use server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { after } from "next/server";
import { clientIp, hit } from "@/lib/rate-limit";
import { emailEnabled } from "@/lib/email";
import { issueEmailToken } from "@/lib/email-tokens";
import { sendTeamAccessEmail } from "@/lib/account-emails";

export type InviteState = { ok?: boolean; error?: string };

// Same answer whether the address was new, already on the list, or a team account, so the form cannot be used
// to probe it. A team (OWNER) address also gets a one-time link by e-mail, sent after the response so the
// timing does not tell either: knowing the address is not enough, the link only reaches that inbox.
export async function requestInvite(_previous: InviteState, form: FormData): Promise<InviteState> {
  const email = z.email().max(200).safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  if (!email.success) return { error: "Confere o e-mail, falta o @ ou o domínio." };
  if (!(await hit(`invite-ip:${await clientIp()}`, 5, 3600))) return { error: "Muitas tentativas. Tente de novo mais tarde." };
  const owner = await prisma.user.findFirst({ where: { email: email.data, role: "OWNER" }, select: { id: true } });
  if (!owner) await prisma.inviteRequest.upsert({ where: { email: email.data }, update: {}, create: { email: email.data } });
  else if (emailEnabled() && (await hit(`team-link:${owner.id}`, 3, 3600)))
    after(async () => {
      const { token } = await issueEmailToken(owner.id, "TEAM_ACCESS");
      await sendTeamAccessEmail(email.data, token).catch((error) => console.error("team access e-mail", error));
    });
  return { ok: true };
}
