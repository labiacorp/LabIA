import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
vi.mock("./actions", () => ({ createMotion: vi.fn(), trimSource: vi.fn() }));
import { MotionForm } from "./motion-form";
import { DEFAULT_MOTION_MODEL } from "@/lib/motion";

it("keeps the cut editor and original-video action reachable for a saved four-second clip", () => {
  const initial = { version: 1 as const, trend: "dance" as const, sourceId: "cut", originalSourceId: "original", referenceIds: ["portrait"], prompt: "Test", resolution: "default" as const, model: DEFAULT_MOTION_MODEL, keepSound: true };
  const props = {
    userId: "test-user", trend: { id: "dance", name: "Dance", roles: ["Character"] }, initial, rate: 5.4, uploadReady: false,
    modelPrompts: { [DEFAULT_MOTION_MODEL]: "Test" }, characters: [{ id: "character", name: "Test", faceAssetId: "portrait" }],
    images: [{ id: "portrait", url: "/mock/portrait.svg", name: "Portrait", durationSec: null, width: 768, height: 1024 }],
    videos: [{ id: "cut", url: "/mock/reel.mp4", name: "Cut", durationSec: 4 }, { id: "original", url: "/mock/reel.mp4", name: "Original", durationSec: 8 }],
  };
  const html = renderToStaticMarkup(createElement(MotionForm, props));
  expect(html).toContain("Use original video");
  expect(html).toContain("Edit cut");
  expect(html).toContain('name="originalSourceId"');
});
