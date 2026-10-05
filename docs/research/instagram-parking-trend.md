# Parking trend: product requirements

Requested by the user on 2026-10-04 as the next capability set for LabIA. Status: initial upload, multi-reference preparation and asynchronous generation integration implemented; verified with mocks. See `../qa/2026-10-04-motion-recreation.md` for exact limitations. This adds to the existing platform roadmap.

## Observed reference

[Original Instagram carousel](https://www.instagram.com/p/Dd38xwwkcD-/), auramode.ai. All six slides were inspected in the browser without signing in or commenting. The sequence shows an example video, identifies Nano Banana Pro and Higgsfield Genjutsu, prepares character sheets for three characters, selects a trend from a preset gallery, replaces the original references and generates/downloads a video. The last slide advertises prompts sent by direct message; those private prompts were not available or requested.

## LabIA gaps and execution order

1. Durable reference uploads: validated image/video imports, dimensions/duration, ownership and recoverable storage. Reuse existing generated sheets as an alternative to upload.
2. Trends catalog: searchable cards with preview, source duration, required character slots and a Recreate action. Use curated media with known provenance; the Instagram URL is research context, not a downloadable model input or a production media license.
3. Multi-character setup: select owned characters and a completed sheet/reference for each role, preview substitutions and preserve their order in the production snapshot. Current Content has one owner character and scene generation uses one FRONT image; it cannot represent this full workflow yet.
4. Motion recreation: explicit reference-video input and provider capability adapter, separate from the current three-block Kling image-to-video chain. Do not label ordinary animation as motion transfer.
5. Execution: server-side estimate based on selected model and measured input, confirmation, idempotent reservation, asynchronous progress, unknown-submission recovery, original inputs and output history, review/download/recreate.
6. Validate the complete flow using mock responses and disposable users, then separately validate paid output quality when specifically authorized.

## Official provider research

[Genjutsu overview](https://open.higgsfield.ai/models/workflows/genjutsu/playground) shows a motion-transfer workflow accepting video, image references and a prompt. The specific [Motion Transfer API reference](https://open.higgsfield.ai/models/higgsfield/genjutsu/motion-transfer/v1.0/api-reference) resolves the earlier overview spelling inconsistency; implementation uses `higgsfield/genjutsu/motion-transfer/v1.0`.

[Genjutsu Restyle API](https://open.higgsfield.ai/models/higgsfield/genjutsu/restyle/v1.0/api-reference) is a separate documented style workflow. It accepts a source video and up to five reference images; its style catalog requires authentication. It does not guarantee explicit person-to-reference mapping. Do not mistake its style catalog for the consumer site's viral-video gallery or assume either grants access to the parking clip.

[Kling 2.6 Motion Control via fal](https://fal.ai/models/fal-ai/kling-video/v2.6/pro/motion-control/api) is an alternative reference-image/reference-video API. It needs separate capability evaluation for the post's multiple-character example and must not be presented as equivalent without testing.

## Acceptance

A user can choose a trend, supply all required owned references, review inputs and cost, run a mock recreation, return after navigation, and download the correct result. Foreign assets, incompatible media and expired source links fail before reservation. Duplicate clicks do not duplicate spend. Pending credentials, catalog access, exact pricing and paid quality checks are stated explicitly rather than replaced by a fake working button.
