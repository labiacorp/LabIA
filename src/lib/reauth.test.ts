import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/rate-limit", () => ({ hit: vi.fn() }));
import { recentlySignedIn, REAUTH_WINDOW_MS } from "./reauth";

const session = (authMethod: string, age: number) => ({ user: { id: "u" }, expires: "", authMethod, authAt: 1_000_000 - age });

describe("recent sign-in window", () => {
  it("accepts a Google sign-in younger than five minutes, and nothing else", () => {
    expect(recentlySignedIn(session("google", 1000), 1_000_000)).toBe(true);
    expect(recentlySignedIn(session("google", REAUTH_WINDOW_MS + 1), 1_000_000)).toBe(false);
    expect(recentlySignedIn(session("password", 1000), 1_000_000)).toBe(false);
    expect(recentlySignedIn({ user: { id: "u" }, expires: "", authMethod: "google" }, 1_000_000)).toBe(false);
    expect(recentlySignedIn(null)).toBe(false);
  });
  it("lets the dev provider stand in for Google only in development", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(recentlySignedIn(session("dev", 1000), 1_000_000)).toBe(false);
    vi.stubEnv("NODE_ENV", "development");
    expect(recentlySignedIn(session("dev", 1000), 1_000_000)).toBe(true);
    vi.unstubAllEnvs();
  });
});
