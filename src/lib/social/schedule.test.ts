import { describe, expect, it } from "vitest";
import { saoPauloIso } from "./schedule";

describe("saoPauloIso", () => {
  it("reads a datetime-local value as UTC-03:00", () => {
    const iso = saoPauloIso("2026-10-10T15:30");
    expect(iso).toBe("2026-10-10T15:30:00-03:00");
    expect(new Date(iso!).toISOString()).toBe("2026-10-10T18:30:00.000Z");
  });

  it("returns null for empty, malformed or impossible values", () => {
    expect(saoPauloIso("")).toBeNull();
    expect(saoPauloIso("2026-10-10")).toBeNull();
    expect(saoPauloIso("2026-10-10T15:30:00")).toBeNull();
    expect(saoPauloIso("2026-13-40T99:99")).toBeNull();
  });
});
