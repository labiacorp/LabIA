import { afterEach, describe, expect, it, vi } from "vitest";

import { codeMatches, gateMode, hasAccessPass, signAccessPass } from "./access";

const SECRET = "x".repeat(40);
const on = (code = "beta-code") => {
  vi.stubEnv("LABIA_ACCESS_CODE", code);
  vi.stubEnv("AUTH_SECRET", SECRET);
};

afterEach(() => vi.unstubAllEnvs());

describe("access gate", () => {
  it("accepts a pass it signed and rejects tampering, junk and an empty cookie", () => {
    on();
    const pass = signAccessPass();
    expect(hasAccessPass(pass)).toBe(true);
    expect(hasAccessPass(pass.replace(/.$/, (c) => (c === "a" ? "b" : "a")))).toBe(false);
    expect(hasAccessPass("junk")).toBe(false);
    expect(hasAccessPass("")).toBe(false);
    expect(hasAccessPass(undefined)).toBe(false);
  });

  it("expires the pass", () => {
    on();
    const pass = signAccessPass(1_000);
    expect(hasAccessPass(pass, 1_000 + 13 * 24 * 3600 * 1000)).toBe(true);
    expect(hasAccessPass(pass, 1_000 + 15 * 24 * 3600 * 1000)).toBe(false);
  });

  it("rotating the code invalidates every earlier pass", () => {
    on("old-code");
    const pass = signAccessPass();
    on("new-code");
    expect(hasAccessPass(pass)).toBe(false);
  });

  it("compares the typed code without caring about surrounding spaces, and never matches empty", () => {
    on();
    expect(codeMatches("  beta-code ")).toBe(true);
    expect(codeMatches("beta-cod")).toBe(false);
    expect(codeMatches("")).toBe(false);
  });

  it("is open in production with no code, and closed with a code but no secret", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LABIA_ACCESS_CODE", "");
    vi.stubEnv("AUTH_SECRET", "");
    expect(gateMode()).toBe("off");
    expect(hasAccessPass("anything")).toBe(true);
    vi.stubEnv("LABIA_ACCESS_CODE", "beta-code"); // code without a secret
    expect(gateMode()).toBe("closed");
  });

  it("is off in development with nothing set, and closed with a half-configured gate", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LABIA_ACCESS_CODE", "");
    vi.stubEnv("AUTH_SECRET", "");
    expect(gateMode()).toBe("off");
    expect(hasAccessPass(undefined)).toBe(true);
    vi.stubEnv("LABIA_ACCESS_CODE", "beta-code");
    expect(gateMode()).toBe("closed");
  });
});
