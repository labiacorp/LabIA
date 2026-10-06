import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { openToken, sealToken } from "./crypto";

describe("token sealing", () => {
  beforeEach(() => vi.stubEnv("SOCIAL_TOKEN_KEY", Buffer.alloc(32, 7).toString("base64")));
  afterEach(() => vi.unstubAllEnvs());

  it("round-trips and rejects tampering or the wrong row", () => {
    const sealed = sealToken("secret-token", "acc_1");
    expect(sealed.startsWith("v1:")).toBe(true);
    expect(sealed).not.toContain("secret-token");
    expect(openToken(sealed, "acc_1")).toBe("secret-token");
    expect(() => openToken(sealed, "acc_2")).toThrow("Token unavailable");
    expect(() => openToken(sealed.slice(0, -2) + "AA", "acc_1")).toThrow("Token unavailable");
  });

  it("refuses to seal without a 32-byte key", () => {
    vi.stubEnv("SOCIAL_TOKEN_KEY", "");
    expect(() => sealToken("x", "a")).toThrow();
    vi.stubEnv("SOCIAL_TOKEN_KEY", Buffer.alloc(16, 1).toString("base64"));
    expect(() => sealToken("x", "a")).toThrow();
  });
});
