import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { normalizeProfilePhoto, MAX_AVATAR_BYTES } from "./profile-photo";
// A fixed one-pixel PNG fixture; no generation provider is involved.
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNQ2LAAAAJkAXHdNnUGAAAAAElFTkSuQmCC",
  "base64",
);
describe("private profile photo normalization", () => {
  it("normalizes valid bytes to a bounded metadata-free webp", async () => {
    const image = await normalizeProfilePhoto(
      new File([png], "profile.png", { type: "image/png" }),
    );
    const meta = await sharp(image).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(256);
    expect(meta.height).toBe(256);
    expect(meta.exif).toBeUndefined();
    expect(image.byteLength).toBeLessThan(100_000);
  });
  it("rejects oversized input, SVG and spoofed file types", async () => {
    await expect(
      normalizeProfilePhoto(
        new File([new Uint8Array(MAX_AVATAR_BYTES + 1)], "large.png", {
          type: "image/png",
        }),
      ),
    ).rejects.toThrow("5 MB");
    await expect(
      normalizeProfilePhoto(
        new File(["<svg></svg>"], "x.svg", { type: "image/svg+xml" }),
      ),
    ).rejects.toThrow("JPG");
    await expect(
      normalizeProfilePhoto(
        new File(
          [
            '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>',
          ],
          "x.png",
          { type: "image/png" },
        ),
      ),
    ).rejects.toThrow("Não conseguimos ler");
  });
});
