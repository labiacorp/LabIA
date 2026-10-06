import { describe, expect, it, vi } from "vitest";

import { estimateReel } from "./content-plan";

describe("reel estimate", () => {
  it("prices one 1K scene image and the default 15s MiniMax clip at 5.40, assembly free, script not priced", () => {
    vi.stubEnv("USD_BRL_RATE", "5.4");
    vi.stubEnv("FAL_MOCK", "1");
    const { perStep, totalBrl } = estimateReel();
    // (15s + 0.7s allowance) * $0.04 * 5.4
    expect(perStep).toEqual({ SCRIPT: null, IMAGE: 0.43, VIDEO: 3.39, ASSEMBLY: 0 });
    expect(totalBrl).toBeCloseTo(3.82, 2);
    vi.unstubAllEnvs();
  });
});
