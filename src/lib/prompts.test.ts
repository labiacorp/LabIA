import { describe, expect, it } from "vitest";
import { portraitItem, previewItems, profileFromFaceItem, sheetFromFaceItem, sheetItem } from "./character";
import { sceneItem } from "./content-generation";
import { MOTION_MODELS, motionEstimate } from "./motion";
import { prisma } from "./prisma";
import { loadPromptTemplates, PROMPT_KEYS, renderPrompt } from "./prompts";

const card = { name: "Malu", role: "Lifestyle", mood: "warm", visualSignature: "curly hair", persona: "" };

describe("prompt templates", () => {
  it("keeps the standard prompts word for word", () => {
    expect(renderPrompt("scene", { scene: "a cafe" })).toBe("Create a photorealistic scene with the person in the reference portrait. Keep the same face and identity. No text or watermark. Scene: a cafe");
    expect(String(sheetItem(card).params.prompt)).toContain("NAME: Malu / ROLE: Lifestyle / CORE MOOD: warm / VISUAL SIGNATURE: curly hair (write the values in English).");
    expect(String(sheetFromFaceItem(card, "https://x/f.png").params.prompt)).toMatch(/^Use the person in the reference photo as the only character: keep exactly the same face\. Character reference sheet/);
    expect(String(portraitItem("FRONT", card, "https://x/s.png").params.prompt)).toContain("create a photorealistic front-facing portrait");
    expect(String(profileFromFaceItem(card, "https://x/f.png").params.prompt)).toContain("left-side profile portrait");
    expect(String(previewItems(card)[0].params.prompt)).toContain("creator (Lifestyle): curly hair.");
  });

  it("uses an override in place of the default, and leaves unknown placeholders visible", () => {
    const templates = { scene: "Cinematic still of {scene} {oops}", sheet: "SHEET {name}" };
    expect(renderPrompt("scene", { scene: "a cafe" }, templates)).toBe("Cinematic still of a cafe {oops}");
    expect(String(sceneItem("a cafe", "https://x/f.png", "9:16", undefined, templates).params.prompt)).toBe("Cinematic still of a cafe {oops}");
    expect(String(sheetItem(card, undefined, templates).params.prompt)).toBe("SHEET Malu");
    expect(String(sheetFromFaceItem(card, "https://x/f.png", templates).params.prompt)).toContain("SHEET Malu");
    expect(renderPrompt("scene", { scene: "x" }, { scene: "   " })).toContain("Create a photorealistic scene");
  });

  it("reads admin overrides from the database and ignores unknown keys", async () => {
    await prisma.promptOverride.createMany({ data: [{ key: "scene", text: "TEST-OVERRIDE {scene}" }, { key: "not-a-prompt", text: "x" }] });
    try {
      const templates = await loadPromptTemplates();
      expect(templates).toEqual({ scene: "TEST-OVERRIDE {scene}" });
    } finally {
      await prisma.promptOverride.deleteMany({ where: { key: { in: ["scene", "not-a-prompt"] } } });
    }
  });

  it("has a default for every key", () => {
    expect(PROMPT_KEYS).toContain("trend-dance");
    for (const key of PROMPT_KEYS) expect(renderPrompt(key, {}).length).toBeGreaterThan(10);
  });
});

describe("motion models", () => {
  it("prices each model from its own per-second rate", () => {
    const [genjutsu, kling26, kling3] = MOTION_MODELS;
    expect(motionEstimate(5, "720p", genjutsu.id).usd).toBeCloseTo(5 * 0.681);
    expect(motionEstimate(4.1, "default", kling26.id).usd).toBeCloseTo(5 * 0.112);
    expect(motionEstimate(10, "default", kling3.id).usd).toBeCloseTo(10 * 0.168);
    expect(() => motionEstimate(5, "720p", kling3.id)).toThrow();
  });
});
