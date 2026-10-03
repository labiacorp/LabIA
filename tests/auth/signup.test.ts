import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  verifyOtp: vi.fn(),
  resend: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  allow: vi.fn(),
  isLocked: vi.fn(),
  recordFailure: vi.fn(),
  clearFailures: vi.fn(),
  getInviteState: vi.fn(),
  provisionAccount: vi.fn(),
  authUserExists: vi.fn(),
  authUserConfirmed: vi.fn(),
  generateLink: vi.fn(),
  cookieSet: vi.fn(),
  cookieDelete: vi.fn(),
}));

// redirect() de verdade lança; o teste lê o destino da mensagem.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: mocks.cookieSet, delete: mocks.cookieDelete, get: () => undefined }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/supabase/server", () => ({ createServiceSupabaseClient: () => ({ auth: { admin: { generateLink: mocks.generateLink } } }) }));
vi.mock("@/lib/auth/session", () => ({
  getSupabaseAuthEnv: () => ({ url: "http://supabase.test", anonKey: "anon" }),
  createSupabaseServerClient: async () => ({
    auth: { signUp: mocks.signUp, verifyOtp: mocks.verifyOtp, resend: mocks.resend, resetPasswordForEmail: mocks.resetPasswordForEmail },
  }),
}));
vi.mock("@/lib/auth/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/rate-limit")>()),
  allow: mocks.allow,
  isLocked: mocks.isLocked,
  recordFailure: mocks.recordFailure,
  clearFailures: mocks.clearFailures,
  clientIp: async () => "203.0.113.9",
}));
vi.mock("@/lib/auth/auth-users", () => ({ authUserExists: mocks.authUserExists, authUserConfirmed: mocks.authUserConfirmed, isGoogleOnlyAccount: vi.fn() }));
vi.mock("@/lib/auth/invites", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/invites")>()),
  getInviteState: mocks.getInviteState,
  provisionAccount: mocks.provisionAccount,
}));

import { forgotPasswordAction } from "@/app/esqueci-a-senha/actions";
import { resendConfirmationAction, signUpAction, verifyCodeAction } from "@/app/criar-conta/actions";
import { CONSENT_REQUIRED, INVITE_PROBLEM, InviteTakenError } from "@/lib/auth/invites";
import { EMAIL_SEND_BUSY, TOO_MANY_ATTEMPTS } from "@/lib/auth/rate-limit";

function form(fields: Record<string, string | null>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) if (value !== null) data.set(key, value);
  return data;
}

const valid = { invite: "tok", name: "Ana", email: "Ana@Exemplo.com", password: "senha-boa-123", consent: "on" };
const openInvite = { status: "open", invite: { id: "inv-1", email: null, workspace: null } };

async function redirectOf(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    const match = /^REDIRECT:(.*)$/.exec((error as Error).message);
    if (match) return match[1];
    throw error;
  }
  return null;
}

