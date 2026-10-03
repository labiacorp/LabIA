import { beforeEach, describe, expect, it, vi } from "vitest";

import { type CharacterCard, portraitItem, PORTRAIT_ROLES, sheetItem } from "./character";
import { quote } from "./generation";

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

  it("quotes the V1 prices at 5.40: sheet 2K R$0.648, three 1K portraits R$1.296", () => {
    expect(quote([sheetItem(card)]).totalBrl).toBeCloseTo(0.648, 4);
    const portraits = PORTRAIT_ROLES.map((role) => portraitItem(role, card, "https://x/sheet.png"));
    expect(quote(portraits).totalBrl).toBeCloseTo(1.296, 4);
  });
});
