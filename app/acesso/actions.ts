"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACCESS_COOKIE, ACCESS_TTL_SECONDS, codeMatches, gateMode, signAccessPass } from "@/lib/auth/access-gate";
import { safeNextPath } from "@/lib/auth/next-path";
import { allow, clientIp, TOO_MANY_ATTEMPTS } from "@/lib/auth/rate-limit";

export type UnlockState = { error?: string };

export async function unlockAction(_previous: UnlockState, formData: FormData): Promise<UnlockState> {
  if (gateMode() !== "on") return { error: "O acesso está indisponível neste momento." };
  if (!(await allow([["access-ip", await clientIp()]]))) return { error: TOO_MANY_ATTEMPTS };
  // One answer for any miss: nothing here says how close the guess was.
  if (!codeMatches(String(formData.get("code") ?? ""))) return { error: "Código incorreto." };

  (await cookies()).set(ACCESS_COOKIE, signAccessPass(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACCESS_TTL_SECONDS,
  });
  const next = formData.get("next");
  redirect(typeof next === "string" && next.startsWith("/") ? safeNextPath(next) : "/entrar");
}