describe("10-contas: cadastro (servidor)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LABIA_SIGNUP_MODE = "invite";
    mocks.allow.mockResolvedValue(true);
    mocks.isLocked.mockResolvedValue(false);
    mocks.getInviteState.mockResolvedValue(openInvite);
    mocks.signUp.mockResolvedValue({ data: { user: { id: "u1", identities: [{}] } }, error: null });
    mocks.provisionAccount.mockResolvedValue(undefined);
    mocks.authUserExists.mockResolvedValue(false);
  });

  it.each([
    ["senha curta (7)", { password: "1234567" }, "A senha precisa ter de 8 a 72 caracteres."],
    ["senha longa (73)", { password: "x".repeat(73) }, "A senha precisa ter de 8 a 72 caracteres."],
    ["nome vazio", { name: "  " }, "Informe seu nome."],
    ["e-mail inválido", { email: "sem-arroba" }, "E-mail inválido."],
    ["sem aceite dos Termos", { consent: null }, CONSENT_REQUIRED],
    ["aceite com valor estranho", { consent: "true" }, CONSENT_REQUIRED],
  ])("recusa no servidor: %s", async (_name, override, message) => {
    const result = await signUpAction({}, form({ ...valid, ...override }));
    expect(result.error).toBe(message);
    expect(mocks.signUp).not.toHaveBeenCalled();
    expect(mocks.provisionAccount).not.toHaveBeenCalled();
  });

  it("aceita senha de 8 e de 72 caracteres", async () => {
    for (const password of ["12345678", "x".repeat(72)]) {
      expect(await redirectOf(() => signUpAction({}, form({ ...valid, password })))).toBe("/criar-conta/codigo");
    }
  });

  it("cadastro novo: cria no Supabase, dá o workspace e leva para o código", async () => {
    expect(await redirectOf(() => signUpAction({}, form(valid)))).toBe("/criar-conta/codigo");
    expect(mocks.signUp).toHaveBeenCalledWith(expect.objectContaining({ email: "ana@exemplo.com" }));
    expect(mocks.provisionAccount).toHaveBeenCalledWith({ userId: "u1", name: "Ana", inviteId: "inv-1" });
    expect(mocks.cookieSet.mock.calls[0].slice(0, 2)).toEqual(["labia_cadastro", "ana@exemplo.com"]);
  });

  it("e-mail repetido recebe exatamente a mesma resposta e não gasta o convite", async () => {
    const novo = await redirectOf(() => signUpAction({}, form(valid)));
    const cookieNovo = mocks.cookieSet.mock.calls.at(-1)?.slice(0, 2);
    mocks.provisionAccount.mockClear();

    // 1) o Supabase responde com erro de usuário existente
    mocks.signUp.mockResolvedValue({ data: { user: null }, error: { status: 422, code: "user_already_exists" } });
    const porErro = await redirectOf(() => signUpAction({}, form(valid)));
    // 2) o Supabase responde com usuário sem identidades (confirmação ligada)
    mocks.signUp.mockResolvedValue({ data: { user: { id: "u9", identities: [] } }, error: null });
    const porIdentidades = await redirectOf(() => signUpAction({}, form(valid)));

    expect([porErro, porIdentidades]).toEqual([novo, novo]);
    expect(mocks.cookieSet.mock.calls.at(-1)?.slice(0, 2)).toEqual(cookieNovo);
    expect(mocks.provisionAccount).not.toHaveBeenCalled();
  });

  it("corrida: o perdedor leva 500 sem código, o usuário já existe, e a resposta é a genérica (sem erro 500)", async () => {
    mocks.signUp.mockResolvedValue({ data: { user: null }, error: { status: 500, code: undefined } });
    mocks.authUserExists.mockResolvedValue(true);
    expect(await redirectOf(() => signUpAction({}, form(valid)))).toBe("/criar-conta/codigo");
    expect(mocks.provisionAccount).not.toHaveBeenCalled();

    // 500 sem usuário nenhum é falha de verdade, e a pessoa é avisada.
    mocks.authUserExists.mockResolvedValue(false);
    const failed = await signUpAction({}, form(valid));
    expect(failed.error).toMatch(/Não foi possível criar a conta/);
  });

  it("corrida do convite: o segundo cadastro leva a mensagem de convite usado", async () => {
    mocks.provisionAccount.mockRejectedValue(new InviteTakenError("x"));
    const result = await signUpAction({}, form(valid));
    expect(result.error).toBe(INVITE_PROBLEM.taken);
  });

  it.each(["invalid", "expired", "used"] as const)("convite %s: mensagem própria e nada é criado", async (status) => {
    mocks.getInviteState.mockResolvedValue({ status });
    const result = await signUpAction({}, form(valid));
    expect(result.error).toBe(INVITE_PROBLEM[status]);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("convite preso a outro e-mail é recusado", async () => {
    mocks.getInviteState.mockResolvedValue({ status: "open", invite: { id: "inv-1", email: "bia@exemplo.com" } });
    expect((await signUpAction({}, form(valid))).error).toBe(INVITE_PROBLEM.otherEmail);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("gate fechado (LABIA_SIGNUP_MODE=invite): sem convite não cria; aberto (padrão) cria workspace próprio", async () => {
    const semConvite = { ...valid, invite: null };
    expect((await signUpAction({}, form(semConvite))).error).toBe(INVITE_PROBLEM.missing);
    expect(mocks.signUp).not.toHaveBeenCalled();

    process.env.LABIA_SIGNUP_MODE = "open";
    expect(await redirectOf(() => signUpAction({}, form(semConvite)))).toBe("/criar-conta/codigo");
    expect(mocks.provisionAccount).toHaveBeenCalledWith({ userId: "u1", name: "Ana", inviteId: null });

    // sem a variável (padrão em produção) o cadastro também é aberto
    delete process.env.LABIA_SIGNUP_MODE;
    mocks.provisionAccount.mockClear();
    expect(await redirectOf(() => signUpAction({}, form(semConvite)))).toBe("/criar-conta/codigo");
    expect(mocks.provisionAccount).toHaveBeenCalledWith({ userId: "u1", name: "Ana", inviteId: null });
  });

  it("rate limit estourado: recusa antes de falar com o Supabase", async () => {
    mocks.allow.mockResolvedValue(false);
    const result = await signUpAction({}, form(valid));
    expect(result.error).toBe(TOO_MANY_ATTEMPTS);
    expect(mocks.signUp).not.toHaveBeenCalled();
    // por IP e por e-mail, os dois
    expect(mocks.allow).toHaveBeenCalledWith([["signup-ip", "203.0.113.9"], ["signup-email", "ana@exemplo.com"]]);
  });

  it("limite de envio de e-mail do Supabase: mensagem própria (não culpa a pessoa) e o motivo vai para o log sem dados pessoais", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.signUp.mockResolvedValue({ data: { user: null }, error: { status: 429, code: "over_email_send_rate_limit" } });
    const result = await signUpAction({}, form(valid));
    expect(result.error).toBe(EMAIL_SEND_BUSY);
    expect(result.error).not.toBe(TOO_MANY_ATTEMPTS);
    expect(mocks.provisionAccount).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("[auth/signup] supabase refused", { status: 429, code: "over_email_send_rate_limit" });
    expect(JSON.stringify(log.mock.calls)).not.toContain("@");
    log.mockRestore();
  });

  it("429 comum do Supabase continua com a mensagem de muitas tentativas", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.signUp.mockResolvedValue({ data: { user: null }, error: { status: 429, code: "over_request_rate_limit" } });
    expect((await signUpAction({}, form(valid))).error).toBe(TOO_MANY_ATTEMPTS);
    log.mockRestore();
  });

  it("campo-isca preenchido: finge sucesso e não faz nada", async () => {
    expect(await redirectOf(() => signUpAction({}, form({ ...valid, website: "http://spam" })))).toBe("/criar-conta/codigo");
    expect(mocks.signUp).not.toHaveBeenCalled();
    expect(mocks.cookieSet).not.toHaveBeenCalled();
  });
});

