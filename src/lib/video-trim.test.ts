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
  it("keeps source audio when cutting a clip to the four-second minimum", async () => {
    const withAudio = new Uint8Array(readFileSync("tests/fixtures/trim-with-audio.mp4"));
    const result = await trimMp4(withAudio, 4);
    const trimmed = read(result.bytes);
    expect(trimmed.videoTracks).toHaveLength(1);
    expect(trimmed.audioTracks).toHaveLength(1);
    expect(trimmed.audioTracks[0].codec).toBe("mp4a.40.2");
    expect(trimmed.audioTracks[0].audio?.sample_rate).toBe(48000);
    expect(trimmed.audioTracks[0].duration / trimmed.audioTracks[0].timescale).toBeLessThanOrEqual(4);
    expect(result.durationSec).toBeCloseTo(4, 2);
    expect(trimmed.duration / trimmed.timescale).toBeCloseTo(4, 2);
  });
  it("keeps a four-second boundary exact at fractional frame rates", async () => {
    const source = new Uint8Array(readFileSync("tests/fixtures/trim-with-audio-ntsc.mp4"));
    const result = await trimMp4(source, 4);
    expect(result.durationSec).toBe(4);
    const trimmed = read(result.bytes);
    expect(trimmed.videoTracks[0].duration / trimmed.videoTracks[0].timescale).toBe(4);
    expect(trimmed.audioTracks).toHaveLength(1);
  });
});
