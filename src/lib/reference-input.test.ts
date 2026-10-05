import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { validateReference, MAX_REFERENCE_BYTES } from "./reference-input";
describe("reference validation", () => {
  it("normalizes images and reads video duration on the server", async () => {
    const image = await sharp({
      create: { width: 256, height: 320, channels: 3, background: "#264d44" },
    })
      .png()
      .toBuffer();
    const result = await validateReference(image, "image/png");
    expect(result).toMatchObject({
      kind: "IMAGE",
      contentType: "image/webp",
      width: 256,
      height: 320,
    });
    const video = await validateReference(
      await readFile("public/mock/clip.mp4"),
      "video/mp4",
    );
    expect(video.kind).toBe("VIDEO");
    expect(video.durationSec).toBeGreaterThanOrEqual(4);
  });
  it("rejects disguised documents, malformed movies and oversized bodies", async () => {
    await expect(
      validateReference(Buffer.from("<svg></svg>"), "image/png"),
    ).rejects.toThrow();
    await expect(
      validateReference(Buffer.from("not a video"), "video/mp4"),
    ).rejects.toThrow();
    await expect(
      validateReference(new Uint8Array(MAX_REFERENCE_BYTES + 1), "image/png"),
    ).rejects.toThrow("4 MB");
  });
});
