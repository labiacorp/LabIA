# V2-PROVIDERS: initial fal.ai video audit

Verified on 2026-10-03 from `felipe/labia-v2-work` at `ded7c3146667e13e9866fd0bb256643fd82edeef`. Felipe chose video first and explicitly named Grok and updated Seedance. This is discovery evidence and an architecture proposal for discussion, not an approved implementation spec.

Historical pre-implementation audit. The subsequent implemented block and current maintenance path are described in [`provider-model-maintenance.md`](provider-model-maintenance.md) and `PROJECT_STATUS.md`.

## Discovery coverage

Used the exact [search page supplied by Felipe](https://fal.ai/explore/search), then selected Image to Video, Text to Video, Audio to Video and Video to Video, sorted by Recently added, with 48 entries per page and Show deprecated off.

- The filtered page reported **553 results**. All 12 pages were traversed: eleven pages of 48 and a final page of 25. The collected list has 553 unique endpoint IDs.
- The complete dated snapshot, including filters and page URLs/counts, is [`fal-video-catalog-2026-10-03.json`](fal-video-catalog-2026-10-03.json).
- These are catalog entries for generation and video processing, including editing, extension, avatars, relighting, upscaling and other utilities. They are not 553 interchangeable video generators.
- The unfiltered search initially displayed 1,503 results. Category counters and the natural-language "newest image to video models" search produced different totals; the saved inventory uses the explicit category filters and the fully traversed 553-result pagination.
- A public listing establishes discovery only. Account access, current active/deprecated status from the Platform API, input contract execution and real generation remain separate checks.

## Local integration matrix

The local catalog defines **five video families and eleven unique mode endpoints**. Nine occur in the filtered discovery snapshot. The two Veo 3 endpoints did not occur in that snapshot, although their official model/API pages remain readable; this alone does not prove deprecation.

| Family | Registered endpoints | Adapter path in code | Available from current V2 screen | Current official-source check |
| --- | --- | --- | --- | --- |
| Kling 2.5 Turbo Pro | `fal-ai/kling-video/v2.5-turbo/pro/{text-to-video,image-to-video}` | Input/output and price branches exist | Yes: fixed three 5s I2V blocks | Schema allows 5/10s and `image_url`; `tail_image_url` is documented but dropped by the mapper. Public price remains $0.35/5s plus $0.07/additional second. [API](https://fal.ai/models/fal-ai/kling-video/v2.5-turbo/pro/image-to-video/api), [price](https://fal.ai/models/fal-ai/kling-video/v2.5-turbo/pro/image-to-video). |
| Wan 2.5 Preview | `fal-ai/wan-25-preview/{text-to-video,image-to-video}` | Input/output and price branches exist | No model selector | Public I2V rates match the local 480p/720p/1080p table: $0.05/$0.10/$0.15 per second. [API](https://fal.ai/models/fal-ai/wan-25-preview/image-to-video/api), [price](https://fal.ai/models/fal-ai/wan-25-preview/image-to-video). |
| Hailuo 2.3 Standard | `fal-ai/minimax/hailuo-2.3/standard/{text-to-video,image-to-video}` | Input/output and price branches exist | No model selector | I2V schema allows 6/10s; $0.28/$0.56 matches the local table. It cannot run the current fixed 5s recipe. [API](https://fal.ai/models/fal-ai/minimax/hailuo-2.3/standard/image-to-video/api), [price](https://fal.ai/models/fal-ai/minimax/hailuo-2.3/standard/image-to-video). |
| Seedance 2.0 | `bytedance/seedance-2.0/{text-to-video,image-to-video,reference-to-video}` | Branches exist; reference mode is incomplete | No model selector | Reference endpoint requires arrays `image_urls`, `video_urls`, `audio_urls`; the mapper sends singular `video_url`. Public pricing mixes per-second and token descriptions. [reference schema](https://fal.ai/models/bytedance/seedance-2.0/reference-to-video/api), [I2V pricing](https://fal.ai/models/bytedance/seedance-2.0/image-to-video). |
| Veo 3 | `fal-ai/veo3`, `fal-ai/veo3/image-to-video` | Input/output and price branches exist | No model selector | I2V schema allows 4/6/8s, and public audio-off/on price is $0.20/$0.40 per second. Do not remove merely because discovery omitted the two IDs. [API](https://fal.ai/models/fal-ai/veo3/image-to-video/api), [price](https://fal.ai/models/fal-ai/veo3/image-to-video). |

"Adapter path exists" is a code observation, not a claim that all variants were tested. No model contract tests were executed during this audit.

## Missing families and variants

All entries below are absent from the local video registry. "Schema inspected" means public documentation was read; it does not mean an authenticated request was accepted.

| Family/variant | Representative exact endpoint | Evidence and integration implication |
| --- | --- | --- |
| Grok Imagine Video 1.5 | `xai/grok-imagine-video/v1.5/image-to-video` | Schema inspected: integer duration, `image_url`, 480p/720p/1080p. The public page states policy violations can still be charged. Rates are $0.08/$0.14/$0.25 per second; reference-image charges need mode-specific handling. [API](https://fal.ai/models/xai/grok-imagine-video/v1.5/image-to-video/api), [price/failure policy](https://fal.ai/models/xai/grok-imagine-video/v1.5/image-to-video). |
| Grok Imagine Video 1.5 Lite | `xai/grok-imagine-video/v1.5/lite/image-to-video` | Found among newest search entries; I2V/T2V IDs recorded. Schema inspected: integer duration and 480p/720p/1080p. Verify its own pricing/failure policy rather than copying the standard tier. [API](https://fal.ai/models/xai/grok-imagine-video/v1.5/lite/image-to-video/api). |
| Seedance 2.5 | `bytedance/seedance-2.5/image-to-video` | Schema inspected: explicit 4–30s or auto, optional end frame, native audio and encoding controls. Public token billing depends on frame area and duration; per-second figures are approximations. [API](https://fal.ai/models/bytedance/seedance-2.5/image-to-video/api), [price](https://fal.ai/models/bytedance/seedance-2.5/image-to-video). |
| Seedance 2.5 US | `bytedance/seedance-2.5/us/image-to-video` | Newest search includes US I2V/T2V/R2V. I2V schema inspected: 4–30s or auto. Treat region/endpoint as explicit configuration, not an automatic fallback. [API](https://fal.ai/models/bytedance/seedance-2.5/us/image-to-video/api). |
| Kling 3 Pro | `fal-ai/kling-video/v3/pro/image-to-video` | Schema inspected: `start_image_url`, 3–15s, optional end frame, elements and audio. Public $0.112/s without audio, $0.168/s with audio, $0.196/s with voice control. The old Kling mapper and $0.35 formula cannot be reused unchanged. [API](https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video/api), [price](https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video). |
| Kling 3 Turbo Pro | `fal-ai/kling-video/v3/turbo/pro/image-to-video` | Schema inspected: `image_url`, 3–15s and optional multi-prompt. Its schema differs from Kling 3 Pro; public price is $0.14/s. [API](https://fal.ai/models/fal-ai/kling-video/v3/turbo/pro/image-to-video/api), [price](https://fal.ai/models/fal-ai/kling-video/v3/turbo/pro/image-to-video). |
| Kling O3 / 4K | `fal-ai/kling-video/o3/pro/image-to-video` | Discovery includes standard/pro/4K generation, references and video editing. Contract and price review is still pending for these variants. [model](https://fal.ai/models/fal-ai/kling-video/o3/pro/image-to-video). |
| Wan 3.0 / Prime | `alibaba/wan-3.0/image-to-video` | Standard schema inspected: `start_image_url`, integer duration, `audio`, optional end frame; public rates $0.05/$0.10/$0.20 per second by resolution. Prime is a distinct discovered variant requiring its own review. [API](https://fal.ai/models/alibaba/wan-3.0/image-to-video/api), [price](https://fal.ai/models/alibaba/wan-3.0/image-to-video). |
| Wan 2.6 | `wan/v2.6/image-to-video` | Schema inspected: `image_url`, 5/10/15s, 720p/1080p and background audio input. Public $0.10/$0.15 per second. [API](https://fal.ai/models/wan/v2.6/image-to-video/api), [price](https://fal.ai/models/wan/v2.6/image-to-video). |
| MiniMax H3 Max / Turbo | `minimax/h3-max/image-to-video` | Schemas inspected for Max/Turbo. Max uses 480P/768P/1080P, numeric duration, prompt expansion and optional target audio. Its documentation warns output can exceed requested duration; reference billing has a separate allowance/surcharge formula. [I2V API](https://fal.ai/models/minimax/h3-max/image-to-video/api), [Turbo API](https://fal.ai/models/minimax/h3-max-turbo/image-to-video/api), [reference pricing](https://fal.ai/models/minimax/h3-max/reference-to-video). |
| MiniMax H3 / specialist Max APIs | `minimax/h3/reference-to-video`, `minimax/h3-max/director` | Discovery includes LoRA, camera controls, recast, insertion, extension, styles and lip-sync endpoints. These require their respective inputs and workflows, not just a normal I2V option. [search snapshot](fal-video-catalog-2026-10-03.json). |
| LTX 2.5 Pro / Fast | `lightricks/ltx-2.5/image-to-video/pro` | Discovery includes I2V/T2V/audio-to-video Pro/Fast. Pro I2V schema inspected: 6/8/10s or auto, 720p/1080p, FPS and camera motion controls. Not compatible with a forced 5s block. [API](https://fal.ai/models/lightricks/ltx-2.5/image-to-video/pro/api). |
| LTX 2.3 Pro / Fast | `fal-ai/ltx-2.3/image-to-video` | Pro schema inspected: 6/8/10s, 1080p/1440p/2160p. Same public page has conflicting rate tables; do not silently choose one as confirmed. [API](https://fal.ai/models/fal-ai/ltx-2.3/image-to-video/api), [price](https://fal.ai/models/fal-ai/ltx-2.3/image-to-video), [Fast API](https://fal.ai/models/fal-ai/ltx-2.3/image-to-video/fast/api). |
| Veo 3.1 | `fal-ai/veo3.1/image-to-video` | Schema inspected: 4/6/8s, 720p/1080p/4k, optional audio. Public 4k prices differ from lower-resolution prices. [API](https://fal.ai/models/fal-ai/veo3.1/image-to-video/api), [price](https://fal.ai/models/fal-ai/veo3.1/image-to-video). |
| Gemini Omni Flash 1.1 | `google/gemini-omni-flash/v1.1/image-to-video` | I2V schema inspected: start/end image, numeric duration and 360p/720p/1080p/4k. Discovery also includes T2V, references and editing. Current schema example contains an empty URL and image MIME type in a video result; actual result normalization needs independent verification. [API](https://fal.ai/models/google/gemini-omni-flash/v1.1/image-to-video/api). |
| PixVerse V6 / C1 | `fal-ai/pixverse/v6/image-to-video` | V6 schema inspected: 1–15s, 360p/540p/720p/1080p, `generate_audio_switch`, and a 2048-byte prompt limit. C1 has separate input types and audio-dependent pricing. [V6 API](https://fal.ai/models/fal-ai/pixverse/v6/image-to-video/api), [C1 API](https://fal.ai/models/fal-ai/pixverse/c1/image-to-video/api), [C1 price](https://fal.ai/models/fal-ai/pixverse/c1/image-to-video). |
| Happy Horse 1.1 / Vidu Q3 | `alibaba/happy-horse/v1.1/image-to-video`, `fal-ai/vidu/q3/image-to-video` | Current catalog candidates, including reference modes and Vidu Turbo/Mix. Detailed contract/price review pending. [Happy Horse API](https://fal.ai/models/alibaba/happy-horse/v1.1/image-to-video/api), [Vidu model](https://fal.ai/models/fal-ai/vidu/q3/image-to-video). |
| FLUX 3 video / Avatar X / other utilities | `blackforestlabs/flux-3/keyframes-to-video`, `mirage-api/avatar-x/reference-to-video` | Discovery includes keyframes, draft/enhance, avatars and processing tools. Record them in the inventory; only expose the operations whose resource inputs and execution policy LabIA implements. [video gallery](https://fal.ai/video), [search snapshot](fal-video-catalog-2026-10-03.json). |

## Architecture findings from the code

1. **The catalog is not connected to model choice in the pipeline.** `content-plan.ts:6` fixes one I2V model. `video-chain.ts:14`, `:50`, `:64` and `:82` assume that global model and exactly three 5s clips. `page.tsx:47` considers video ready only with three assets. Changing a catalog entry alone cannot expose a new model or a native 30s output.
2. **Input mapping and prices are duplicated outside the model definitions.** `fal.ts:351` matches all Kling endpoints with a substring and maps `image_url`; `fal.ts:548` assigns the old Kling price formula to that whole family. Adding Kling 3 IDs to the registry alone would select the wrong input/price path.
3. **Validation happens too late for some failures.** `generation.ts:31` quotes before reserving funds, but `estimateCost` does not run the submission input mapper. `fal.ts:191` and `:294` perform additional input checks inside `generate`, after reservation. `generation.ts:97` then treats any submit-stage exception as ambiguous, even when local validation failed before a network call. A preparation stage must validate and quote the same request before the transaction.
4. **Mode inference and reference support are incomplete.** `fal.ts:213` recognizes singular video/image fields; it does not recognize reference image arrays. The Seedance R2V branch sends singular `video_url` although the official schema requires arrays. Use explicit endpoint/mode selection, with compatibility aliases kept separately.
5. **Execution recovery depends on current global configuration.** `generation.ts:95` stores the request ID but not the endpoint returned by `generate`; `collectRunning` recreates the provider from current environment configuration. `advanceVideo` uses `REEL` rather than a persisted execution recipe. Model/price/default changes must not reinterpret jobs already running.
6. **Failure does not always mean zero provider cost.** `generation.ts:110` refunds unused reservation after repeated polling errors. Grok's documented charged policy rejection requires a billable-failure policy and reconciliation; a transport/read error alone does not prove the remote job failed or cost zero.
7. **A calculated amount is not an invoice.** Video results may omit duration; `fal.ts:606` falls back to the requested duration. Different APIs bill requested duration, measured duration, tokens or references. Track pricing evidence and settlement provenance instead of labelling all calculated results as verified provider charges.
8. **Provider extensibility needs routing by stored identity.** `provider.ts:10` currently selects fal.ai or its mock only. The `ModelProvider` interface exists, but polling is added separately through `PollableProvider`. A future provider should implement one consistent lifecycle contract and be chosen by the persisted provider ID, without moving pricing or ledger code into each provider.

## fal.ai APIs available for maintenance

The official Platform API documents:

- [Model search](https://fal.ai/docs/platform-apis/v1/models): endpoint discovery, active/deprecated filters, and `expand=openapi-3.0` for schemas.
- [Pricing](https://fal.ai/docs/platform-apis/v1/models/pricing): unit, rate and currency for exact endpoint IDs. A unit rate alone is not a complete parameter-aware quoting formula.
- [Cost estimate](https://fal.ai/docs/platform-apis/v1/models/pricing/estimate): historical-call or billing-unit estimates. Historical averages do not provide a guaranteed reservation for a configured request.
- [Billing events](https://fal.ai/docs/platform-apis/v1/models/billing-events): request IDs and provider cost totals, suitable for reconciliation.
- [Authentication](https://fal.ai/docs/api-reference/platform-apis/authentication): API keys and endpoint-specific scopes. Discovery/pricing generally accept API-scope keys; inspect the exact requirements for billing data.

Use these to detect changes and prepare reviewed catalog updates. Discovery and schema retrieval must not automatically activate a paid model, silently reinterpret an existing alias, or overwrite prices used by existing jobs.

## Architecture alternatives for discussion

| Approach | Benefit | Cost / limitation |
| --- | --- | --- |
| Append more cases to the current adapter | Small initial change | Keeps input/price duplication, substring routing and pipeline coupling; each update spreads through the same files. |
| **Reviewed endpoint registry + reusable family adapters + shared queue transport** | Exact endpoint identities, explicit capabilities, one preparation/quote path, and focused model updates | Requires a targeted refactor and persisted execution recipes; recommended. |
| Generate integrations automatically from discovery/OpenAPI at runtime | Broad discovery with little manual registration | Schemas do not settle pricing, charged failures, references or pipeline semantics; unsafe as automatic activation. Use metadata for maintenance reports instead. |

## Recommended direction to review

- Keep the existing common provider contract and ledger coordinator. Add a preparation boundary that validates inputs, resolves the exact endpoint and prices the same normalized request before funds are reserved.
- Maintain endpoint definitions with capabilities, controls/limits, defaults, pricing source/date/version and billing/failure policy. Reuse input/output mapping within genuinely compatible family variants; avoid family-wide substring guesses.
- Keep queue submission/status/result handling common in the fal transport. A new provider supplies its own transport/adapter through the same lifecycle contract; only fal.ai is connected today.
- Persist the selected provider, exact endpoint, normalized request, recipe and quoted pricing evidence for recovery. Existing jobs keep a compatible legacy path. Pricing snapshots and current billing receipts have different roles; document how differences are reconciled.
- Make the execution recipe explicit: preserve the existing 3×5s recipe and support a native single clip for compatible models. Durations/resolutions/audio controls come from reviewed capabilities; a 6s-only model must not be submitted as 5s.
- Start integration work with Grok 1.5/Lite and Seedance 2.5/US, as requested, then proceed through the remaining families using the same maintenance path. Resolve charged-failure handling and token/resolution quoting before presenting those options as usable.
- Retain all 553 discovery entries as an inventory. Distinguish discovered, contract-reviewed, integrated, mock-verified and real-verified states. Only compatible, integrated configurations belong in the generation selector.

The exact implementation file list and detailed migration/test strategy belong in the subsequent approved spec and plan.

## Verification and remaining requirements

- Completed: source discovery through 12 browser pages, duplicate/count checks, local registry comparison, public API/pricing inspection for the entries marked above, and source/line inspection of the execution path.
- Not completed: authenticated discovery/pricing/billing, contract execution, new integrations, database migration, UI changes, or real generation.
- This checkout has no `node_modules` or `.env.local`, and no `FAL_KEY` in the process environment. Product tests/typecheck/build were not run. No secret was printed or copied from another project.
- No paid call, generation, top-up, push, merge or deployment. Cost: R$0. The local documentation commit remains pending Git author identity from Felipe.

Next: review the architecture direction, write the implementation spec, then create the implementation plan through Superpowers before editing product code.
