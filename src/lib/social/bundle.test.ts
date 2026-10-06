import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tenants = new Map<string, { externalId: string }>();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    socialTenant: {
      findUnique: async ({ where }: { where: { userId_backend: { userId: string } } }) => tenants.get(where.userId_backend.userId) ?? null,
      create: async ({ data }: { data: { userId: string; externalId: string } }) => {
        tenants.set(data.userId, { externalId: data.externalId });
        return data;
      },
    },
  },
}));

import { BundlePublisher, verifyBundleSignature } from "./bundle";
import type { AccountRef, PublishInput } from "./publisher";

type Call = { url: string; init: RequestInit };
let calls: Call[];
let queue: Array<Response | Error>;
const json = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status });
const bodyOf = (c: Call) => JSON.parse(String(c.init.body));

const account: AccountRef = { id: "a1", network: "INSTAGRAM", providerAccountId: "team1:acc1", handle: "me", accessToken: null };
const input = (over: Partial<PublishInput> = {}): PublishInput => ({
  account,
  text: "hello",
  media: null,
  aiLabel: false,
  scheduledAt: new Date("2026-11-01T12:00:00Z"),
  operationKey: "intent:a1",
  ...over,
});
const image = { kind: "IMAGE" as const, contentType: "image/png", fileName: "a.png", publicUrl: "https://signed/a.png", read: async () => new Uint8Array() };

