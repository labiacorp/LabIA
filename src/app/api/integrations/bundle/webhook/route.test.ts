import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirst = vi.fn();
const applyOutcome = vi.fn();
vi.mock("@/lib/prisma", () => ({ prisma: { socialPost: { findFirst: (...a: unknown[]) => findFirst(...a) } } }));
vi.mock("@/lib/social/posts", () => ({ applyOutcome: (...a: unknown[]) => applyOutcome(...a) }));

import { POST } from "./route";

const SECRET = "whsec_test";
const sign = (body: string) => createHmac("sha256", SECRET).update(body).digest("hex");
const req = (body: string, signature: string | null) =>
  new Request("http://localhost/api/integrations/bundle/webhook", { method: "POST", body, headers: signature ? { "x-signature": signature } : {} });
const posted = JSON.stringify({ type: "post.published", data: { id: "bp1", status: "POSTED", externalData: { INSTAGRAM: { permalink: "https://instagram.com/p/x" } } } });

beforeEach(() => {
  vi.stubEnv("BUNDLE_WEBHOOK_SECRET", SECRET);
  findFirst.mockReset();
  applyOutcome.mockReset();
  findFirst.mockResolvedValue({ id: "p1", status: "SCHEDULED", account: { network: "INSTAGRAM" } });
});

describe("bundle webhook", () => {
  it("rejects a bad or missing signature without touching anything", async () => {
    expect((await POST(req(posted, "deadbeef"))).status).toBe(401);
    expect((await POST(req(posted, null))).status).toBe(401);
    expect(applyOutcome).not.toHaveBeenCalled();
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("rejects a tampered body and an unset secret", async () => {
    const tampered = posted.replace("bp1", "bp2");
    expect((await POST(req(tampered, sign(posted)))).status).toBe(401);
    vi.stubEnv("BUNDLE_WEBHOOK_SECRET", "");
    expect((await POST(req(posted, sign(posted)))).status).toBe(401);
    expect(applyOutcome).not.toHaveBeenCalled();
  });

  it("applies a published outcome to the matching post", async () => {
    expect((await POST(req(posted, sign(posted)))).status).toBe(200);
    expect(findFirst.mock.calls[0][0].where.providerPostId).toBe("bp1");
    expect(applyOutcome).toHaveBeenCalledWith("p1", { state: "published", providerPostId: "bp1", url: "https://instagram.com/p/x" });
  });

  it("applies a failure for status ERROR", async () => {
    const body = JSON.stringify({ type: "post.published", data: { id: "bp1", status: "ERROR", error: "x" } });
    expect((await POST(req(body, sign(body)))).status).toBe(200);
    expect(applyOutcome).toHaveBeenCalledWith("p1", { state: "failed", reason: "platform_error" });
  });

  it("acknowledges an unknown post and applies nothing", async () => {
    findFirst.mockResolvedValue(null);
    expect((await POST(req(posted, sign(posted)))).status).toBe(200);
    expect(applyOutcome).not.toHaveBeenCalled();
  });

  it("ignores a repeated delivery once the post is no longer open", async () => {
    await POST(req(posted, sign(posted)));
    findFirst.mockResolvedValue({ id: "p1", status: "PUBLISHED", account: { network: "INSTAGRAM" } });
    expect((await POST(req(posted, sign(posted)))).status).toBe(200);
    expect(applyOutcome).toHaveBeenCalledTimes(1);
  });

  it("ignores other event types", async () => {
    const body = JSON.stringify({ type: "team.updated", data: { id: "t" } });
    expect((await POST(req(body, sign(body)))).status).toBe(200);
    expect(findFirst).not.toHaveBeenCalled();
  });
});