describe("10-contas: código de 6 dígitos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.allow.mockResolvedValue(true);
    mocks.isLocked.mockResolvedValue(false);
  });
  const code = (value: string) => form({ email: "ana@exemplo.com", code: value });

  it("código errado ou vencido: mensagem e falha registrada", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: { status: 403, code: "otp_expired" } });
    expect((await verifyCodeAction({}, code("123456"))).error).toBe("Código inválido ou vencido.");
    expect(mocks.recordFailure).toHaveBeenCalledTimes(1);
  });

  it("formato inválido nem chega ao Supabase", async () => {
    expect((await verifyCodeAction({}, code("12ab56"))).error).toMatch(/6 números/);
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });

  it("5 erros seguidos travam os palpites: nem pergunta ao Supabase", async () => {
    mocks.isLocked.mockResolvedValue(true);
    expect((await verifyCodeAction({}, code("123456"))).error).toMatch(/novo código/);
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });

  it("rate limit por IP estourado recusa", async () => {
    mocks.allow.mockResolvedValue(false);
    expect((await verifyCodeAction({}, code("123456"))).error).toBe(TOO_MANY_ATTEMPTS);
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });

  it("código certo: zera as falhas, esquece o cadastro e entra", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: null });
    expect(await redirectOf(() => verifyCodeAction({}, code("123456")))).toBe("/fluxos");
    expect(mocks.clearFailures).toHaveBeenCalledTimes(1);
    expect(mocks.cookieDelete).toHaveBeenCalled();
  });
});

