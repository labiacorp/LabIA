import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  signOut: vi.fn(),
  allow: vi.fn(),
  isLocked: vi.fn(),
  recordFailure: vi.fn(),
  clearFailures: vi.fn(),
  isGoogleOnlyAccount: vi.fn(),
  resolveMembership: vi.fn(),
  findOpenInvite: vi.fn(),
  provisionAccount: vi.fn(),
  cookieValue: vi.fn<() => string | undefined>(),
  cookieSet: vi.fn(),
  cookieDelete: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (mocks.cookieValue() ? { name, value: mocks.cookieValue() } : undefined),
    set: mocks.cookieSet,
    delete: mocks.cookieDelete,
  }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }),
}));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/auth/session", () => ({
  getSupabaseAuthEnv: () => ({ url: "http://supabase.test", anonKey: "anon" }),
  createSupabaseServerClient: async () => ({
    auth: { signInWithPassword: mocks.signInWithPassword, exchangeCodeForSession: mocks.exchangeCodeForSession, signOut: mocks.signOut },
  }),
  resolveMembership: mocks.resolveMembership,
  displayName: (user: { email: string }) => user.email.split("@")[0],
}));
vi.mock("@/lib/auth/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/rate-limit")>()),
  allow: mocks.allow,
  isLocked: mocks.isLocked,
  recordFailure: mocks.recordFailure,
  clearFailures: mocks.clearFailures,
  clientIp: async () => "203.0.113.9",
}));
vi.mock("@/lib/auth/auth-users", () => ({ isGoogleOnlyAccount: mocks.isGoogleOnlyAccount, authUserExists: vi.fn() }));
vi.mock("@/lib/auth/invites", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth/invites")>()),
  findOpenInvite: mocks.findOpenInvite,
  provisionAccount: mocks.provisionAccount,
}));

import { GET as googleCallback } from "@/app/auth/callback/route";
import { googleAuthAction, signInAction } from "@/lib/auth/actions";
import { completeGoogleSignIn } from "@/lib/auth/google";
import { GOOGLE_SIGNUP_COOKIE, readGoogleSignupClaim, signGoogleSignupClaim } from "@/lib/auth/invite-cookie";
import { INVITE_PROBLEM, InviteTakenError } from "@/lib/auth/invites";
import { TOO_MANY_ATTEMPTS } from "@/lib/auth/rate-limit";

const SECRET = "x".repeat(40);

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

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

describe("10-contas: login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.allow.mockResolvedValue(true);
    mocks.isLocked.mockResolvedValue(false);
    mocks.isGoogleOnlyAccount.mockResolvedValue(false);
  });
  const credentials = form({ email: "Ana@Exemplo.com", password: "qualquer" });

  it("senha errada: mensagem única, falha registrada e e-mail devolvido", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { status: 400, code: "invalid_credentials" } });
    const result = await signInAction({}, credentials);
    expect(result).toEqual({ error: "E-mail ou senha incorretos.", email: "ana@exemplo.com" });
    expect(mocks.recordFailure).toHaveBeenCalledTimes(1);
  });

  it("e-mail que não existe recebe a mesma mensagem da senha errada", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { status: 400, code: "invalid_credentials" } });
    const existe = await signInAction({}, credentials);
    const naoExiste = await signInAction({}, form({ email: "ninguem@exemplo.com", password: "x" }));
    expect(naoExiste.error).toBe(existe.error);
  });

  it("bloqueado por 5 falhas: nem tenta, e a mensagem é a de senha errada, mesmo com a senha certa", async () => {
    mocks.isLocked.mockResolvedValue(true);
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    const result = await signInAction({}, credentials);
    expect(result.error).toBe("E-mail ou senha incorretos.");
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it("rate limit estourado recusa por IP e por e-mail", async () => {
    mocks.allow.mockResolvedValue(false);
    expect((await signInAction({}, credentials)).error).toBe(TOO_MANY_ATTEMPTS);
    expect(mocks.allow).toHaveBeenCalledWith([["login-ip", "203.0.113.9"], ["login-email", "ana@exemplo.com"]]);
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });

  it("conta não confirmada: avisa, não conta como falha e oferece o reenvio", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { status: 400, code: "email_not_confirmed" } });
    const result = await signInAction({}, credentials);
    expect(result.unconfirmedEmail).toBe("ana@exemplo.com");
    expect(result.error).toMatch(/Confirme seu e-mail/);
    expect(mocks.recordFailure).not.toHaveBeenCalled();
  });

  it("conta só do Google: erro específico em vez de 'senha incorreta'", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { status: 400, code: "invalid_credentials" } });
    mocks.isGoogleOnlyAccount.mockResolvedValue(true);
    expect((await signInAction({}, credentials)).error).toMatch(/Continuar com Google/);
  });

  it("senha certa: zera as falhas e entra", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    expect(await redirectOf(() => signInAction({}, form({ email: "ana@exemplo.com", password: "ok", next: "/projetos" })))).toBe("/projetos");
    expect(mocks.clearFailures).toHaveBeenCalledTimes(1);
  });
});

