import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { codeMatches, gateMode, hasAccessPass, isGatedPath, signAccessPass } from "@/lib/auth/access-gate";

const SECRET = "s".repeat(40);

function configure(env: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) vi.stubEnv(key, "");
    else vi.stubEnv(key, value);
  }
}

describe("access gate", () => {
  beforeEach(() => configure({ LABIA_ACCESS_CODE: "beta-code", LABIA_COOKIE_SECRET: SECRET, NODE_ENV: "production" }));
  afterEach(() => vi.unstubAllEnvs());

  it("accepts a pass it signed and rejects tampering, junk and an empty cookie", () => {
    const pass = signAccessPass();
    expect(hasAccessPass(pass)).toBe(true);
    expect(hasAccessPass(undefined)).toBe(false);
    expect(hasAccessPass("")).toBe(false);
    expect(hasAccessPass("junk")).toBe(false);
    expect(hasAccessPass(`${pass}.extra`)).toBe(false);
    const [exp, signature] = pass.split(".");
    expect(hasAccessPass(`${Number(exp) + 1000}.${signature}`)).toBe(false);
  });

  it("expires the pass", () => {
    const pass = signAccessPass(Date.now() - 15 * 24 * 60 * 60 * 1000);
    expect(hasAccessPass(pass)).toBe(false);
  });

  it("rotating the code invalidates every earlier pass", () => {
    const pass = signAccessPass();
    configure({ LABIA_ACCESS_CODE: "another-code" });
    expect(hasAccessPass(pass)).toBe(false);
  });

  it("compares the typed code without caring about surrounding spaces", () => {
    expect(codeMatches(" beta-code ")).toBe(true);
    expect(codeMatches("beta-cod")).toBe(false);
    expect(codeMatches("")).toBe(false);
  });

  it("closes in production when the code or the secret is missing", () => {
    configure({ LABIA_ACCESS_CODE: undefined });
    expect(gateMode()).toBe("closed");
    expect(hasAccessPass("anything")).toBe(false);
    configure({ LABIA_ACCESS_CODE: "beta-code", LABIA_COOKIE_SECRET: undefined });
    expect(gateMode()).toBe("closed");
    expect(() => signAccessPass()).toThrow();
  });

  it("is off in development with nothing set, and closed in development with a half-configured gate", () => {
    configure({ NODE_ENV: "development", LABIA_ACCESS_CODE: undefined });
    expect(gateMode()).toBe("off");
    expect(hasAccessPass(undefined)).toBe(true);
    configure({ LABIA_ACCESS_CODE: "beta-code", LABIA_COOKIE_SECRET: undefined });
    expect(gateMode()).toBe("closed");
  });

  it("gates the auth forms but not the email links or the OAuth return", () => {
    for (const path of ["/entrar", "/criar-conta", "/criar-conta/codigo", "/esqueci-a-senha"]) expect(isGatedPath(path)).toBe(true);
    for (const path of ["/criar-conta/confirmar", "/redefinir-senha/confirmar", "/auth/callback", "/acesso", "/"]) expect(isGatedPath(path)).toBe(false);
  });
});