beforeEach(() => {
  calls = [];
  queue = [];
  tenants.clear();
  vi.stubEnv("BUNDLE_API_KEY", "pk_test");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL, init: RequestInit = {}) => {
      calls.push({ url: String(url), init });
      const next = queue.shift();
      if (!next) throw new Error("unexpected fetch " + url);
      if (next instanceof Error) throw next;
      return next;
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("BundlePublisher connect", () => {
  it("creates the team once, reuses it, and sends redirect and language to the portal link", async () => {
    const b = new BundlePublisher();
    const redirectUri = "https://labia.app/api/integrations/bundle/callback";
    queue.push(json(200, { id: "team1" }), json(200, { url: "https://bundle.social/connect?token=1" }), json(200, { url: "https://bundle.social/connect?token=2" }));
    const first = await b.startConnect({ userId: "u1", redirectUri });
    await b.startConnect({ userId: "u1", redirectUri });
    expect(first).toEqual({ url: "https://bundle.social/connect?token=1", secret: null });
    expect(calls.map((c) => c.url)).toEqual([
      "https://api.bundle.social/api/v1/team/",
      "https://api.bundle.social/api/v1/social-account/create-portal-link",
      "https://api.bundle.social/api/v1/social-account/create-portal-link",
    ]);
    expect((calls[0].init.headers as Record<string, string>)["x-api-key"]).toBe("pk_test");
    const portal = bodyOf(calls[1]);
    expect(portal).toMatchObject({ teamId: "team1", redirectUrl: redirectUri, language: "pt", expiresIn: 10 });
    expect(portal.socialAccountTypes).not.toContain("TWITTER");
  });

  it("maps supported networks, skips X and deleted accounts", async () => {
    tenants.set("u1", { externalId: "team1" });
    queue.push(
      json(200, {
        socialAccounts: [
          { id: "s1", type: "INSTAGRAM", username: "ig", displayName: "IG", avatarUrl: "https://a/i.png" },
          { id: "s2", type: "TWITTER", username: "x" },
          { id: "s3", type: "LINKEDIN", displayName: "Page", deletedAt: "2026-01-01" },
          { id: "s4", type: "TIKTOK", displayName: "Tik" },
        ],
      }),
    );
    const accounts = await new BundlePublisher().finishConnect({ userId: "u1", redirectUri: "", params: new URLSearchParams(), secret: null });
    expect(accounts).toEqual([
      { network: "INSTAGRAM", providerAccountId: "team1:s1", handle: "ig", displayName: "IG", avatarUrl: "https://a/i.png", tokens: null },
      { network: "TIKTOK", providerAccountId: "team1:s4", handle: "Tik", displayName: "Tik", avatarUrl: undefined, tokens: null },
    ]);
    expect(calls[0].url).toBe("https://api.bundle.social/api/v1/team/team1");
  });
});

describe("BundlePublisher publish", () => {
  it("uploads the media then schedules the post", async () => {
    queue.push(json(200, { id: "up1" }), json(200, { id: "bp1", status: "SCHEDULED" }));
    const out = await new BundlePublisher().publish(input({ media: image, aiLabel: true }));
    expect(out).toEqual({ state: "scheduled", providerPostId: "bp1" });
    expect(bodyOf(calls[0])).toEqual({ url: "https://signed/a.png", teamId: "team1" });
    expect(calls[1].url).toBe("https://api.bundle.social/api/v1/post/");
    expect(bodyOf(calls[1])).toEqual({
      teamId: "team1",
      title: "hello",
      postDate: "2026-11-01T12:00:00.000Z",
      status: "SCHEDULED",
      socialAccountTypes: ["INSTAGRAM"],
      referenceKey: "intent:a1",
      data: { INSTAGRAM: { text: "hello", uploadIds: ["up1"], type: "POST", isAiGenerated: true } },
    });
  });

  it("returns published when bundle.social reports it immediately", async () => {
    queue.push(json(200, { id: "bp1", status: "POSTED", externalData: { INSTAGRAM: { permalink: "https://ig/p/1" } } }));
    expect(await new BundlePublisher().publish(input())).toEqual({ state: "published", providerPostId: "bp1", url: "https://ig/p/1" });
  });

  it("maps errors: 401 auth, 429 rate limit, 400 platform, upload 400 media, network unknown", async () => {
    const b = new BundlePublisher();
    queue.push(json(401));
    expect(await b.publish(input())).toEqual({ state: "failed", reason: "auth_expired" });
    queue.push(json(429));
    expect(await b.publish(input())).toEqual({ state: "failed", reason: "rate_limited" });
    queue.push(json(400));
    expect(await b.publish(input())).toEqual({ state: "failed", reason: "platform_error" });
    queue.push(json(400));
    expect(await b.publish(input({ media: image }))).toEqual({ state: "failed", reason: "media_rejected" });
    queue.push(new Error("socket hang up"));
    expect(await b.publish(input())).toEqual({ state: "unknown" });
    queue.push(json(502));
    expect(await b.publish(input())).toEqual({ state: "unknown" });
  });
});

describe("BundlePublisher status, cancel, disconnect", () => {
  const b = new BundlePublisher();
  const ref = { account, providerPostId: "bp1" };

  it("maps POSTED, ERROR and pending", async () => {
    queue.push(json(200, { id: "bp1", status: "POSTED", externalData: { INSTAGRAM: { permalink: "https://ig/p/1" } } }));
    expect(await b.status(ref)).toEqual({ state: "published", providerPostId: "bp1", url: "https://ig/p/1" });
    queue.push(json(200, { id: "bp1", status: "ERROR" }));
    expect(await b.status(ref)).toEqual({ state: "failed", reason: "platform_error" });
    queue.push(json(200, { id: "bp1", status: "PROCESSING" }));
    expect(await b.status(ref)).toEqual({ state: "scheduled", providerPostId: "bp1" });
  });

  it("cancel deletes the post and throws on failure", async () => {
    queue.push(json(200, {}), json(500));
    await b.cancel(ref);
    expect(calls[0]).toMatchObject({ url: "https://api.bundle.social/api/v1/post/bp1", init: { method: "DELETE" } });
    await expect(b.cancel(ref)).rejects.toThrow();
  });

  it("disconnect sends type and team", async () => {
    queue.push(json(200, {}));
    await b.disconnect({ account });
    expect(calls[0].init.method).toBe("DELETE");
    expect(bodyOf(calls[0])).toEqual({ type: "INSTAGRAM", teamId: "team1" });
  });
});

describe("verifyBundleSignature", () => {
  it("accepts the HMAC and rejects anything else", () => {
    vi.stubEnv("BUNDLE_WEBHOOK_SECRET", "s");
    const mac = createHmac("sha256", "s").update("body").digest();
    expect(verifyBundleSignature("body", mac.toString("hex"))).toBe(true);
    expect(verifyBundleSignature("body", mac.toString("base64"))).toBe(true);
    expect(verifyBundleSignature("body", "sha256=" + mac.toString("hex"))).toBe(true);
    expect(verifyBundleSignature("other", mac.toString("hex"))).toBe(false);
    expect(verifyBundleSignature("body", null)).toBe(false);
    vi.stubEnv("BUNDLE_WEBHOOK_SECRET", "");
    expect(verifyBundleSignature("body", mac.toString("hex"))).toBe(false);
  });
});
