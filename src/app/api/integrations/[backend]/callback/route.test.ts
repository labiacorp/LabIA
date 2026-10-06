import { randomBytes } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({ userId: "u1" as string, owner: false }));
vi.mock("@/lib/session", () => ({ requireUserId: async () => state.userId }));
vi.mock("@/lib/owner", async () => {
  const { notFound } = await import("next/navigation");
  return { requireOwner: async () => (state.owner ? state.userId : notFound()) };
});
vi.mock("@/lib/prisma", () => ({ prisma: { influencer: { findFirst: vi.fn(async () => null) } } }));
vi.mock("@/lib/social/accounts", () => ({ saveConnectedAccounts: vi.fn(async () => ["acc1"]) }));

import { saveConnectedAccounts } from "@/lib/social/accounts";
import { SocialError } from "@/lib/social/errors";
import { sealToken } from "@/lib/social/crypto";
import { GET as start } from "../start/route";
import { GET as callback } from "./route";

const save = vi.mocked(saveConnectedAccounts);
const ctx = (backend: string) => ({ params: Promise.resolve({ backend }) });
const req = (path: string, cookie?: string) =>
  new NextRequest(`http://127.0.0.1:3000${path}`, { headers: cookie ? { cookie: `labia_social_x=${cookie}` } : {} });
const location = (res: Response) => {
  const url = new URL(res.headers.get("location")!);
  return url.pathname + url.search;
};
const cookieOf = (res: Response) => res.headers.getSetCookie().find((c) => c.startsWith("labia_social_x="))!.split(";")[0].split("=")[1];

beforeEach(() => {
  vi.stubEnv("FAL_MOCK", "1");
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
    await expect(callback(req("/api/integrations/foo/callback"), ctx("foo"))).rejects.toThrow();
    await expect(start(req("/api/integrations/bundle/start"), ctx("bundle"))).rejects.toThrow();
  });
});
