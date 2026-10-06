import { describe, expect, it } from "vitest";

import { hasUrl, quotePost } from "./pricing";

describe("social pricing", () => {
  it("charges the X link price for anything URL-like", () => {
    for (const t of ["veja https://a.co", "labia.app", "www.x.com", "http://x"]) expect(hasUrl(t)).toBe(true);
    for (const t of ["sem link", "e.g. isto", "R$ 5.40", "fim."]) expect(hasUrl(t)).toBe(false);
    expect(quotePost("X", "olá", 5.4)).toEqual({ usd: 0.015, brl: 0.081 });
    expect(quotePost("X", "veja labia.app", 5.4)).toEqual({ usd: 0.2, brl: 1.08 });
    expect(quotePost("INSTAGRAM", "veja labia.app", 5.4)).toEqual({ usd: 0, brl: 0 });
  });
});
