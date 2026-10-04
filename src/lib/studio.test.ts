import { describe, expect, it } from "vitest";
import { parseStudioSelection, STUDIO_PRESETS, studioPersona } from "./studio";

describe("studio brief", () => {
  it("rejects forged categories and prompt values", () => {
    expect(() => parseStudioSelection('{"model":"expensive"}')).toThrow();
    expect(() => parseStudioSelection('{"age":"Child"}')).toThrow();
    expect(() => parseStudioSelection('{"gender":["Male"]}')).toThrow();
  });
  it("persists appearance in the prompt without discarding the authored persona", () => {
    const selections = parseStudioSelection('{"gender":"Female","hairColor":"Blue"}');
    expect(studioPersona(selections, "  A curious creator.  ")).toBe("A curious creator.\nCharacter appearance: Female, Blue.");
    expect(studioPersona({}, "")).toBe("");
  });
  it("all shipped presets are valid server-side selections", () => {
    for (const preset of STUDIO_PRESETS) expect(parseStudioSelection(JSON.stringify(preset.selection))).toEqual(preset.selection);
  });
  it("combines compatible traits but rejects duplicate or forged multi-selections", () => {
    const selected = parseStudioSelection('{"features":["Freckles","Full lips"]}');
    expect(studioPersona(selected, "")).toContain("Freckles, Full lips");
    expect(() => parseStudioSelection('{"features":["Freckles","Freckles"]}')).toThrow();
    expect(() => parseStudioSelection('{"features":["Forged"]}')).toThrow();
  });
});
