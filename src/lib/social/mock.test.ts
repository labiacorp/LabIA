import { afterEach, describe, expect, it, vi } from "vitest";
import { BundlePublisher } from "./bundle";
import { MockPublisher } from "./mock";
import { XPublisher } from "./x";
import { backendReady, connectBackend, getPublisher, type AccountRef, type PublishInput, type Publisher } from "./publisher";

const account: AccountRef = { id: "a1", network: "X", providerAccountId: "mock-u", handle: "labia_teste", accessToken: "mock-access" };
const input = (over: Partial<PublishInput> = {}): PublishInput => ({
  account,
  text: "hello",
  media: null,
  aiLabel: false,
  scheduledAt: null,
  operationKey: "op1",
  ...over,
});

afterEach(() => vi.unstubAllEnvs());

describe("MockPublisher", () => {
  const mock: Publisher = new MockPublisher();

  it("startConnect returns a url carrying a state equal to the secret", async () => {
    const { url, secret } = await mock.startConnect({ userId: "u", redirectUri: "http://x/cb" });
    expect(secret).toBeTruthy();
    expect(url).toBe(`http://x/cb?code=mock&state=${secret}`);
  });

  it("finishConnect returns the mock account when the state matches", async () => {
    const { secret } = await mock.startConnect({ userId: "u1", redirectUri: "http://x/cb" });
    const accounts = await mock.finishConnect({ userId: "u1", redirectUri: "http://x/cb", params: new URLSearchParams({ code: "mock", state: secret! }), secret });
    expect(accounts).toHaveLength(1);
    expect(accounts[0]).toMatchObject({ network: "X", providerAccountId: "mock-u1", handle: "labia_teste" });
    expect(accounts[0].tokens).toMatchObject({ accessToken: "mock-access", refreshToken: "mock-refresh" });
    expect(accounts[0].tokens!.expiresAt!.getTime()).toBeGreaterThan(Date.now() + 60 * 60 * 1000);
  });

  it("finishConnect throws on a state mismatch", async () => {
    await expect(
      mock.finishConnect({ userId: "u", redirectUri: "r", params: new URLSearchParams({ state: "bad" }), secret: "good" }),
    ).rejects.toThrow();
  });

  it("publishes immediately", async () => {
    expect(await mock.publish(input())).toEqual({ state: "published", providerPostId: "mock-op1", url: "https://example.com/mock/mock-op1" });
  });

  it("fails on [mock-fail] and is unknown on [mock-unknown]", async () => {
    expect(await mock.publish(input({ text: "x [mock-fail]" }))).toEqual({ state: "failed", reason: "platform_error" });
    expect(await mock.publish(input({ text: "x [mock-unknown]" }))).toEqual({ state: "unknown" });
  });

  it("schedules a future post and publishes a past-dated one", async () => {
    const future = new Date(Date.now() + 3600_000);
    expect(await mock.publish(input({ scheduledAt: future }))).toEqual({ state: "scheduled", providerPostId: "mock-sched-op1" });
    const past = new Date(Date.now() - 3600_000);
    expect((await mock.publish(input({ scheduledAt: past }))).state).toBe("published");
  });

  it("status of a scheduled id is published", async () => {
    const out = await mock.status({ account, providerPostId: "mock-sched-op1" });
    expect(out.state).toBe("published");
  });

  it("refresh returns a new pair; cancel and disconnect resolve", async () => {
    const t = await mock.refresh!("old");
    expect(t.accessToken).toBeTruthy();
    expect(t.refreshToken).toBeTruthy();
    await expect(mock.cancel!({ account, providerPostId: "p" })).resolves.toBeUndefined();
    await expect(mock.disconnect!({ account })).resolves.toBeUndefined();
  });
});

describe("getPublisher / connectBackend / backendReady", () => {
  it("returns the mock for every backend when FAL_MOCK=1", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("FAL_MOCK", "1");
    expect(getPublisher("x").backend).toBe("mock");
    expect(getPublisher("bundle").backend).toBe("mock");
    expect(connectBackend("x")).toBe("mock");
    expect(backendReady("bundle")).toBe(true);
  });

  it("returns the X and bundle adapters when not mocked", () => {
    vi.stubEnv("FAL_MOCK", "");
    expect(getPublisher("x")).toBeInstanceOf(XPublisher);
    expect(getPublisher("bundle")).toBeInstanceOf(BundlePublisher);
    expect(connectBackend("bundle")).toBe("bundle");
  });

  it("backendReady checks the required env vars", () => {
    vi.stubEnv("FAL_MOCK", "");
    vi.stubEnv("X_CLIENT_ID", "");
    vi.stubEnv("X_CLIENT_SECRET", "");
    vi.stubEnv("SOCIAL_TOKEN_KEY", "");
    vi.stubEnv("BUNDLE_API_KEY", "");
    expect(backendReady("x")).toBe(false);
    expect(backendReady("bundle")).toBe(false);
    vi.stubEnv("BUNDLE_API_KEY", "k");
    expect(backendReady("bundle")).toBe(true);
    vi.stubEnv("X_CLIENT_ID", "a");
    vi.stubEnv("X_CLIENT_SECRET", "b");
    vi.stubEnv("SOCIAL_TOKEN_KEY", "c");
    expect(backendReady("x")).toBe(true);
    vi.stubEnv("SOCIAL_TOKEN_KEY", "");
    expect(backendReady("x")).toBe(false);
  });
});
