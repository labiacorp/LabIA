import { beforeEach, describe, expect, it, vi } from "vitest";

import { type CharacterCard, getSheetOptions, kitSpent, portraitItem, PORTRAIT_ROLES, sheetItem, stepCost } from "./character";
import { quote } from "./generation";
import { costCredits } from "./plan";

const card: CharacterCard = { name: "Iara", role: "TikTok Shop Creator", mood: "Confident, warm, upbeat", visualSignature: "soft shag haircut, silver hoops, navy tee", persona: "" };

beforeEach(() => {
  vi.stubEnv("USD_BRL_RATE", "5.4");
  vi.stubEnv("FAL_MOCK", "1"); // prices only; no network either way
});

describe("character kit", () => {
  it("puts the Character ID fields in the sheet prompt", () => {
    const { params } = sheetItem(card);
    for (const text of ["NAME: Iara", "ROLE: TikTok Shop Creator", "CORE MOOD: Confident, warm, upbeat", "VISUAL SIGNATURE: soft shag haircut"]) {
      expect(params.prompt).toContain(text);
    }
    expect(params).toMatchObject({ aspect_ratio: "3:2", resolution: "2K" });
  });

  it("builds portraits from the sheet reference, one per role", () => {
    const items = PORTRAIT_ROLES.map((role) => portraitItem(role, card, "https://x/sheet.png"));
    expect(items.map((item) => item.role)).toEqual(["FRONT", "PROFILE", "DETAIL"]);
    for (const item of items) expect(item.params.image_urls).toEqual(["https://x/sheet.png"]);
  });

  it("charges the V1 prices at 5.40 in whole credits: sheet 2K R$0.648 -> 13, each 1K portrait R$0.432 -> 9", () => {
    expect(quote([sheetItem(card)]).totalBrl).toBeCloseTo(0.65, 4);
    const portraits = PORTRAIT_ROLES.map((role) => portraitItem(role, card, "https://x/sheet.png"));
    expect(quote(portraits).items.map((item) => item.costBrl)).toEqual([0.45, 0.45, 0.45]);
    expect(quote(portraits).totalBrl).toBeCloseTo(1.35, 4); // the total is the sum of the per-item charges
  });
});

describe("kit cost after generation", () => {
  const done = { status: "DONE", submissionState: "submitted", actualCostBrl: "0.648" };

  it("shows the real cost of a finished step and nothing for one that has not run", () => {
    expect(stepCost(done)).toEqual({ state: "known", brl: 0.648 });
    expect(stepCost({ ...done, status: "RUNNING", actualCostBrl: null })).toEqual({ state: "none" });
  });

  it("never turns an unverified cost into R$ 0", () => {
    expect(stepCost({ ...done, actualCostBrl: null })).toEqual({ state: "unknown" });
    expect(stepCost({ status: "FAILED", submissionState: "submission_unknown", actualCostBrl: null })).toEqual({ state: "unknown" });
  });

  it("sums the known costs and flags the total when any is unknown", () => {
    expect(kitSpent([done, { ...done, actualCostBrl: "0.432" }])).toEqual({ unknown: false, brl: expect.closeTo(1.1, 4) });
    expect(kitSpent([done, { ...done, actualCostBrl: null }])).toMatchObject({ unknown: true, brl: 0.65 });
  });

  it("totals the kit as the sum of its chips (13 + 9 + 9 + 9 = 40 credits)", () => {
    const kit = [done, ...["0.432", "0.432", "0.432"].map((actualCostBrl) => ({ ...done, actualCostBrl }))];
    const chips = kit.map((step) => costCredits(Number(step.actualCostBrl)));
    expect(chips).toEqual([13, 9, 9, 9]);
    expect(costCredits(kitSpent(kit).brl)).toBe(40);
  });
});

describe("edited sheet prompt", () => {
  it("uses the user's text, falls back to the standard prompt when blank, and keeps the model's limit", () => {
    const model = "fal-ai/nano-banana-2";
    expect(sheetItem(card, { model, resolution: "2K", prompt: "  my own sheet prompt  " }).params.prompt).toBe("my own sheet prompt");
    expect(sheetItem(card, { model, resolution: "2K", prompt: "   " }).params.prompt).toBe(sheetItem(card).params.prompt);
    expect(() => sheetItem(card, { model, resolution: "2K", prompt: "x".repeat(4001) })).toThrow();
  });
});

describe("sheet model options", () => {
  it("prices every text-to-image model server-side and drops pairs the prompt cannot use", () => {
    const options = getSheetOptions(card);
    expect(options.map((option) => option.name)).toEqual(["Nano Banana 2", "GPT Image 2.5 Flare", "Grok Imagine 2.0", "Muse Image", "Seedream 5.0 Lite", "Nano Banana Pro"]);
    // Every offered pair is priced in whole credits (R$0.2225 -> 5, R$0.054 -> 2, R$0.648 -> 13); token-billed GPT is flagged as an estimate.
    expect(options.every((option) => option.configurations.length > 0)).toBe(true);
    expect(options.find((option) => option.name === "GPT Image 2.5 Flare")?.estimated).toBe(true);
    expect(options.find((option) => option.name === "GPT Image 2.5 Flare")?.configurations.find((item) => item.resolution === "high")?.brl).toBeCloseTo(0.25, 4);
    expect(options.find((option) => option.name === "Muse Image")?.configurations).toEqual([{ resolution: "default", brl: 0.1 }]);
    expect(options.find((option) => option.name === "Nano Banana 2")?.configurations.find((item) => item.resolution === "2K")?.brl).toBeCloseTo(0.65, 4);
  });

  it("rejects an unknown model or quality before anything is charged", () => {
    expect(() => sheetItem(card, { model: "unregistered", resolution: "2K" })).toThrow();
    expect(() => sheetItem(card, { model: "fal-ai/nano-banana-pro", resolution: "0.5K" })).toThrow();
  });
});
