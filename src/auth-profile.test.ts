import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ upsert: vi.fn().mockResolvedValue({ id: "existing-user" }), config: null as unknown as { callbacks: { jwt: (input: { token: Record<string, unknown>; user: { email: string; name: string; image: string } }) => Promise<Record<string, unknown>> } } }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next-auth", () => ({ CredentialsSignin: class extends Error {}, default: (config: typeof mocks.config) => { mocks.config = config; return {}; } }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { upsert: mocks.upsert } } }));
vi.mock("@/lib/access", () => ({ hasPass: vi.fn(), gateMode: () => "off", grantPass: vi.fn() }));
import "./auth";

describe("profile on subsequent sign-in", () => {
  it("uses the provider name for new accounts and preserves the edited name for existing accounts", async () => {
    const token = await mocks.config.callbacks.jwt({ token: {}, user: { email: "ANA@example.com", name: "Provider Name", image: "https://example.com/avatar.png" } });
    const args = mocks.upsert.mock.calls[0][0];
    expect(args.create.name).toBe("Provider Name");
    expect(args.where.email).toBe("ana@example.com");
    expect(args.update).not.toHaveProperty("name");
    expect(token.uid).toBe("existing-user");
  });
});
