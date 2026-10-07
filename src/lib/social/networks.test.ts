import { describe, expect, it } from "vitest";

import { NETWORKS, networkVisible, textLength } from "./networks";

describe("social networks", () => {
  it("opens aggregator networks to everyone and keeps Bluesky soon", () => {
    const ig = NETWORKS.find((n) => n.id === "INSTAGRAM")!;
    expect(networkVisible(ig, true)).toBe("active");
    expect(networkVisible(ig, false)).toBe("active");
    expect(networkVisible({ ...ig, audience: "owners" }, true)).toBe("active");
    expect(networkVisible({ ...ig, audience: "owners" }, false)).toBe("soon");
    expect(networkVisible(NETWORKS.find((n) => n.id === "BLUESKY")!, true)).toBe("soon");
    expect(networkVisible(NETWORKS.find((n) => n.id === "X")!, false)).toBe("active");
    expect(textLength("X", "😀a")).toBe(3);
    expect(textLength("INSTAGRAM", "😀a")).toBe(2);
  });
});
