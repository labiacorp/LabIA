# Maintaining fal.ai video integrations

The V2 content video form offers reviewed image-to-video models plus the existing three-clip Kling recipe. The integration is local and mock-verified; no paid generation or provider invoice was verified in this block.

## Add or update a model

Run `npm run prices:check` with a locally configured `FAL_KEY` to fetch the official unit-price metadata for all selected endpoints. The command only reads metadata and saves `.handoff/fal-price-check.json`; it submits no generation and updates no catalog record. Compare the response with the endpoint's resolution/audio/token pricing page, then update the affected definition's rates and `verifiedOn` date. Unit metadata alone is not a complete parameter-specific formula. The UI and server quote share the updated definition; existing recipes retain their captured price/currency snapshot. `USD_BRL_RATE` is the configured conversion used for estimates, not an automatically fetched market exchange rate. No scheduled sync is configured.

1. Inspect the exact endpoint's official API schema and pricing page. Record verification date and URL; regional, Lite, Turbo and audio variants can have different schemas or prices.
2. Add/update its record in `src/lib/providers/video-models.ts` (`VIDEO_DEFINITIONS`): exact ID, display name, allowed durations/resolutions, audio controls, mapping and billing rates. Reuse a mapping only when the request schema matches. Use `wire` field mappings/defaults/omissions for normal image+prompt endpoints; `clipRates`, `baseRates` and `audioDurations` express clip variants, fixed fees and constrained audio. Add a focused mapping in `prepareVideo` for a genuinely new input shape; do not route by substring or copy another variant's price.
3. Extend `src/lib/providers/video-models.test.ts` with independently derived quote values, accepted/rejected parameters, and the SDK payload boundary. Test settlement when billing rules differ. `getVideoOptions` automatically prices valid combinations and exposes the definition to the form; queue transport and ledger logic stay shared.
4. Run typecheck, lint, the full local test command and build. Check the real `VideoForm` in the browser at desktop and approximately 390px. Database tests require a configured test-capable Neon environment and seed/delete their own users; skipped tests do not establish database behavior.

Do not activate an endpoint just because it appears in the discovery snapshot. This block supports I2V only: reference-to-video, editing, extension, training, avatars and processing APIs need their respective source inputs and workflows before being exposed.

## Existing boundaries

- `video-models.ts`: request validation/mapping and immutable pricing evidence. Seedance estimates use the endpoint's published approximate per-second rate for bounded 9:16–16:9 source images; settlement uses measured output dimensions/duration and the documented price per 1,000 tokens. No automatic duration is enabled.
- `fal.ts`: shared SDK submit/status/result transport. `MockProvider` uses the same catalog/validators and cannot make paid calls.
- `video-options.ts`: server-priced combinations for the selector. Source dimensions come from the owned scene asset, not client input.
- `video-chain.ts`: persisted endpoint/configuration/quote recipe; one native clip or legacy three 5s clips. FFmpeg metadata measures the output. A native clip is reused at finalization without a merge request or additional charge.
- `generation.ts`: pre-debit validation, server-side price comparison, reservation/idempotency, exact submitted endpoint storage, guarded completion. Uncertain real-provider result/cost keeps the reservation for manual reconciliation. An interrupted submission expires to an uncertain state and is never automatically resent.

Provider charges verified from billing events are distinct from calculations using media metadata and a price snapshot. Paid validation requires the owner's explicit authorization and an R$ estimate first. The standard and US Seedance 2.5 token prices are separately defined; the US tier is more expensive. Grok policy rejections may be charged.

## Add another provider

Implement `ModelProvider` plus non-blocking `checkResult`, including `validate` before debit. Register its factory in `src/lib/provider.ts`; persist and route by its provider ID and exact endpoint. Reuse the existing ledger coordinator. Do not add a paid fallback or infer connectivity from a declaration in `billingModeFromProvider`.

## Verification from this block

SDK contract/quote tests and memory-persistence lifecycle tests cover the selected Grok/Seedance native flow, measured settlement with the captured exchange rate, recipe preservation, finalization reuse, rejected inputs, stale quotes, duplicate intents and uncertain cost. These tests do not exercise Neon transaction locks or confirm live fal.ai availability/output quality. Browser QA uses the actual full local app with an isolated PGlite database and FAL_MOCK=1. Model is selected first; only its compatible qualities are then offered. R$/second and total estimated clip price are distinct. UI checked atdesktop/390px; no paid provider submission.

## Reference image generation (2026-10-04)

`src/lib/providers/image-models.ts` contains seven exact reviewed scene endpoints with published per-image tariffs, allowed quality choices and schema-specific reference/size mapping. `content-generation.ts` retains the owned FRONT portrait, creates the selected scene plan and stores `imagePricing`; `SceneForm` exposes model then quality and cost. Provider transport and the ledger remain shared. New definitions validate before reservation and settle output count against captured per-image price/currency, a calculation rather than a provider invoice. Existing character-kit and persisted image jobs keep their prior mappings.

Quality rates: Nano Banana2 0.5K/1K/2K/4K USD0.06/0.08/0.12/0.16; Nano Banana Pro1K/2K USD0.15 and4K USD0.30; Seedream5Lite USD0.035; Seedream4.5 USD0.04; FLUXKontextPro/Max USD0.04/0.08; QwenImageMax USD0.075. Source URLs are exactendpoint pages on each definition's quote. Fixed-image rates must not be reused for GPTImage2.5's text/image token billing or FLUX2 input/output megapixels. No zero-compute placeholder is treated as a free generation.

Validation includes SDKboundary payloads, before-debit rejection, selected-model persistence, one-image caps and captured-price settlement. Local preview: create the isolated demo fixture with `node .handoff/image-preview.mjs` after the mock DB server is running, then open `/i/preview-influencer/c/preview-image-content`. No real generation, push, merge or deployment.
