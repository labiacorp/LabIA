import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieSet = vi.fn();
const allow = vi.fn();

vi.mock("next/headers", () => ({ cookies: async () => ({ set: cookieSet, get: () => undefined }), headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));
vi.mock("@/lib/auth/rate-limit", () => ({
  allow: (...args: unknown[]) => allow(...args),
  clientIp: async () => "203.0.113.9",
  TOO_MANY_ATTEMPTS: "too many",
}));

import { unlockAction } from "@/app/acesso/actions";

const form = (code: string, next?: string) => {
  const data = new FormData();
  data.set("code", code);
  if (next) data.set("next", next);
  return data;
};

describe("unlockAction", () => {
  beforeEach(() => {
    vi.stubEnv("LABIA_ACCESS_CODE", "beta-code");
    vi.stubEnv("LABIA_COOKIE_SECRET", "s".repeat(40));
    vi.stubEnv("NODE_ENV", "production");
    allow.mockResolvedValue(true);
    cookieSet.mockClear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("refuses a wrong code, sets no cookie and gives one generic answer", async () => {
    expect(await unlockAction({}, form("nope"))).toEqual({ error: "Código incorreto." });
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("sets an httpOnly signed pass and sends the visitor to the page they asked for", async () => {
    await expect(unlockAction({}, form("beta-code", "/criar-conta"))).rejects.toThrow("REDIRECT:/criar-conta");
    const [name, value, options] = cookieSet.mock.calls[0];
    expect(name).toBe("labia_access");
    expect(value).not.toContain("beta-code");
    expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", secure: true });
  });

  it("falls back to /entrar for a missing or external next", async () => {
    await expect(unlockAction({}, form("beta-code"))).rejects.toThrow("REDIRECT:/entrar");
    await expect(unlockAction({}, form("beta-code", "https://evil.example"))).rejects.toThrow("REDIRECT:/entrar");
    await expect(unlockAction({}, form("beta-code", "//evil.example"))).rejects.toThrow("REDIRECT:/fluxos");
  });

  it("stops at the rate limit before comparing anything", async () => {
    allow.mockResolvedValue(false);
    expect(await unlockAction({}, form("beta-code"))).toEqual({ error: "too many" });
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("is unavailable when the gate is closed", async () => {
    vi.stubEnv("LABIA_ACCESS_CODE", "");
    expect((await unlockAction({}, form("beta-code"))).error).toMatch(/indisponível/);
  });
});
