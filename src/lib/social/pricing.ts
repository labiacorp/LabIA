// Import-free (types only): client components import this module.
import type { NetworkId } from "./networks";

export const PRICES = {
  X: {
    postUsd: 0.015,
    postWithUrlUsd: 0.2,
    source: "https://docs.x.com/x-api/getting-started/pricing",
    seen: "2026-10-06",
  },
};

// A scheme, "www.", or a bare label.tld (tld of 2+ letters not followed by a digit or letter).
const URL_LIKE = /https?:\/\/|\bwww\.|[\p{L}\p{N}-]+\.\p{L}{2,}(?![\p{L}\p{N}])/iu;

export function hasUrl(text: string): boolean {
  return URL_LIKE.test(text);
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

export function quotePost(network: NetworkId, text: string, usdBrlRate: number): { usd: number; brl: number } {
  const usd = network === "X" ? (hasUrl(text) ? PRICES.X.postWithUrlUsd : PRICES.X.postUsd) : 0;
  return { usd, brl: round4(usd * usdBrlRate) };
}
