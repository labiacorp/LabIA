import type { User } from "@supabase/supabase-js";

import { findOpenInvite, InviteTakenError, provisionAccount } from "@/lib/auth/invites";
import type { GoogleSignupClaim } from "@/lib/auth/invite-cookie";
import { displayName, resolveMembership } from "@/lib/auth/session";
import { isSignupOpen } from "@/lib/auth/signup-mode";

export type GoogleDenied = "unverified" | "invite" | "invite-taken" | "invite-email" | "consent";
export type GoogleOutcome = { ok: true } | { ok: false; reason: GoogleDenied };

// Só confia no que o Google afirmou: identidade Google com e-mail verificado por ele e confirmado no Supabase.
export function isGoogleEmailVerified(user: User) {
  const google = user.identities?.find((identity) => identity.provider === "google");
  return Boolean(user.email && user.email_confirmed_at && google?.identity_data?.email_verified === true);
}

// Roda no retorno do Google, o único ponto por onde o Google passa (o Supabase já criou o usuário antes de qualquer
// código nosso). O portão é o mesmo do formulário: sem workspace e sem convite (gate ligado), não entra.
export async function completeGoogleSignIn(user: User, claim: GoogleSignupClaim | null): Promise<GoogleOutcome> {
  if (!isGoogleEmailVerified(user)) return { ok: false, reason: "unverified" };

  // Conta que já tem workspace (existente, vinculada pelo mesmo e-mail, ou o bootstrap do Felipe) só entra.
  if (await resolveMembership(user)) return { ok: true };

  const email = user.email!.toLowerCase();
  const invite = claim?.invite ? await findOpenInvite(claim.invite) : null;
  if (claim?.invite && !invite && !isSignupOpen()) return { ok: false, reason: "invite" };
  if (invite?.email && invite.email !== email) return { ok: false, reason: "invite-email" };
  if (!invite && !isSignupOpen()) return { ok: false, reason: "invite" };
  // O aceite dos Termos só existe no cookie que /criar-conta grava; quem veio por /entrar não passou por ele.
  if (!claim) return { ok: false, reason: "consent" };

  try {
    await provisionAccount({ userId: user.id, name: displayName(user), inviteId: invite?.id ?? null });
  } catch (error) {
    if (error instanceof InviteTakenError) return { ok: false, reason: "invite-taken" };
    throw error;
  }
  return { ok: true };
}
