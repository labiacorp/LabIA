"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ACCESS_REQUIRED, hasPass } from "@/lib/auth/access-pass";
import { isGoogleOnlyAccount } from "@/lib/auth/auth-users";
import {
  GOOGLE_SIGNUP_COOKIE,
  GOOGLE_SIGNUP_COOKIE_TTL_SECONDS,
  isCookieSecretConfigured,
  signGoogleSignupClaim,
} from "@/lib/auth/invite-cookie";
import { CONSENT_REQUIRED, getInviteState, INVITE_PROBLEM } from "@/lib/auth/invites";
import { safeNextPath } from "@/lib/auth/next-path";
import {
  allow,
  clearFailures,
  clientIp,
  isLocked,
  LOGIN_LOCK,
  normalizeEmail,
  recordFailure,
  TOO_MANY_ATTEMPTS,
} from "@/lib/auth/rate-limit";
import { createSupabaseServerClient, getSupabaseAuthEnv } from "@/lib/auth/session";
import { rememberSignupEmail } from "@/lib/auth/signup-email";
import { isSignupOpen } from "@/lib/auth/signup-mode";

// `unconfirmedEmail`: a senha estava certa mas o e-mail não foi confirmado; a tela oferece reenviar.
export type SignInState = { error?: string; email?: string; unconfirmedEmail?: string };
export type GoogleState = { error?: string };

const WRONG_CREDENTIALS = "E-mail ou senha incorretos.";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(72),
});

export async function signInAction(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: "Informe e-mail e senha." };
  if (!(await hasPass())) return { error: ACCESS_REQUIRED };
  if (!getSupabaseAuthEnv()) return { error: "Login indisponível: o Supabase não está configurado neste ambiente." };
  const email = normalizeEmail(parsed.data.email);
  // O React limpa o formulário depois da ação: o e-mail volta no erro para a pessoa não redigitar.
  const fail = (error: string, extra: Partial<SignInState> = {}): SignInState => ({ error, email, ...extra });

  if (!(await allow([["login-ip", await clientIp()], ["login-email", email]]))) return fail(TOO_MANY_ATTEMPTS);
  // Bloqueado por falhas seguidas: nem tenta, e a mensagem é a de senha errada (não revela o bloqueio nem a conta).
  if (await isLocked(LOGIN_LOCK, email)) return fail(WRONG_CREDENTIALS);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
  if (error) {
    if (error.status === 429) return fail(TOO_MANY_ATTEMPTS);
    // Só chega aqui com a senha certa: avisar não revela a conta a quem não a conhece.
    if (error.code === "email_not_confirmed") {
      await rememberSignupEmail(email);
      return fail("Confirme seu e-mail antes de entrar: use o link ou o código que enviamos.", { unconfirmedEmail: email });
    }
    await recordFailure(LOGIN_LOCK, email);
    if (await isGoogleOnlyAccount(email)) return fail("Esta conta entra com o Google. Use o botão \"Continuar com Google\".");
    // Mensagem única: não revela se o e-mail tem conta.
    return fail(WRONG_CREDENTIALS);
  }

  await clearFailures(LOGIN_LOCK, email);
  redirect(safeNextPath(formData.get("next")));
}

// Origem pública deste pedido, para o Supabase devolver o Google a esta mesma aplicação.
// O Supabase só aceita destinos da lista de URLs permitidas, então um Host forjado não passa.
async function requestOrigin() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const isLocal = /^(localhost|127\.0\.0\.1)(:|$)/.test(host);
  return `${requestHeaders.get("x-forwarded-proto") ?? (isLocal ? "http" : "https")}://${host}`;
}

// "Continuar com Google" no /entrar e no /criar-conta. No cadastro (`from=signup`) o aceite dos Termos e o convite
// viajam num cookie assinado e são conferidos de novo no retorno (lib/auth/google.ts): a página aberta não prova nada.
export async function googleAuthAction(_previous: GoogleState, formData: FormData): Promise<GoogleState> {
  if (!getSupabaseAuthEnv() || !isCookieSecretConfigured()) return { error: "Entrar com o Google não está disponível neste ambiente." };
  if (!(await hasPass())) return { error: ACCESS_REQUIRED };
  const signingUp = formData.get("from") === "signup";
  const next = safeNextPath(formData.get("next"));
  const cookieStore = await cookies();

  if (signingUp) {
    if (formData.get("consent") !== "on") return { error: CONSENT_REQUIRED };
    const token = String(formData.get("invite") ?? "").trim();
    if (token) {
      const state = await getInviteState(token);
      if (state.status !== "open") return { error: INVITE_PROBLEM[state.status] };
    } else if (!isSignupOpen()) {
      return { error: INVITE_PROBLEM.missing };
    }
    cookieStore.set(GOOGLE_SIGNUP_COOKIE, signGoogleSignupClaim(token || null), {
      httpOnly: true,
      // lax: o retorno do Google é uma navegação de nível superior vinda de outro site.
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: GOOGLE_SIGNUP_COOKIE_TTL_SECONDS,
    });
  } else {
    // Entrar não carrega aceite nem convite: um cookie velho de cadastro não pode valer aqui.
    cookieStore.delete({ name: GOOGLE_SIGNUP_COOKIE, path: "/" });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await requestOrigin()}/auth/callback?next=${encodeURIComponent(next)}`, queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) return { error: "Não foi possível falar com o Google agora. Tente de novo em alguns minutos." };
  redirect(data.url);
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/entrar");
}

// Revoga todas as sessões da conta: os outros aparelhos caem na próxima requisição (getUser no servidor).
export async function signOutEverywhereAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/entrar");
}
