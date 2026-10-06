import { describe, expect, it, vi } from "vitest";

import { estimateReel } from "./content-plan";

describe("reel estimate", () => {
  it("prices one 1K scene image and three 5s Kling blocks at 5.40, assembly free, script not priced", () => {
    vi.stubEnv("USD_BRL_RATE", "5.4");
    vi.stubEnv("FAL_MOCK", "1");
    const { perStep, totalBrl } = estimateReel();
    expect(perStep).toEqual({ SCRIPT: null, IMAGE: 0.43, VIDEO: 6.8, ASSEMBLY: 0 });
    expect(totalBrl).toBeCloseTo(7.23, 1);
    vi.unstubAllEnvs();
  });
});
