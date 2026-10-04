import { afterEach, describe, expect, it, vi } from "vitest";
const transaction = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: transaction } }));
import { providerConfigured } from "./provider";
import { startPlan } from "./generation";
describe("provider readiness before spending", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("ignores mock mode in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("FAL_MOCK", "1");
    vi.stubEnv("FAL_KEY", "");
    expect(providerConfigured()).toBe(false);
  });
  it("fails before any reservation when no generation credentials are configured", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("FAL_MOCK", "0");
    vi.stubEnv("FAL_KEY", " ");
    await expect(
      startPlan({
        userId: "owner",
        influencerId: "character",
        intentId: "intent",
        expectedBrl: 0,
        plan: [],
      }),
    ).rejects.toThrow("Nenhum valor foi reservado");
    expect(transaction).not.toHaveBeenCalled();
  });
});
