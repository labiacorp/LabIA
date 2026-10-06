"use server";

import { redirect } from "next/navigation";

import { codeMatches, gateMode, grantPass } from "@/lib/access";
import { consumeEmailToken } from "@/lib/email-tokens";
import { clientIp, hit, TOO_MANY_ATTEMPTS } from "@/lib/rate-limit";

export type UnlockState = { error?: string };

// 8 tries per 10 minutes per IP: the only defence against guessing the shared code.
export async function unlockAction(_previous: UnlockState, formData: FormData): Promise<UnlockState> {
  if (gateMode() !== "on") return { error: "O acesso está indisponível neste momento." };
  // Fail closed: if the counter cannot be read, nobody gets to guess.
  const allowed = await hit(`access-ip:${await clientIp()}`, 8, 600).catch(() => false);
  if (!allowed) return { error: TOO_MANY_ATTEMPTS };
  // One answer for any miss: nothing says how close the guess was.
  if (!codeMatches(String(formData.get("code") ?? ""))) return { error: "Código incorreto." };

  await grantPass();
  redirect("/login");
}

// One-time link mailed to a team address: valid once, for 15 minutes. It opens the sign-in form; the sign-in
// itself still needs that owner's Google account or password.
export async function openTeamLink(token: string) {
  const row = gateMode() === "on" ? await consumeEmailToken(token, ["TEAM_ACCESS"]) : null;
  if (!row) redirect(`/acesso/${token}?erro=1`);
  await grantPass();
  redirect("/login");
}
