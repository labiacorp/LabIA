"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { ACCESS_REQUIRED, hasPass } from "@/lib/auth/access-pass";
import { resendSignupCode, signUpUser } from "@/lib/auth/auth-email";
import { authUserExists } from "@/lib/auth/auth-users";
import { DEFAULT_AFTER_LOGIN_PATH } from "@/lib/auth/next-path";
import {
  CONSENT_REQUIRED,
  getInviteState,
  INVITE_PROBLEM,
  InviteTakenError,
  provisionAccount,
} from "@/lib/auth/invites";
import {
  allow,
  clearFailures,
  clientIp,
  CODE_LOCK,
  EMAIL_SEND_BUSY,
  isEmailSendLimit,
  isLocked,
  normalizeEmail,
  recordFailure,
  TOO_MANY_ATTEMPTS,
} from "@/lib/auth/rate-limit";
import { createSupabaseServerClient, getSupabaseAuthEnv } from "@/lib/auth/session";
import { forgetSignupEmail, rememberSignupEmail } from "@/lib/auth/signup-email";
import { isSignupOpen } from "@/lib/auth/signup-mode";

// name/email voltam no erro: o React limpa o formulário após a ação, e a pessoa não redigita tudo.
export type SignUpState = { error?: string; name?: string; email?: string };
export type ResendState = { error?: string; sent?: boolean };

const NO_SUPABASE = "Cadastro indisponível: o Supabase não está configurado neste ambiente.";

const signUpSchema = z.object({
  invite: z.string().trim().max(200).optional(),
  name: z.string().trim().min(1, "Informe seu nome.").max(80, "Nome longo demais."),
  email: z.string().trim().toLowerCase().email("E-mail inválido.").max(254, "E-mail inválido."),
  // 72: limite do bcrypt no Supabase; acima disso o resto seria ignorado sem aviso.
  password: z.string().min(8, "A senha precisa ter de 8 a 72 caracteres.").max(72, "A senha precisa ter de 8 a 72 caracteres."),
  // A caixa envia "on" marcada e nada desmarcada: o servidor não confia no `required` do navegador.
  consent: z.literal("on", { errorMap: () => ({ message: CONSENT_REQUIRED }) }),
});

