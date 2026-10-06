import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { dispatchDuePosts } = vi.hoisted(() => ({ dispatchDuePosts: vi.fn() }));
vi.mock("@/lib/social/posts", () => ({ dispatchDuePosts }));

import { GET } from "./route";

const call = (authorization?: string) =>
  GET(new Request("http://localhost/api/cron/social", { headers: authorization ? { authorization } : {} }));

describe("GET /api/cron/social", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "s3cret-value");
    dispatchDuePosts.mockReset().mockResolvedValue({ published: 1, scheduled: 2, failed: 3, unknown: 4 });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("rejects a missing header", async () => {
    expect((await call()).status).toBe(401);
    expect(dispatchDuePosts).not.toHaveBeenCalled();
  });

  it("rejects a wrong secret", async () => {
    expect((await call("Bearer nope")).status).toBe(401);
    expect(dispatchDuePosts).not.toHaveBeenCalled();
  });

  it("answers 503 when CRON_SECRET is unset", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("Bearer ")).status).toBe(503);
  });

  it("runs the dispatcher with the right secret", async () => {
    const res = await call("Bearer s3cret-value");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ published: 1, scheduled: 2, failed: 3, unknown: 4 });
  });
});
