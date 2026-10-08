import { readFileSync } from "node:fs";
import { createFile } from "mp4box";
import { describe, expect, it } from "vitest";
import { trimMp4 } from "./video-trim";

const read = (bytes: Uint8Array) => {
  const file = createFile();
  let info: ReturnType<typeof file.getInfo> | undefined;
  file.onReady = (value) => (info = value);
  const data = bytes.slice().buffer as ArrayBuffer & { fileStart: number };
  data.fileStart = 0;
  file.appendBuffer(data as never);
  file.flush();
  return info!;
};

describe("trimMp4", () => {
  const source = new Uint8Array(readFileSync("public/mock/reel.mp4"));
  const full = read(source);
  const total = full.duration / full.timescale;

  it("keeps the first seconds as a playable H.264 file", async () => {
    const seconds = Math.floor(total) - 1;
    const result = await trimMp4(source, seconds);
    const trimmed = read(result.bytes);
    expect(trimmed.videoTracks).toHaveLength(1);
    expect(trimmed.videoTracks[0].codec).toMatch(/^avc/);
    expect(trimmed.videoTracks[0].video?.width).toBe(full.videoTracks[0].video?.width);
    const duration = trimmed.duration / trimmed.timescale;
    expect(duration).toBeGreaterThan(seconds - 0.5);
    expect(duration).toBeLessThan(seconds + 0.5);
    expect(result.durationSec).toBeCloseTo(duration, 1);
  });

  it("refuses a cut shorter than 4 s or longer than the video", async () => {
    await expect(trimMp4(source, 3)).rejects.toThrow();
    await expect(trimMp4(source, total + 1)).rejects.toThrow();
  });
});
