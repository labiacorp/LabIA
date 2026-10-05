import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
import { emailEnabled } from "./email";

afterEach(() => vi.unstubAllEnvs());

describe("e-mail switch", () => {
  it("stays off in production until both the key and the sender exist", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "re_key");
    vi.stubEnv("EMAIL_FROM", "");
    expect(emailEnabled()).toBe(false);
    vi.stubEnv("EMAIL_FROM", "LabIA <nao-responda@example.com>");
    expect(emailEnabled()).toBe(true);
    vi.stubEnv("RESEND_API_KEY", " ");
    expect(emailEnabled()).toBe(false);
  });
  it("is always on in development, where messages go to the outbox", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RESEND_API_KEY", "");
    expect(emailEnabled()).toBe(true);
  });
});
