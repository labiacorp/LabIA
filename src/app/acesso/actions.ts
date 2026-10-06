"use server";

import { redirect } from "next/navigation";

import { codeMatches, gateMode, grantPass } from "@/lib/access";
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
