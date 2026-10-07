import { expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VideoForm } from "./video-form";
import { getVideoOptions } from "@/lib/video-options";
import { estimateReel } from "@/lib/content-plan";
import { costCredits, creditsText, DEFAULT_VIDEO } from "@/lib/plan";

// The price the plan, Início and landing quote must be the one the video form opens on.
it("opens on the default 15s clip, at the price the reel estimate quotes", () => {
  vi.stubEnv("USD_BRL_RATE", "5.4");
  vi.stubEnv("FAL_MOCK", "1");
  const html = renderToStaticMarkup(createElement(VideoForm, { action: async () => ({}), intent: "i", prompt: "p", balanceBrl: 100, options: getVideoOptions() }));
  expect(html).toMatch(new RegExp(`<option[^>]*value="${DEFAULT_VIDEO.model}"[^>]*selected`));
  expect(html).toContain(`~${creditsText(costCredits(estimateReel().perStep.VIDEO!))}`);
  expect(html).toContain(`${DEFAULT_VIDEO.duration} segundos`);
  vi.unstubAllEnvs();
});
