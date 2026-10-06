import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({ userId: "u1" as string | null, owner: false }));
vi.mock("@/lib/session", async () => {
  const { redirect } = await import("next/navigation");
  return { requireUserId: async () => state.userId ?? redirect("/login") };
});
vi.mock("@/lib/owner", async () => {
  const { notFound } = await import("next/navigation");
  return { requireOwner: async () => (state.owner ? state.userId : notFound()) };
});
const owners: Record<string, string> = { "inf-mine": "u1", "inf-other": "u2" };
vi.mock("@/lib/prisma", () => ({
  prisma: { influencer: { findFirst: vi.fn(async ({ where }: { where: { id: string; userId: string } }) => (owners[where.id] === where.userId ? { id: where.id } : null)) } },
}));
vi.mock("@/lib/social/accounts", () => ({ saveConnectedAccounts: vi.fn(async () => ["acc1"]) }));

import { saveConnectedAccounts } from "@/lib/social/accounts";
import { SocialError } from "@/lib/social/errors";
import { openToken, sealToken } from "@/lib/social/crypto";
import { GET as start } from "../start/route";
import { GET as callback } from "./route";

const save = vi.mocked(saveConnectedAccounts);
const ctx = (backend: string) => ({ params: Promise.resolve({ backend }) });
const req = (path: string, cookie?: string) =>
  new NextRequest(`http://127.0.0.1:3000${path}`, { headers: cookie ? { cookie: `labia_social_x=${cookie}` } : {} });
const location = (res: Response) => {
  const url = new URL(res.headers.get("location")!, "http://base.test");
  return url.pathname + url.search;
};
const cookieOf = (res: Response) => res.headers.getSetCookie().find((c) => c.startsWith("labia_social_x="))!.split(";")[0].split("=")[1];

afterEach(() => vi.unstubAllEnvs());
beforeEach(() => {
  vi.stubEnv("FAL_MOCK", "1");
  vi.stubEnv("LABIA_PUBLIC_URL", "");
  vi.stubEnv("SOCIAL_TOKEN_KEY", randomBytes(32).toString("base64"));
  state.userId = "u1";
  state.owner = false;
  save.mockClear();
  save.mockResolvedValue(["acc1"]);
});

async function begin() {
  const res = await start(req("/api/integrations/x/start"), ctx("x"));
  const redirect = new URL(res.headers.get("location")!);
  return { cookie: cookieOf(res), state: redirect.searchParams.get("state")! };
}

describe("OAuth callback route", () => {
  it("connects on the happy path", async () => {
    const { cookie, state: s } = await begin();
    const res = await callback(req(`/api/integrations/x/callback?code=mock&state=${s}`, cookie), ctx("x"));
    expect(location(res)).toBe("/integracoes?conectado=x");
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][2][0]).toMatchObject({ providerAccountId: "mock-u1" });
  });

  it("rejects a forged state", async () => {
    const { cookie } = await begin();
    const res = await callback(req("/api/integrations/x/callback?code=mock&state=forged", cookie), ctx("x"));
    expect(location(res)).toBe("/integracoes?erro=x");
    expect(save).not.toHaveBeenCalled();
  });

  it("rejects a missing cookie", async () => {
    const res = await callback(req("/api/integrations/x/callback?code=mock&state=a"), ctx("x"));
    expect(location(res)).toBe("/integracoes?erro=x");
    expect(save).not.toHaveBeenCalled();
  });

  it("rejects an unreadable cookie and a provider error param", async () => {
    const bad = await callback(req("/api/integrations/x/callback?code=mock&state=a", "garbage"), ctx("x"));
    expect(location(bad)).toBe("/integracoes?erro=x");
    const { cookie, state: s } = await begin();
    const denied = await callback(req(`/api/integrations/x/callback?error=access_denied&state=${s}`, cookie), ctx("x"));
    expect(location(denied)).toBe("/integracoes?erro=x");
    expect(save).not.toHaveBeenCalled();
  });

  it("rejects a cookie sealed for another user", async () => {
    const cookie = sealToken(JSON.stringify({ userId: "someone-else", secret: "s", influencerId: null }), "oauth:x");
    const res = await callback(req("/api/integrations/x/callback?code=mock&state=s", cookie), ctx("x"));
    expect(location(res)).toBe("/integracoes?erro=x");
    expect(save).not.toHaveBeenCalled();
  });

  it("maps a SocialError to erro=ocupada and clears the cookie", async () => {
    save.mockRejectedValueOnce(new SocialError("taken"));
    const { cookie, state: s } = await begin();
    const res = await callback(req(`/api/integrations/x/callback?code=mock&state=${s}`, cookie), ctx("x"));
    expect(location(res)).toBe("/integracoes?erro=ocupada");
    expect(res.headers.getSetCookie().join()).toMatch(/labia_social_x=;/);
  });

  it("404s an unknown backend and bundle for a non-owner", async () => {
    const notFound = { digest: "NEXT_HTTP_ERROR_FALLBACK;404" };
    await expect(callback(req("/api/integrations/foo/callback"), ctx("foo"))).rejects.toMatchObject(notFound);
    await expect(start(req("/api/integrations/foo/start"), ctx("foo"))).rejects.toMatchObject(notFound);
    await expect(start(req("/api/integrations/bundle/start"), ctx("bundle"))).rejects.toMatchObject(notFound);
    await expect(callback(req("/api/integrations/bundle/callback"), ctx("bundle"))).rejects.toMatchObject(notFound);
  });

  it("redirects an unauthenticated user to /login", async () => {
    state.userId = null;
    const redirected = { digest: expect.stringMatching(/^NEXT_REDIRECT;.*;\/login;/) };
    await expect(start(req("/api/integrations/x/start"), ctx("x"))).rejects.toMatchObject(redirected);
    await expect(callback(req("/api/integrations/x/callback"), ctx("x"))).rejects.toMatchObject(redirected);
  });
});

