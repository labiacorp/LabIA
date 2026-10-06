// Live USD→BRL rate. Every price in the app is computed in USD (fal.ai bills in dollars) and shown in reais, so the
// rate is read through usdBrlRate() everywhere. A live quote is cached for 5 minutes per server instance and refreshed
// in the background; money actions call refreshRate() first so they quote on a fresh number. Falls back to the last
// good quote, then to USD_BRL_RATE, then to 5.4. USD_BRL_RATE_FIXED pins it (no live lookups).
const TTL_MS = 5 * 60_000;
const MAX_AGE_MS = 6 * 3600_000;
const SOURCES: { name: string; url: string; pick: (json: unknown) => number }[] = [
  { name: "awesomeapi", url: "https://economia.awesomeapi.com.br/json/last/USD-BRL", pick: (j) => Number((j as { USDBRL?: { ask?: string } }).USDBRL?.ask) },
  { name: "open.er-api", url: "https://open.er-api.com/v6/latest/USD", pick: (j) => Number((j as { rates?: { BRL?: number } }).rates?.BRL) },
];

type Quote = { rate: number; at: number; source: string };
let cache: Quote | null = null;
let inflight: Promise<Quote | null> | null = null;

const spread = () => 1 + (Number(process.env.USD_BRL_SPREAD_PCT) || 0) / 100;
// Off for mock runs (FAL_MOCK=1: deterministic prices) and for tests unless a test turns it on.
const live = () => (process.env.FAL_MOCK === "1" ? false : process.env.VITEST ? process.env.USD_BRL_LIVE === "1" : true);
const fixed = () => Number(process.env.USD_BRL_RATE_FIXED) || null;
const fallback = () => Number(process.env.USD_BRL_RATE) || 5.4;
// A quote far from the last good one (or outside any sane range) is a bad feed, not a market move.
const sane = (rate: number) => Number.isFinite(rate) && rate > 3 && rate < 10 && (!cache || Math.abs(rate / cache.rate - 1) < 0.15);

export async function refreshRate(force = false): Promise<Quote | null> {
  if (fixed() || !live()) return null;
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache;
  inflight ??= (async () => {
    for (const source of SOURCES) {
      try {
        const res = await fetch(source.url, { cache: "no-store", signal: AbortSignal.timeout(3000) });
        const rate = source.pick(await res.json());
        if (res.ok && sane(rate)) return (cache = { rate: Math.round(rate * spread() * 1000) / 1000, at: Date.now(), source: source.name });
      } catch { /* try the next source */ }
    }
    return cache;
  })().finally(() => { inflight = null; });
  return inflight;
}

export function usdBrlRate(): number {
  const pinned = fixed();
  if (pinned) return pinned;
  if (live() && (!cache || Date.now() - cache.at >= TTL_MS)) void refreshRate();
  return cache && Date.now() - cache.at < MAX_AGE_MS ? cache.rate : fallback();
}

export const rateInfo = () => ({ rate: usdBrlRate(), source: fixed() ? "fixed" : cache && Date.now() - cache.at < MAX_AGE_MS ? cache.source : "fallback", updatedAt: cache ? new Date(cache.at).toISOString() : null });
