import { afterEach, beforeEach, expect, it, vi } from "vitest";

const ok = (body: unknown) => ({ ok: true, json: async () => body }) as Response;
const awesome = (ask: string) => ok({ USDBRL: { ask } });
beforeEach(() => { vi.resetModules(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.stubEnv("USD_BRL_RATE", "5.4"); vi.stubEnv("USD_BRL_LIVE", "1"); vi.stubEnv("FAL_MOCK", ""); vi.stubEnv("USD_BRL_RATE_FIXED", ""); vi.stubEnv("USD_BRL_SPREAD_PCT", ""); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it("uses the live quote, then follows the market on the next refresh", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(awesome("4.96")).mockResolvedValueOnce(awesome("4.90"));
  vi.stubGlobal("fetch", fetchMock);
  const fx = await import("./fx");
  expect(fx.usdBrlRate()).toBe(5.4); // nothing cached yet: fallback while the first fetch runs
  await fx.refreshRate();
  expect(fx.usdBrlRate()).toBe(4.96);
  await fx.refreshRate(true);
  expect(fx.rateInfo()).toMatchObject({ rate: 4.9, source: "awesomeapi" });
});

it("falls back to the second source and rejects absurd quotes", async () => {
  const fetchMock = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce(ok({ rates: { BRL: 5.01 } }));
  vi.stubGlobal("fetch", fetchMock);
  const fx = await import("./fx");
  await fx.refreshRate();
  expect(fx.rateInfo()).toMatchObject({ rate: 5.01, source: "open.er-api" });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(awesome("1.2")));
  await fx.refreshRate(true);
  expect(fx.usdBrlRate()).toBe(5.01); // 1.2 is a bad feed, the last good quote stays
});

it("keeps a pinned rate and applies an optional spread", async () => {
  vi.stubEnv("USD_BRL_RATE_FIXED", "5.5");
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  let fx = await import("./fx");
  expect(fx.usdBrlRate()).toBe(5.5);
  await fx.refreshRate();
  expect(fetchMock).not.toHaveBeenCalled();
  vi.resetModules();
  vi.stubEnv("USD_BRL_RATE_FIXED", "");
  vi.stubEnv("USD_BRL_SPREAD_PCT", "4");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(awesome("5.00")));
  fx = await import("./fx");
  await fx.refreshRate();
  expect(fx.usdBrlRate()).toBe(5.2);
});

it("uses USD_BRL_RATE when every source is down", async () => {
  vi.stubEnv("USD_BRL_RATE", "5.3");
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
  const fx = await import("./fx");
  await fx.refreshRate();
  expect(fx.usdBrlRate()).toBe(5.3);
  expect(fx.rateInfo().source).toBe("fallback");
});