export async function signUpAction(_previous: SignUpState, formData: FormData): Promise<SignUpState> {
  const typed = { name: String(formData.get("name") ?? ""), email: String(formData.get("email") ?? "") };
  const fail = (error: string): SignUpState => ({ ...typed, error });

  // Campo-isca, invisível para gente: robô preenche. Responde como se tivesse dado certo e não faz nada.
  if (String(formData.get("website") ?? "").trim()) redirect("/criar-conta/codigo");

  const parsed = signUpSchema.safeParse({
    invite: formData.get("invite") ?? undefined,
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    consent: formData.get("consent"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Confira os dados e tente de novo.");
  if (!(await hasPass())) return fail(ACCESS_REQUIRED);
  if (!getSupabaseAuthEnv()) return fail(NO_SUPABASE);
  const { name, email, password } = parsed.data;

  if (!(await allow([["signup-ip", await clientIp()], ["signup-email", email]]))) return fail(TOO_MANY_ATTEMPTS);

  // O convite é checado de novo aqui: a página aberta não prova nada no momento do envio.
  let inviteId: string | null = null;
  if (parsed.data.invite) {
    const state = await getInviteState(parsed.data.invite);
    if (state.status !== "open") return fail(INVITE_PROBLEM[state.status]);
    if (state.invite.email && state.invite.email !== email) return fail(INVITE_PROBLEM.otherEmail);
    inviteId = state.invite.id;
  } else if (!isSignupOpen()) {
    return fail(INVITE_PROBLEM.missing);
  }

  const { user, error } = await signUpUser(email, password, name);
  // E-mail que já tem conta (o Supabase local responde user_already_exists) e dois cadastros do mesmo e-mail ao mesmo
  // tempo (o perdedor leva um 500 sem código) caem no mesmo caminho, com resposta idêntica a um cadastro novo.
  let alreadyExists = error?.code === "user_already_exists" || error?.code === "email_exists";
  if (error && !alreadyExists && error.status !== 429 && error.code !== "weak_password") alreadyExists = await authUserExists(email);
  if (error && !alreadyExists) {
    // Status and code only: never the e-mail or anything the visitor typed.
    console.error("[auth/signup] supabase refused", { status: error.status, code: error.code });
    if (isEmailSendLimit(error)) return fail(EMAIL_SEND_BUSY);
    if (error.status === 429) return fail(TOO_MANY_ATTEMPTS);
    if (error.code === "weak_password") return fail("Senha fraca demais. Use uma senha mais longa ou menos comum.");
    return fail("Não foi possível criar a conta agora. Tente de novo em alguns minutos.");
  }

  // Também é "já tem conta" quando o Supabase devolve um usuário sem identidades (e não envia nada).
  // A resposta é a mesma (não revela a conta) e o convite continua valendo.
  if (!alreadyExists && user?.identities?.length) {
    try {
      await provisionAccount({ userId: user.id, name, inviteId });
    } catch (provisionError) {
      if (provisionError instanceof InviteTakenError) return fail(INVITE_PROBLEM.taken);
      throw provisionError;
    }
  }

  await rememberSignupEmail(email);
  redirect("/criar-conta/codigo");
}

const codeSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  code: z.string().trim().regex(/^\d{6}$/),
});

// O código serve para quem abriu o e-mail em outro aparelho ou app: confirma aqui, nesta aba.
// São só 1 milhão de combinações: cinco erros seguidos travam os palpites até um novo código sair (reenvio).
export async function verifyCodeAction(_previous: SignUpState, formData: FormData): Promise<SignUpState> {
  const parsed = codeSchema.safeParse({ email: formData.get("email"), code: formData.get("code") });
  if (!parsed.success) return { error: "Digite os 6 números que chegaram no e-mail." };
  const { email, code } = parsed.data;

  if (!(await allow([["code-ip", await clientIp()]]))) return { error: TOO_MANY_ATTEMPTS };
  if (await isLocked(CODE_LOCK, email)) return { error: "Muitos códigos errados. Peça um novo código por e-mail para tentar de novo." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
  if (error) {
    if (error.status === 429) return { error: TOO_MANY_ATTEMPTS };
    await recordFailure(CODE_LOCK, email);
    return { error: "Código inválido ou vencido." };
  }

  await clearFailures(CODE_LOCK, email);
  await forgetSignupEmail();
  redirect(DEFAULT_AFTER_LOGIN_PATH);
}

// A resposta é a mesma exista a conta, esteja ela confirmada ou não: nada de "esse e-mail não tem conta".
export async function resendConfirmationAction(_previous: ResendState, formData: FormData): Promise<ResendState> {
  const parsed = z.string().trim().email().max(254).safeParse(formData.get("email"));
  if (!parsed.success) return { error: "Informe um e-mail válido." };
  if (!getSupabaseAuthEnv()) return { error: NO_SUPABASE };
  const email = normalizeEmail(parsed.data);

  if (!(await allow([["resend-ip", await clientIp()], ["resend-email", email]]))) return { error: TOO_MANY_ATTEMPTS };

  const { error } = await resendSignupCode(email);
  if (error) console.error("[auth/resend] supabase refused", { status: error.status, code: error.code });
  if (isEmailSendLimit(error)) return { error: EMAIL_SEND_BUSY };
  if (error?.status === 429) return { error: TOO_MANY_ATTEMPTS };

  // Sai um código novo: os erros do código antigo deixam de valer.
  await clearFailures(CODE_LOCK, email);
  await rememberSignupEmail(email);
  return { sent: true };
}
