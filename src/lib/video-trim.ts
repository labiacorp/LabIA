import { createFile, DataStream, Endianness, type Movie, type Sample } from "mp4box";

export const MIN_TRIM_SECONDS = 4;

// Keeps the first `seconds` of an H.264 MP4 without re-encoding: the video samples up to that point are copied into a new file
// (the first frame is always a keyframe, so the cut needs no decoding). Audio is dropped, because the motion models do not keep the original sound.
export async function trimMp4(bytes: Uint8Array, seconds: number): Promise<{ bytes: Uint8Array; durationSec: number }> {
  const source = createFile();
  let info: Movie | undefined;
  let failed = false;
  const samples: Sample[] = [];
  source.onSamples = (_id, _user, batch) => {
    samples.push(...batch);
  };
  source.onReady = (value) => {
    info = value;
    const first = value.videoTracks[0];
    if (first) {
      source.setExtractionOptions(first.id);
      source.start();
    }
  };
  source.onError = () => {
    failed = true;
  };
  const data = bytes.slice().buffer as ArrayBuffer & { fileStart: number };
  data.fileStart = 0;
  source.appendBuffer(data as never);
  source.flush();
  if (failed || !info) throw Error("Invalid MP4");
  const movie = info as Movie;
  const video = movie.videoTracks[0];
  if (!video || !/^avc[13]/.test(video.codec) || !video.video) throw Error("Invalid MP4");
  const total = movie.duration / movie.timescale;
  if (seconds < MIN_TRIM_SECONDS || seconds >= total) throw Error("Invalid trim length");

  const timescale = video.timescale;
  const limit = seconds * timescale;
  const kept = samples.filter((sample) => sample.dts < limit && sample.data);
  if (!kept.length) throw Error("Invalid MP4");
  const avcC = source.moov?.traks.find((trak) => trak.tkhd.track_id === video.id)?.mdia.minf.stbl.stsd.entries[0] as unknown as { avcC?: { write(stream: DataStream): void } };
  if (!avcC?.avcC) throw Error("Invalid MP4");
  const header = new DataStream(undefined, 0, Endianness.BIG_ENDIAN);
  avcC.avcC.write(header);
  // The box header (size + "avcC", 8 bytes) is not part of the decoder configuration record.
  const record = (header.buffer as ArrayBuffer).slice(8, header.getPosition());

  const mediaDuration = kept.reduce((sum, sample) => sum + sample.duration, 0);
  const output = createFile();
  const track = output.addTrack({
    type: "avc1",
    timescale,
    media_duration: mediaDuration,
    duration: mediaDuration, // the movie header uses the track timescale here
    width: video.video.width,
    height: video.video.height,
    avcDecoderConfigRecord: record,
  });
  for (const sample of kept) {
    output.addSample(track, sample.data!, { duration: sample.duration, dts: sample.dts, cts: sample.cts, is_sync: sample.is_sync });
  }
  const stream = output.getBuffer();
  const durationSec = mediaDuration / timescale;
  return { bytes: new Uint8Array(stream.buffer as ArrayBuffer, 0, stream.getPosition()), durationSec };
}