describe("10-contas: cookie assinado do convite", () => {
  beforeEach(() => {
    process.env.LABIA_COOKIE_SECRET = SECRET;
  });

  it("ida e volta, adulteração, vencimento e segredo errado", () => {
    const value = signGoogleSignupClaim("tok", 1_000);
    expect(readGoogleSignupClaim(value, 2_000)?.invite).toBe("tok");

    const [body, signature] = value.split(".");
    const forged = Buffer.from(JSON.stringify({ invite: "outro", exp: 9e15 })).toString("base64url");
    expect(readGoogleSignupClaim(`${forged}.${signature}`, 2_000)).toBeNull();
    expect(readGoogleSignupClaim(`${body}.${"A".repeat(signature.length)}`, 2_000)).toBeNull();
    expect(readGoogleSignupClaim(value, 1_000 + 16 * 60 * 1000)).toBeNull();
    expect(readGoogleSignupClaim(undefined)).toBeNull();

    process.env.LABIA_COOKIE_SECRET = "y".repeat(40);
    expect(readGoogleSignupClaim(value, 2_000)).toBeNull();
  });

  it("sem segredo configurado não assina nem lê", () => {
    process.env.LABIA_COOKIE_SECRET = "curto";
    expect(() => signGoogleSignupClaim("tok")).toThrow();
    expect(readGoogleSignupClaim("a.b")).toBeNull();
  });
});

const googleUser = (overrides: Record<string, unknown> = {}) => ({
  id: "g1",
  email: "Nova@Gmail.com",
  email_confirmed_at: "2026-10-03T00:00:00Z",
  user_metadata: {},
  identities: [{ provider: "google", identity_data: { email_verified: true } }],
  ...overrides,
});
const claim = (invite: string | null) => ({ invite, exp: Date.now() + 60_000 });

