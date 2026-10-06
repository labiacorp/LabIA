import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthExpiredError, type AccountRef, type MediaRef, type PublishInput } from "./publisher";
import { XPublisher } from "./x";

type Call = { url: string; init: RequestInit };
let calls: Call[];
let queue: Array<Response | Error>;

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => {
  calls = [];
  queue = [];
  vi.stubEnv("X_CLIENT_ID", "cid");
  vi.stubEnv("X_CLIENT_SECRET", "csecret");
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL, init: RequestInit = {}) => {
      const call = { url: String(url), init };
      calls.push(call);
      const next = queue.shift();
      if (!next) throw new Error("unexpected fetch " + call.url);
      if (next instanceof Error) throw next;
      return next;
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

const x = new XPublisher();
const account: AccountRef = { id: "a1", network: "X", providerAccountId: "123", handle: "felipe", accessToken: "tok" };
const input = (over: Partial<PublishInput> = {}): PublishInput => ({ account, text: "oi", media: null, aiLabel: true, scheduledAt: null, operationKey: "op", ...over });
const media = (kind: "IMAGE" | "VIDEO", bytes: number): MediaRef => ({
  kind,
  contentType: kind === "IMAGE" ? "image/png" : "video/mp4",
  fileName: kind === "IMAGE" ? "a.png" : "a.mp4",
  publicUrl: "https://cdn/x",
  read: async () => new Uint8Array(bytes),
});

describe("XPublisher connect", () => {
  it("builds a PKCE authorize URL", async () => {
    const { url, secret } = await x.startConnect({ userId: "u", redirectUri: "https://app/cb" });
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe("https://x.com/i/oauth2/authorize");
    expect(u.searchParams.get("response_type")).toBe("code");
    expect(u.searchParams.get("client_id")).toBe("cid");
    expect(u.searchParams.get("redirect_uri")).toBe("https://app/cb");
    expect(u.searchParams.get("scope")).toBe("tweet.read tweet.write users.read media.write offline.access");
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
    expect(u.searchParams.get("code_challenge")).toBeTruthy();
    const s = JSON.parse(secret!);
    expect(u.searchParams.get("state")).toBe(s.state);
    expect(s.verifier.length).toBeGreaterThanOrEqual(43);
  });

  it("exchanges the code and reads the profile", async () => {
    const { secret } = await x.startConnect({ userId: "u", redirectUri: "https://app/cb" });
    const state = JSON.parse(secret!).state;
    queue.push(json(200, { access_token: "AT", refresh_token: "RT", expires_in: 7200, scope: "tweet.read" }));
    queue.push(json(200, { data: { id: "123", username: "felipe", name: "Felipe", profile_image_url: "https://img/p.jpg" } }));
    const before = Date.now();
    const accounts = await x.finishConnect({ userId: "u", redirectUri: "https://app/cb", params: new URLSearchParams({ code: "c", state }), secret });
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({ network: "X", providerAccountId: "123", handle: "felipe", displayName: "Felipe", avatarUrl: "https://img/p.jpg" });
    expect(accounts[0].tokens!.accessToken).toBe("AT");
    expect(accounts[0].tokens!.refreshToken).toBe("RT");
    expect(Math.abs(accounts[0].tokens!.expiresAt!.getTime() - (before + 7200_000))).toBeLessThan(5000);
    expect(calls[0].url).toBe("https://api.x.com/2/oauth2/token");
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Basic " + Buffer.from("cid:csecret").toString("base64"));
    const body = new URLSearchParams(String(calls[0].init.body));
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code_verifier")).toBe(JSON.parse(secret!).verifier);
    expect(calls[1].url).toBe("https://api.x.com/2/users/me?user.fields=profile_image_url");
  });

  it("rejects a state mismatch before any fetch", async () => {
    const { secret } = await x.startConnect({ userId: "u", redirectUri: "https://app/cb" });
    await expect(x.finishConnect({ userId: "u", redirectUri: "https://app/cb", params: new URLSearchParams({ code: "c", state: "bad" }), secret })).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });

  it("refresh rotates and maps invalid_grant", async () => {
    queue.push(json(200, { access_token: "AT2", refresh_token: "RT2", expires_in: 7200 }));
    const t = await x.refresh!("RT");
    expect(t.accessToken).toBe("AT2");
    expect(t.refreshToken).toBe("RT2");
    expect(new URLSearchParams(String(calls[0].init.body)).get("grant_type")).toBe("refresh_token");
    queue.push(json(400, { error: "invalid_grant" }));
    await expect(x.refresh!("RT2")).rejects.toBeInstanceOf(AuthExpiredError);
  });
});

describe("XPublisher publish", () => {
  it("posts text with the AI flag", async () => {
    queue.push(json(201, { data: { id: "999", text: "oi" } }));
    const out = await x.publish(input());
    expect(out).toEqual({ state: "published", providerPostId: "999", url: "https://x.com/felipe/status/999" });
    expect(calls[0].url).toBe("https://api.x.com/2/tweets");
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ text: "oi", made_with_ai: true });
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("uploads an image then posts", async () => {
    queue.push(json(200, { data: { id: "m1" } }));
    queue.push(json(201, { data: { id: "5" } }));
    const out = await x.publish(input({ media: media("IMAGE", 100), aiLabel: false }));
    expect(out.state).toBe("published");
    expect(calls[0].url).toBe("https://api.x.com/2/media/upload");
    const form = calls[0].init.body as FormData;
    expect(form.get("media_category")).toBe("tweet_image");
    expect(form.get("media")).toBeTruthy();
    expect(JSON.parse(String(calls[1].init.body))).toEqual({ text: "oi", media: { media_ids: ["m1"] } });
  });

  it("uploads a 12 MB video in 3 chunks and waits for processing", async () => {
    vi.useFakeTimers();
    queue.push(json(200, { data: { id: "v1" } }));
    for (let i = 0; i < 3; i++) queue.push(json(200, {}));
    queue.push(json(200, { data: { id: "v1", processing_info: { state: "pending", check_after_secs: 2 } } }));
    queue.push(json(200, { data: { id: "v1", processing_info: { state: "in_progress", check_after_secs: 3 } } }));
    queue.push(json(200, { data: { id: "v1", processing_info: { state: "succeeded" } } }));
    queue.push(json(201, { data: { id: "7" } }));
    const p = x.publish(input({ media: media("VIDEO", 12 * 1024 * 1024) }));
    await vi.advanceTimersByTimeAsync(10_000);
    const out = await p;
    expect(out).toEqual({ state: "published", providerPostId: "7", url: "https://x.com/felipe/status/7" });
    expect(calls.map((c) => c.url)).toEqual([
      "https://api.x.com/2/media/upload/initialize",
      "https://api.x.com/2/media/upload/v1/append",
      "https://api.x.com/2/media/upload/v1/append",
      "https://api.x.com/2/media/upload/v1/append",
      "https://api.x.com/2/media/upload/v1/finalize",
      "https://api.x.com/2/media/upload?command=STATUS&media_id=v1",
      "https://api.x.com/2/media/upload?command=STATUS&media_id=v1",
      "https://api.x.com/2/tweets",
    ]);
    expect(JSON.parse(String(calls[0].init.body))).toEqual({ media_type: "video/mp4", total_bytes: 12 * 1024 * 1024, media_category: "tweet_video" });
    expect([1, 2, 3].map((i) => (calls[i].init.body as FormData).get("segment_index"))).toEqual(["0", "1", "2"]);
  });

  it("fails media_rejected when processing fails", async () => {
    vi.useFakeTimers();
    queue.push(json(200, { data: { id: "v1" } }));
    queue.push(json(200, {}));
    queue.push(json(200, { data: { id: "v1", processing_info: { state: "pending", check_after_secs: 1 } } }));
    queue.push(json(200, { data: { id: "v1", processing_info: { state: "failed" } } }));
    queue.push(json(200, {}));
    const p = x.publish(input({ media: media("VIDEO", 1000) }));
    await vi.advanceTimersByTimeAsync(5000);
    expect(await p).toEqual({ state: "failed", reason: "media_rejected" });
    expect(calls.some((c) => c.url.endsWith("/2/tweets"))).toBe(false);
  });

  it("fails platform_error when processing takes longer than 120 s", async () => {
    vi.useFakeTimers();
    queue.push(json(200, { data: { id: "v1" } }));
    queue.push(json(200, {}));
    queue.push(json(200, { data: { id: "v1", processing_info: { state: "pending", check_after_secs: 30 } } }));
    for (let i = 0; i < 6; i++) queue.push(json(200, { data: { id: "v1", processing_info: { state: "in_progress", check_after_secs: 30 } } }));
    const p = x.publish(input({ media: media("VIDEO", 1000) }));
    await vi.advanceTimersByTimeAsync(300_000);
    expect(await p).toEqual({ state: "failed", reason: "platform_error" });
    expect(calls.some((c) => c.url.endsWith("/2/tweets"))).toBe(false);
  });

  it("maps errors", async () => {
    queue.push(json(401));
    expect(await x.publish(input())).toEqual({ state: "failed", reason: "auth_expired" });
    queue.push(json(429));
    expect(await x.publish(input())).toEqual({ state: "failed", reason: "rate_limited" });
    queue.push(json(403));
    expect(await x.publish(input())).toEqual({ state: "failed", reason: "text_rejected" });
    queue.push(json(400));
    expect(await x.publish(input())).toEqual({ state: "failed", reason: "text_rejected" });
    queue.push(json(503));
    expect(await x.publish(input())).toEqual({ state: "unknown" });
    queue.push(new Error("network secret-body"));
    expect(await x.publish(input())).toEqual({ state: "unknown" });
  });

  it("maps a media upload failure to platform_error", async () => {
    queue.push(json(500, { detail: "tok-leak" }));
    expect(await x.publish(input({ media: media("IMAGE", 10) }))).toEqual({ state: "failed", reason: "platform_error" });
  });

  it("disconnect revokes the token", async () => {
    queue.push(json(200, { revoked: true }));
    await x.disconnect({ account });
    expect(calls[0].url).toBe("https://api.x.com/2/oauth2/revoke");
  });
});
