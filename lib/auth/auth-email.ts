import "server-only";

import { headers } from "next/headers";
import type { AuthError, User } from "@supabase/supabase-js";

import { authUserConfirmed } from "@/lib/auth/auth-users";
import { createSupabaseServerClient } from "@/lib/auth/session";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

// Auth e-mails go out through Resend with LabIA's own layout (same as Leaner) when RESEND_API_KEY and
// RESEND_FROM_EMAIL are set. Supabase only mints the code and the link (admin.generateLink sends nothing),
// so its 2-per-hour default mailer and its plain template are out of the way. Without the variables
// (local Supabase + Mailpit) everything falls back to Supabase sending the mail itself.
export const resendConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);

type Result = { user: User | null; error: AuthError | null };

async function siteUrl() {
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (production) return `https://${production}`;
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  return `${requestHeaders.get("x-forwarded-proto") ?? "http"}://${host}`;
}

async function send(to: string, subject: string, html: string, text: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.RESEND_FROM_EMAIL, to, subject, html, text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Resend ${response.status}: ${(await response.text()).slice(0, 200)}`);
}

function layout(title: string, intro: string, button: { href: string; label: string }, code: string | null, footer: string) {
  const codeBlock = code
    ? `<p style="font-size:15px;line-height:1.6;margin:0">Abriu em outro aparelho? Digite o código na tela da LabIA:</p>
  <p style="font-family:'JetBrains Mono',Menlo,monospace;font-size:28px;letter-spacing:0.3em;margin:8px 0 24px">${code}</p>`
    : "";
  return `<div style="background:#0a0b0e;padding:32px 16px">
<div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;padding:28px;background:#12141a;border:1px solid #232733;border-radius:12px;color:#e8ebf2">
  <p style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#10b981;margin:0">LabIA</p>
  <h1 style="font-size:22px;margin:8px 0 16px;color:#ffffff">${title}</h1>
  <p style="font-size:15px;line-height:1.6;margin:0">${intro}</p>
  <p style="margin:24px 0"><a href="${button.href}" style="background:#10b981;color:#0a0b0e;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${button.label}</a></p>
  ${codeBlock}
  <p style="font-size:13px;color:#9aa3b5;margin:0">${footer}</p>
</div></div>`;
}

async function sendConfirmation(email: string, otp: string, hashedToken: string) {
  const href = `${await siteUrl()}/criar-conta/confirmar?token_hash=${encodeURIComponent(hashedToken)}`;
  const footer = "O link e o código valem 30 minutos. Se você não criou esta conta, ignore este e-mail.";
  await send(
    email,
    `${otp} é o seu código da LabIA`,
    layout("Confirme sua conta", "Clique no botão para confirmar o e-mail e entrar:", { href, label: "Confirmar e entrar" }, otp, footer),
    `Confirme sua conta na LabIA.\n\nCódigo: ${otp}\n\nOu abra: ${href}\n\n${footer}`,
  );
}

// Same shape as supabase.auth.signUp, so the action keeps one code path.
export async function signUpUser(email: string, password: string, name: string): Promise<Result> {
  if (!resendConfigured()) {
    const { data, error } = await (await createSupabaseServerClient()).auth.signUp({ email, password, options: { data: { full_name: name } } });
    return { user: data.user, error };
  }
  const { data, error } = await createServiceSupabaseClient().auth.admin.generateLink({ type: "signup", email, password, options: { data: { full_name: name } } });
  if (error) return { user: null, error };
  await sendConfirmation(email, data.properties.email_otp, data.properties.hashed_token);
  return { user: data.user, error: null };
}

// Only an account that exists and is still unconfirmed gets a new code. The magic link of a confirmed account
// would be a sign-in link, so that case sends nothing (the caller answers the same either way).
export async function resendSignupCode(email: string): Promise<{ error: AuthError | null }> {
  if (!resendConfigured()) return (await createSupabaseServerClient()).auth.resend({ type: "signup", email });
  if ((await authUserConfirmed(email)) !== false) return { error: null };
  const { data, error } = await createServiceSupabaseClient().auth.admin.generateLink({ type: "magiclink", email });
  if (error) return { error };
  await sendConfirmation(email, data.properties.email_otp, data.properties.hashed_token);
  return { error: null };
}

export async function sendPasswordRecovery(email: string): Promise<{ error: AuthError | null }> {
  if (!resendConfigured()) return (await createSupabaseServerClient()).auth.resetPasswordForEmail(email);
  if ((await authUserConfirmed(email)) === null) return { error: null };
  const { data, error } = await createServiceSupabaseClient().auth.admin.generateLink({ type: "recovery", email });
  if (error) return { error };
  const href = `${await siteUrl()}/redefinir-senha/confirmar?token_hash=${encodeURIComponent(data.properties.hashed_token)}`;
  const footer = "O link vale 30 minutos. Se você não pediu, ignore este e-mail: sua senha continua a mesma.";
  await send(
    email,
    "Redefina sua senha da LabIA",
    layout("Redefinir senha", "Clique no botão para escolher uma senha nova:", { href, label: "Redefinir senha" }, null, footer),
    `Redefina sua senha da LabIA: ${href}\n\n${footer}`,
  );
  return { error: null };
}