describe("start route cookie and influencer", () => {
  const sealedOf = (res: Response) => JSON.parse(openToken(decodeURIComponent(cookieOf(res)), "oauth:x"));

  it("sets a hardened cookie scoped to the backend", async () => {
    const res = await start(req("/api/integrations/x/start"), ctx("x"));
    const header = res.headers.getSetCookie().find((c) => c.startsWith("labia_social_x="))!;
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/SameSite=lax/i);
    expect(header).toMatch(/Path=\/api\/integrations\/x(;|$)/);
    expect(header).toMatch(/Max-Age=600/i);
    expect(header).not.toMatch(/Secure/i);
  });

  it("marks the cookie Secure in production and uses LABIA_PUBLIC_URL for the redirect URI", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("FAL_MOCK", "");
    vi.stubEnv("X_CLIENT_ID", "cid");
    vi.stubEnv("X_CLIENT_SECRET", "csecret");
    vi.stubEnv("LABIA_PUBLIC_URL", "https://app.labia.test");
    const res = await start(req("/api/integrations/x/start"), ctx("x"));
    expect(res.headers.getSetCookie().find((c) => c.startsWith("labia_social_x="))!).toMatch(/Secure/i);
    expect(new URL(res.headers.get("location")!).searchParams.get("redirect_uri")).toBe("https://app.labia.test/api/integrations/x/callback");
  });

  it("refuses production without an https LABIA_PUBLIC_URL (never the Host header)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("FAL_MOCK", "");
    for (const bad of ["", "http://app.labia.test"]) {
      vi.stubEnv("LABIA_PUBLIC_URL", bad);
      const res = await start(req("/api/integrations/x/start"), ctx("x"));
      expect(location(res)).toBe("/integracoes?erro=config");
      expect(res.headers.getSetCookie()).toHaveLength(0);
      const cb = await callback(req("/api/integrations/x/callback?code=c&state=s", "whatever"), ctx("x"));
      expect(location(cb)).toBe("/integracoes?erro=x");
    }
    expect(save).not.toHaveBeenCalled();
  });

  it("keeps an owned influencer id and drops one owned by another user", async () => {
    const mine = await start(req("/api/integrations/x/start?influencerId=inf-mine"), ctx("x"));
    expect(sealedOf(mine).influencerId).toBe("inf-mine");
    const other = await start(req("/api/integrations/x/start?influencerId=inf-other"), ctx("x"));
    expect(sealedOf(other).influencerId).toBeNull();
  });

  it("callback drops an influencer id that is not the user's", async () => {
    for (const [id, expected] of [["inf-other", undefined], ["inf-mine", "inf-mine"]] as const) {
      save.mockClear();
      const cookie = sealToken(JSON.stringify({ userId: "u1", secret: "s", influencerId: id }), "oauth:x");
      const res = await callback(req("/api/integrations/x/callback?code=mock&state=s", cookie), ctx("x"));
      expect(location(res)).toBe("/integracoes?conectado=x");
      expect(save.mock.calls[0][3]).toBe(expected);
    }
  });
});