describe("10-contas: Google (provedor simulado)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LABIA_SIGNUP_MODE = "invite";
    process.env.LABIA_COOKIE_SECRET = SECRET;
    mocks.resolveMembership.mockResolvedValue(null);
    mocks.findOpenInvite.mockResolvedValue({ id: "inv-1", email: null });
    mocks.provisionAccount.mockResolvedValue(undefined);
    mocks.allow.mockResolvedValue(true);
  });
  const run = (user: unknown, c: ReturnType<typeof claim> | null) => completeGoogleSignIn(user as never, c);

  it("e-mail não verificado pelo Google: recusa e não cria nada", async () => {
    const unverified = googleUser({ identities: [{ provider: "google", identity_data: { email_verified: false } }] });
    expect(await run(unverified, claim("tok"))).toEqual({ ok: false, reason: "unverified" });
    expect(await run(googleUser({ email_confirmed_at: null }), claim("tok"))).toEqual({ ok: false, reason: "unverified" });
    expect(await run(googleUser({ identities: [{ provider: "email", identity_data: { email_verified: true } }] }), claim("tok"))).toEqual({
      ok: false,
      reason: "unverified",
    });
    expect(mocks.provisionAccount).not.toHaveBeenCalled();
  });

  it("conta nova sem convite (LABIA_SIGNUP_MODE=invite): recusa; convite inexistente também", async () => {
    expect(await run(googleUser(), claim(null))).toEqual({ ok: false, reason: "invite" });
    expect(await run(googleUser(), null)).toEqual({ ok: false, reason: "invite" });
    mocks.findOpenInvite.mockResolvedValue(null);
    expect(await run(googleUser(), claim("vencido"))).toEqual({ ok: false, reason: "invite" });
    expect(mocks.provisionAccount).not.toHaveBeenCalled();
  });

  it("conta nova com convite válido e aceite: cria o acesso e gasta o convite", async () => {
    expect(await run(googleUser(), claim("tok"))).toEqual({ ok: true });
    expect(mocks.provisionAccount).toHaveBeenCalledWith({ userId: "g1", name: "Nova", inviteId: "inv-1" });
  });

  it("convite preso a outro e-mail e convite gasto na corrida são recusados", async () => {
    mocks.findOpenInvite.mockResolvedValue({ id: "inv-1", email: "outra@gmail.com" });
    expect(await run(googleUser(), claim("tok"))).toEqual({ ok: false, reason: "invite-email" });
    mocks.findOpenInvite.mockResolvedValue({ id: "inv-1", email: "nova@gmail.com" });
    mocks.provisionAccount.mockRejectedValue(new InviteTakenError("x"));
    expect(await run(googleUser(), claim("tok"))).toEqual({ ok: false, reason: "invite-taken" });
  });

  it("conta que já tem workspace (vinculada pelo mesmo e-mail) só entra, sem gastar convite", async () => {
    mocks.resolveMembership.mockResolvedValue({ workspace: { id: "ws" } });
    expect(await run(googleUser(), null)).toEqual({ ok: true });
    expect(mocks.provisionAccount).not.toHaveBeenCalled();
  });

  it("quem veio por /entrar (sem o aceite dos Termos) não cria conta nova, nem com o cadastro aberto", async () => {
    process.env.LABIA_SIGNUP_MODE = "open";
    expect(await run(googleUser(), null)).toEqual({ ok: false, reason: "consent" });
  });

  it("LABIA_SIGNUP_MODE=open: conta nova entra sem convite, com workspace próprio", async () => {
    process.env.LABIA_SIGNUP_MODE = "open";
    expect(await run(googleUser(), claim(null))).toEqual({ ok: true });
    expect(mocks.provisionAccount).toHaveBeenCalledWith({ userId: "g1", name: "Nova", inviteId: null });
  });

  describe("início (server action)", () => {
    it("cadastro sem aceite dos Termos ou sem convite não abre o Google", async () => {
      expect((await googleAuthAction({}, form({ from: "signup", invite: "tok" }))).error).toMatch(/Termos/);
      expect((await googleAuthAction({}, form({ from: "signup", consent: "on" }))).error).toBe(INVITE_PROBLEM.missing);
      expect(mocks.cookieSet).not.toHaveBeenCalled();
    });
  });

  describe("retorno (rota /auth/callback)", () => {
    const callback = (query: string) => googleCallback({ nextUrl: new URL(`http://localhost:3000/auth/callback?${query}`) } as never);

    it("sem código ou com troca falha: volta ao /entrar", async () => {
      expect(await redirectOf(() => callback(""))).toBe("/entrar?erro=google");
      mocks.exchangeCodeForSession.mockResolvedValue({ data: { user: null }, error: { message: "x" } });
      expect(await redirectOf(() => callback("code=abc"))).toBe("/entrar?erro=google");
    });

    it("e-mail não verificado: desconecta e mostra o motivo", async () => {
      mocks.exchangeCodeForSession.mockResolvedValue({
        data: { user: googleUser({ identities: [{ provider: "google", identity_data: { email_verified: false } }] }) },
        error: null,
      });
      expect(await redirectOf(() => callback("code=abc"))).toBe("/entrar?erro=unverified");
      expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    });

    it("conta nova sem o cookie do convite: desconecta (o gate vale no retorno, não só na página)", async () => {
      mocks.exchangeCodeForSession.mockResolvedValue({ data: { user: googleUser() }, error: null });
      mocks.cookieValue.mockReturnValue(undefined);
      expect(await redirectOf(() => callback("code=abc"))).toBe("/entrar?erro=invite");
      expect(mocks.signOut).toHaveBeenCalled();
      expect(mocks.provisionAccount).not.toHaveBeenCalled();
    });

    it("cookie com assinatura falsa vale como ausente", async () => {
      mocks.exchangeCodeForSession.mockResolvedValue({ data: { user: googleUser() }, error: null });
      mocks.cookieValue.mockReturnValue("e30.assinatura-falsa");
      expect(await redirectOf(() => callback("code=abc"))).toBe("/entrar?erro=invite");
    });

    it("conta nova com cookie assinado e convite válido: entra e o cookie é apagado", async () => {
      mocks.exchangeCodeForSession.mockResolvedValue({ data: { user: googleUser() }, error: null });
      mocks.cookieValue.mockReturnValue(signGoogleSignupClaim("tok"));
      expect(await redirectOf(() => callback("code=abc&next=/projetos"))).toBe("/projetos");
      expect(mocks.provisionAccount).toHaveBeenCalledTimes(1);
      expect(mocks.cookieDelete).toHaveBeenCalledWith({ name: GOOGLE_SIGNUP_COOKIE, path: "/" });
      expect(mocks.signOut).not.toHaveBeenCalled();
    });

    it("next externo não vira redirecionamento aberto", async () => {
      mocks.resolveMembership.mockResolvedValue({ workspace: { id: "ws" } });
      mocks.exchangeCodeForSession.mockResolvedValue({ data: { user: googleUser() }, error: null });
      expect(await redirectOf(() => callback("code=abc&next=//evil.example"))).toBe("/fluxos");
    });
  });
});
