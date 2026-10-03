import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ queryRaw: vi.fn(), executeRaw: vi.fn() }));

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "198.51.100.7, 10.0.0.1" }) }));
vi.mock("@/lib/db/prisma", () => ({ prisma: { $queryRaw: db.queryRaw, $executeRaw: db.executeRaw } }));

import { allow, clientIp, CODE_LOCK, isLocked, LOGIN_LOCK } from "@/lib/auth/rate-limit";

describe("10-contas: limite de tentativas (Postgres)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("permite enquanto há vaga e nega quando a janela está cheia (a consulta não grava, e devolve zero linhas)", async () => {
    db.queryRaw.mockResolvedValueOnce([{ id: BigInt(1) }]).mockResolvedValueOnce([]);
    expect(await allow([["resend-email", "ana@exemplo.com"]])).toBe(true);
    expect(await allow([["resend-email", "ana@exemplo.com"]])).toBe(false);
  });

  it("conta por IP e por e-mail: negou no primeiro, nem consulta o segundo", async () => {
    db.queryRaw.mockResolvedValueOnce([]);
    expect(await allow([["signup-ip", "1.1.1.1"], ["signup-email", "ana@exemplo.com"]])).toBe(false);
    expect(db.queryRaw).toHaveBeenCalledTimes(1);
    // a chave leva o balde e o assunto; os limites vêm da tabela (5 por e-mail/h no cadastro)
    expect(db.queryRaw.mock.calls[0].slice(1)).toContain("signup-ip:1.1.1.1");
  });

  it("bloqueio: trava na 5ª falha de login e na 5ª de código", async () => {
    db.queryRaw.mockResolvedValueOnce([{ total: BigInt(4) }]).mockResolvedValueOnce([{ total: BigInt(5) }]).mockResolvedValueOnce([{ total: BigInt(5) }]);
    expect(await isLocked(LOGIN_LOCK, "ana@exemplo.com")).toBe(false);
    expect(await isLocked(LOGIN_LOCK, "ana@exemplo.com")).toBe(true);
    expect(await isLocked(CODE_LOCK, "ana@exemplo.com")).toBe(true);
  });

  it("falha do banco abre a porta e registra (o Supabase tem os próprios limites)", async () => {
    db.queryRaw.mockRejectedValue(new Error("db fora"));
    expect(await allow([["login-ip", "1.1.1.1"]])).toBe(true);
    expect(await isLocked(LOGIN_LOCK, "ana@exemplo.com")).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });

  it("IP é a primeira entrada do x-forwarded-for", async () => {
    expect(await clientIp()).toBe("198.51.100.7");
  });
});
