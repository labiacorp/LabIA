import { createFile, DataStream, Endianness, type Movie, type Sample } from "mp4box";

export const MIN_TRIM_SECONDS = 4;

// Keeps the first `seconds` of an H.264 MP4 without re-encoding: the video samples up to that point are copied into a new file
// (the first frame is a keyframe, so the cut needs no decoding). Source audio and its decoder configuration are copied too.
export async function trimMp4(bytes: Uint8Array, seconds: number): Promise<{ bytes: Uint8Array; durationSec: number }> {
  const source = createFile();
  let info: Movie | undefined;
  let failed = false;
  const samples = new Map<number, Sample[]>();
  source.onSamples = (id, _user, batch) => {
    const collected = samples.get(id) ?? [];
    collected.push(...batch);
    samples.set(id, collected);
  };
  source.onReady = (value) => {
    info = value;
    const first = value.videoTracks[0];
    if (first) {
      source.setExtractionOptions(first.id);
      for (const audio of value.audioTracks) source.setExtractionOptions(audio.id);
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
  const kept = (samples.get(video.id) ?? []).filter((sample) => sample.dts < limit && sample.data)
    .map((sample) => ({ ...sample, duration: Math.min(sample.duration, limit - sample.dts) }));
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
  // Preserve edit lists so encoder delay and composition offsets stay aligned across audio/video.
  const copyEdits = (fromId: number, toId: number) => {
    const edits = source.moov?.traks.find((item) => item.tkhd.track_id === fromId)?.edts;
    const target = output.moov?.traks.find((item) => item.tkhd.track_id === toId);
    if (!edits?.elst || !target) return;
    let remaining = mediaDuration;
    edits.elst.entries = edits.elst.entries.flatMap((entry) => {
      const duration = Math.min(remaining, Math.round(entry.segment_duration * timescale / movie.timescale));
      remaining -= duration;
      return duration > 0 ? [{ ...entry, segment_duration: duration }] : [];
    });
    target.addBox(edits);
  };
  copyEdits(video.id, track);
  for (const audio of movie.audioTracks) {
    const sourceTrack = source.moov?.traks.find((item) => item.tkhd.track_id === audio.id);
    const description = sourceTrack?.mdia.minf.stbl.stsd.entries[0];
    if (!description || !audio.audio) throw Error("Unsupported audio track");
    // Keep whole compressed audio packets inside the video boundary; a trailing packet must not
    // extend a four-second source into the next billable second.
    const audioLimit = mediaDuration / timescale * audio.timescale;
    const audioSamples = (samples.get(audio.id) ?? []).filter((sample) => sample.dts + sample.duration <= audioLimit && sample.data);
    if (!audioSamples.length) throw Error("Audio samples could not be preserved");
    type TrackOptions = NonNullable<Parameters<typeof output.addTrack>[0]>;
    const audioTrack = output.addTrack({
      type: description.type as TrackOptions["type"], hdlr: "soun", timescale: audio.timescale,
      media_duration: audioSamples.reduce((sum, sample) => sum + sample.duration, 0), duration: mediaDuration,
      channel_count: audio.audio.channel_count, samplerate: audio.audio.sample_rate, samplesize: audio.audio.sample_size,
      description_boxes: description.boxes as TrackOptions["description_boxes"],
    });
    for (const sample of audioSamples) output.addSample(audioTrack, sample.data!, { duration: sample.duration, dts: sample.dts, cts: sample.cts, is_sync: sample.is_sync });
    copyEdits(audio.id, audioTrack);
  }
  const stream = output.getBuffer();
  const durationSec = mediaDuration / timescale;
  return { bytes: new Uint8Array(stream.buffer as ArrayBuffer, 0, stream.getPosition()), durationSec };
}
