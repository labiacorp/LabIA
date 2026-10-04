import { describe, expect, it, vi } from "vitest";
const sdk = vi.hoisted(() => ({ config: vi.fn(), submit: vi.fn().mockResolvedValue({ request_id: "image-fixture" }) }));
vi.mock("@fal-ai/client", () => ({ fal: { config: sdk.config, queue: sdk } }));
import { FalProvider } from "./fal";
import { prepareImage } from "./image-models";
import { getImageOptions, sceneItem } from "../content-generation";

const params = { prompt: "The same person holding a product", image_urls: ["https://fixture/owned-front.png"], resolution: "2K", aspect_ratio: "9:16" };
const provider = () => new FalProvider({ apiKey: "fixture-no-network", usdBrlRate: 5.4 });
describe("reference image model contracts", () => {
  it.each([
    ["fal-ai/nano-banana-2/edit", "2K", .12],
    ["fal-ai/nano-banana-pro/edit", "2K", .15],
    ["bytedance/seedream/v5/lite/edit", "2K", .035],
    ["fal-ai/bytedance/seedream/v4.5/edit", "4K", .04],
    ["fal-ai/flux-pro/kontext", "default", .04],
    ["fal-ai/flux-pro/kontext/max", "default", .08],
    ["fal-ai/qwen-image-max/edit", "1K", .075],
  ])("quotes and submits %s with the owned reference", async (model, resolution, usd) => {
    const selection = { ...params, resolution };
    const prepared = prepareImage(model, selection, 5.4);
    const request = { ...selection, imagePricing: prepared.snapshot };
    expect(provider().estimateCost(model, request).usd).toBeCloseTo(usd, 6);
    await provider().generate(model, request);
    const wire = sdk.submit.mock.calls.at(-1)![1].input;
    expect(wire.prompt).toBe(params.prompt);
    expect(wire.image_urls ?? [wire.image_url]).toEqual(params.image_urls);
    expect(wire.num_images).toBe(1);
    expect(wire).not.toHaveProperty("imagePricing");
    if (model.includes("seedream")) {
      expect(wire.max_images).toBe(1);
      expect(wire.image_size.width / wire.image_size.height).toBeCloseTo(9 / 16, 2);
    }
  });
  it("rejects missing references, unsupported quality and extra generations before charging", () => {
    expect(() => prepareImage("fal-ai/nano-banana-pro/edit", { ...params, image_urls: [] }, 5.4)).toThrow();
    expect(() => prepareImage("bytedance/seedream/v5/lite/edit", { ...params, resolution: "1K" }, 5.4)).toThrow();
    expect(() => prepareImage("fal-ai/nano-banana-pro/edit", { ...params, num_images: 3 }, 5.4)).toThrow();
    expect(() => sceneItem("scene", params.image_urls[0], "9:16", { model: "unregistered", resolution: "1K" })).toThrow();
  });
  it("captures per-image price for settlement and exposes compatible options", () => {
    const item = sceneItem("scene", params.image_urls[0], "9:16", { model: "fal-ai/flux-pro/kontext", resolution: "default" });
    const changedRate = new FalProvider({ apiKey: "fixture-no-network", usdBrlRate: 9 });
    expect(changedRate.estimateActualCost(item.model, item.params, [{ url: "https://fixture/result.png" }]).brl).toBeCloseTo(.216, 4);
    expect(getImageOptions("9:16").find((option) => option.model === "bytedance/seedream/v5/lite/edit")?.configurations[0].brl).toBeCloseTo(.189, 4);
  });
});
