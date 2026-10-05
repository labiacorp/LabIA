# Motion recreation implementation and verification

## Delivered

- `/trends` offers parking/group, dance and custom preparation recipes. It does not bundle third-party trend videos. Users import their own video, preview it and assign one to three ordered image references.
- Authenticated reference import accepts up to 4 MiB per file, within the Vercel server upload body limit. Sharp validates and normalizes JPEG/PNG/WebP, strips metadata and bounds decoded dimensions. MP4Box reads H.264 MP4 structure, duration and dimensions; accepted clips are 4–30 seconds and at most 4096px per side. This is structural validation, not a full transcode or frame-quality check.
- Private Blob storage is implemented; in explicit non-production mock mode files are stored under ignored `.handoff/reference-uploads`. Production never falls back to local disk. Private media previews/downloads check ownership and support byte ranges. Short-lived HMAC links grant the provider access to one asset for at most an hour.
- Recreating creates an owned Content with a persisted motion brief and one final-output step. Existing generated reference images and imported references are supported. Saved input order, instructions and resolution can be reused in a new production.
- Genjutsu Motion Transfer adapter uses the documented asynchronous REST endpoint. Server estimates use source duration rounded up and published resolution rates, converted with the configured BRL rate. Existing ledger locking/idempotency protects submission. Unknown submission is never automatically resent; missing verified final billing retains the reservation and records `cost_unknown` while keeping completed media reviewable. Manual reconciliation requires an explicit verified amount for Higgsfield.
- The UI distinguishes the mock video fixture from real motion transfer. No actual provider generation was performed.

## Verification

All 103 tests across 29 files passed, including ownership/ordering action tests and motion billing reconciliation regression checks. Typecheck, lint and production build passed. Production dependency audit has zero findings; development-tooling findings remain separate.

Browser QA with disposable accounts exercised invalid-image rejection, three image imports, MP4 import, persisted references, mock submission/polling, review approval, download, byte ranges, anonymous denial, foreign-account denial and recreate prefill. Catalog, editor, production and library passed 390px/1440px overflow and browser-exception checks. Fixtures/files were deleted afterward. Screenshots were inspected. Connections configuration states were also visually checked at desktop and 390px. Fixture-only ledger entries were used to exercise reservation; real accounts were untouched.

## External readiness and limitations

Live Blob writes and live Higgsfield requests remain unverified because credentials are absent. Configure a private Blob store (`BLOB_READ_WRITE_TOKEN` or linked `BLOB_STORE_ID` with Vercel OIDC), `HF_CREDENTIALS` and the HTTPS `LABIA_PUBLIC_URL`. Production ignores FAL_MOCK. Do not interpret successful mock output as model-quality verification.

The built-in cards are recipe structures, not a licensed motion-video library. Reference mapping is prompt-guided, not guaranteed object tracking. Larger/chunked uploads, trimming, a populated curated clip catalog, output migration to durable storage and a provider usage API for automatic final billing reconciliation remain future work. Imported objects can become orphaned after a process crash between storage and database persistence; normal database failures remove the just-uploaded object.

## Sources

- [Motion Transfer API](https://open.higgsfield.ai/models/higgsfield/genjutsu/motion-transfer/v1.0/api-reference)
- [Motion Transfer pricing](https://open.higgsfield.ai/models/higgsfield/genjutsu/motion-transfer/v1.0/playground)
- [Higgsfield REST lifecycle](https://open.higgsfield.ai/quick-start)
- [Vercel private storage](https://vercel.com/docs/vercel-blob/private-storage)
- [MP4Box.js](https://github.com/gpac/mp4box.js)
