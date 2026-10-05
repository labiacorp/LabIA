import sharp from "sharp";
import { createFile, type Movie } from "mp4box";
export const MAX_REFERENCE_BYTES = 4 * 1024 * 1024;
export class ReferenceInputError extends Error {}
export async function validateReference(bytes: Uint8Array, type: string) {
  if (!bytes.length || bytes.length > MAX_REFERENCE_BYTES)
    throw new ReferenceInputError("Use um arquivo de até 4 MB.");
  if (["image/jpeg", "image/png", "image/webp"].includes(type)) {
    try {
      const source = sharp(bytes, { limitInputPixels: 36_000_000 });
      const info = await source.metadata();
      if (
        !["jpeg", "png", "webp"].includes(info.format ?? "") ||
        (info.pages ?? 1) > 1
      )
        throw Error();
      const result = await source
        .rotate()
        .resize({
          width: 2048,
          height: 2048,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 90 })
        .toBuffer({ resolveWithObject: true });
      return {
        bytes: new Uint8Array(result.data),
        kind: "IMAGE" as const,
        contentType: "image/webp",
        extension: "webp",
        width: result.info.width,
        height: result.info.height,
        durationSec: null,
      };
    } catch {
      throw new ReferenceInputError(
        "Use uma imagem JPG, PNG ou WebP estática de até 36 megapixels.",
      );
    }
  }
  if (type !== "video/mp4")
    throw new ReferenceInputError("Use JPG, PNG, WebP ou vídeo MP4 com H.264.");
  try {
    if (Buffer.from(bytes.subarray(4, 8)).toString() !== "ftyp") throw Error();
    const parser = createFile();
    let info: Movie | undefined;
    let failed = false;
    parser.onReady = (value) => {
      info = value;
    };
    parser.onError = () => {
      failed = true;
    };
    const data = bytes.slice().buffer as ArrayBuffer & { fileStart: number };
    data.fileStart = 0;
    parser.appendBuffer(data);
    parser.flush();
    if (failed || !info) throw Error();
    const movie = info as Movie;
    const video = movie.videoTracks[0];
    const duration = movie.duration / movie.timescale;
    if (
      movie.videoTracks.length !== 1 ||
      !video ||
      !/^avc[13]/.test(video.codec) ||
      !Number.isFinite(duration) ||
      duration < 4 ||
      duration > 30 ||
      !video.video?.width ||
      !video.video?.height ||
      video.video.width > 4096 ||
      video.video.height > 4096
    )
      throw Error();
    return {
      bytes,
      kind: "VIDEO" as const,
      contentType: "video/mp4",
      extension: "mp4",
      width: video.video.width,
      height: video.video.height,
      durationSec: duration,
    };
  } catch {
    throw new ReferenceInputError(
      "Use um MP4 H.264 válido, de 4 a 30 segundos, até 4 MB e 4096 px por lado.",
    );
  }
}
