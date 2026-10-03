# Video and voice integration research

Checked official fal documentation on 2026-10-03. No inference, storage upload, or paid request was made. BRL examples use the existing illustrative USD/BRL rate of 5.21, not a live exchange-rate quote.

## Serverless video continuation

V1's `lib/flows/video-nodes.ts` extends video by extracting the last frame, preserving scene context, then submitting image-to-video. Its local ffmpeg/Supabase implementation is replaced in v2 by a persisted queue transition; Vercel only submits and polls, never downloads/encodes the media or waits for the full chain.

- [Kling 2.5 Turbo API](https://fal.ai/models/fal-ai/kling-video/v2.5-turbo/pro/image-to-video/api): `image_url`, `prompt`, `duration` (5 or 10). The output schema does not guarantee a duration.
- [FFmpeg metadata API](https://fal.ai/models/fal-ai/ffmpeg-api/metadata/api): `media_url`, `extract_frames: true`; returns `media.duration` and `media.end_frame_url`. [Listed pricing](https://fal.ai/models/fal-ai/ffmpeg-api/metadata): $0 per compute second. Used after each clip for actual-duration pricing and the next clip's first frame.
- [Standalone frame extraction](https://fal.ai/models/fal-ai/ffmpeg-api/extract-frame/api): `video_url`, `frame_type: "last"`. [Listed pricing](https://fal.ai/models/fal-ai/ffmpeg-api/extract-frame): $0.0002 per second. Not used because metadata supplies the frame and duration together.
- [Merge API](https://fal.ai/models/fal-ai/ffmpeg-api/merge-videos/api): ordered `video_urls`, `resolution_aspect_ratio_video_index: 0`. [Listed pricing](https://fal.ai/models/fal-ai/ffmpeg-api/merge-videos): $0 per compute second. Preserves the first clip's aspect ratio.

The VIDEO step reserves all three blocks before submitting. The JSON input persists phase, completed clips, frame URLs and measured costs. Each transition compares the old request ID; each submit claims `not_submitted` once. Polling resumes a persisted unsubmitted phase. A process lost in `submitting`, or an uncertain submit, is never retried automatically. Metadata failure keeps the reservation for manual reconciliation rather than assuming the generated clip was free. A later generation failure settles completed clips and returns only unused reservation. Assembly follows the persisted chain order, not asset timestamps.

Real fal outputs, queue timings, invoice prices and Vercel deployment remain unverified. Media URLs still need Blob persistence. Continuity/identity quality is not proven by the fake provider.

## Lip sync options presented to Diego before implementation

These consume an existing video and audio; the lip sync price does not include making the voice or the base video.

| Model | Official price | 5s | One 15s call | Three 5s calls |
| --- | --- | --- | --- | --- |
| [LatentSync](https://fal.ai/models/fal-ai/latentsync) | $0.20 minimum up to 40s; $0.005/s after that | R$1.04 | R$1.04 | R$3.13 |
| [PixVerse lipsync](https://fal.ai/models/fal-ai/pixverse/lipsync) | $0.04/output second with supplied audio | R$1.04 | R$3.13 | R$3.13 |
| [Sync Lipsync 2](https://fal.ai/models/fal-ai/sync-lipsync/v2) | $3/video minute (standard) | R$1.30 | R$3.91 | R$3.91 |

Recommendation based on cost: merge the three clips, then apply LatentSync once to the complete video with a continuous 15s audio track. PT-BR mouth movement, timing and visual quality need a future owner-authorized real test. No model has been selected or implemented for voice/lip sync yet.

For generated voice, [ElevenLabs TTS Multilingual v2 on fal](https://fal.ai/models/fal-ai/elevenlabs/tts/multilingual-v2) lists $0.10/1,000 characters. A 200-character example would cost about R$0.10; text length does not guarantee a 15s audio duration. Alternatively, upload a prepared audio track. PixVerse also lists text-driven voice pricing ($0.24/100 characters when audio is absent); language/voice controls must be checked before considering that path.

Next prerequisites: Diego's model choice; configure `BLOB_READ_WRITE_TOKEN` securely in `.env.local`, never paste it into chat. Port V1 audio upload and tests, then persist both uploaded and generated media to Blob. Keep all development/test calls on `FAL_MOCK=1`; no real generation or funding is authorized by this research.