describe("10-contas: reenvio e recuperação de senha respondem sempre igual", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.allow.mockResolvedValue(true);
  });

  it("reenvio: exista a conta ou não, a resposta é a mesma", async () => {
    mocks.resend.mockResolvedValueOnce({ error: null });
    const existe = await resendConfirmationAction({}, form({ email: "ana@exemplo.com" }));
    mocks.resend.mockResolvedValueOnce({ error: { status: 400, code: "user_not_found" } });
    const naoExiste = await resendConfirmationAction({}, form({ email: "ninguem@exemplo.com" }));
    expect(existe).toEqual({ sent: true });
    expect(naoExiste).toEqual(existe);
  });

  it("reenvio com limite estourado recusa sem chamar o Supabase", async () => {
    mocks.allow.mockResolvedValue(false);
    expect((await resendConfirmationAction({}, form({ email: "ana@exemplo.com" }))).error).toBe(TOO_MANY_ATTEMPTS);
    expect(mocks.resend).not.toHaveBeenCalled();
    expect(mocks.allow).toHaveBeenCalledWith([["resend-ip", "203.0.113.9"], ["resend-email", "ana@exemplo.com"]]);
  });

  it("esqueci a senha: resposta idêntica para conta existente e inexistente; limite recusa", async () => {
    mocks.resetPasswordForEmail.mockResolvedValueOnce({ error: null });
    const existe = await forgotPasswordAction({}, form({ email: "ana@exemplo.com" }));
    mocks.resetPasswordForEmail.mockResolvedValueOnce({ error: { status: 400, code: "user_not_found" } });
    const naoExiste = await forgotPasswordAction({}, form({ email: "ninguem@exemplo.com" }));
    expect(existe).toEqual({ sent: true });
    expect(naoExiste).toEqual(existe);

    mocks.allow.mockResolvedValue(false);
    expect((await forgotPasswordAction({}, form({ email: "ana@exemplo.com" }))).error).toBe(TOO_MANY_ATTEMPTS);
  });
});

describe("10-contas: e-mails pelo Resend (RESEND_API_KEY e RESEND_FROM_EMAIL definidos)", () => {
  const fetchMock = vi.fn();
  const sent = () => fetchMock.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string));
  const link = (id: string) => ({ data: { user: { id, identities: [{}] }, properties: { email_otp: "482913", hashed_token: "hash-1" } }, error: null });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM_EMAIL = "LabIA <noreply@labia.test>";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "labia.test";
    process.env.LABIA_SIGNUP_MODE = "open";
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    mocks.allow.mockResolvedValue(true);
    mocks.provisionAccount.mockResolvedValue(undefined);
    mocks.generateLink.mockResolvedValue(link("u7"));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    for (const key of ["RESEND_API_KEY", "RESEND_FROM_EMAIL", "VERCEL_PROJECT_PRODUCTION_URL"]) delete process.env[key];
  });

  it("cadastro: o Supabase só gera o código, o e-mail sai pelo Resend com código e link, e o workspace nasce", async () => {
    expect(await redirectOf(() => signUpAction({}, form({ ...valid, invite: null })))).toBe("/criar-conta/codigo");
    expect(mocks.signUp).not.toHaveBeenCalled();
    expect(mocks.generateLink).toHaveBeenCalledWith(expect.objectContaining({ type: "signup", email: "ana@exemplo.com" }));
    const [mail] = sent();
    expect(mail.to).toBe("ana@exemplo.com");
    expect(mail.subject).toContain("482913");
    expect(mail.html).toContain("https://labia.test/criar-conta/confirmar?token_hash=hash-1");
    expect(mocks.provisionAccount).toHaveBeenCalledWith({ userId: "u7", name: "Ana", inviteId: null });
  });

  it("cadastro com e-mail já confirmado: mesma resposta, nenhum e-mail", async () => {
    mocks.generateLink.mockResolvedValue({ data: { user: null, properties: null }, error: { status: 422, code: "email_exists" } });
    expect(await redirectOf(() => signUpAction({}, form({ ...valid, invite: null })))).toBe("/criar-conta/codigo");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.provisionAccount).not.toHaveBeenCalled();
  });

  it("reenvio: só conta não confirmada recebe código novo; confirmada ou inexistente não recebe nada (resposta igual)", async () => {
    for (const [state, mails] of [[false, 1], [true, 0], [null, 0]] as const) {
      fetchMock.mockClear();
      mocks.authUserConfirmed.mockResolvedValue(state);
      expect(await resendConfirmationAction({}, form({ email: "ana@exemplo.com" }))).toEqual({ sent: true });
      expect(fetchMock).toHaveBeenCalledTimes(mails);
    }
  });

  it("esqueci a senha: conta existente recebe o link de redefinição; inexistente não recebe nada (resposta igual)", async () => {
    mocks.authUserConfirmed.mockResolvedValue(true);
    expect(await forgotPasswordAction({}, form({ email: "ana@exemplo.com" }))).toEqual({ sent: true });
    expect(sent()[0].html).toContain("https://labia.test/redefinir-senha/confirmar?token_hash=hash-1");
    fetchMock.mockClear();
    mocks.authUserConfirmed.mockResolvedValue(null);
    expect(await forgotPasswordAction({}, form({ email: "ninguem@exemplo.com" }))).toEqual({ sent: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
