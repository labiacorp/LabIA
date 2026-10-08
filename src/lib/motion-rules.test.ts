import { describe, expect, it } from "vitest";
import { findMotionModel, motionSchema, referenceTooSmall, DEFAULT_MOTION_MODEL, MOTION_MODEL } from "./motion";

describe("Kling rules", () => {
  const kling = findMotionModel(DEFAULT_MOTION_MODEL);
  const genjutsu = findMotionModel(MOTION_MODEL);
  it("rejects a character image under 340 px on Kling only, and only when the size is known", () => {
    expect(referenceTooSmall(kling, { width: 300, height: 900 })).toBe(true);
    expect(referenceTooSmall(kling, { width: 340, height: 340 })).toBe(false);
    expect(referenceTooSmall(kling, { width: null, height: null })).toBe(false);
    expect(referenceTooSmall(genjutsu, { width: 100, height: 100 })).toBe(false);
  });
  it("keeps the sound off unless the brief asks for it", () => {
    const base = { version: 1, trend: "dance", sourceId: "v", referenceIds: ["a"], prompt: "", resolution: "default", model: DEFAULT_MOTION_MODEL };
    expect(motionSchema.parse(base).keepSound).toBe(false);
    expect(motionSchema.parse({ ...base, keepSound: true }).keepSound).toBe(true);
  });
});
