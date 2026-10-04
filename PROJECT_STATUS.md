# LabIA: current state

Branch `v2`, rewritten from scratch on 2026-10-03. Describes what exists, nothing else. If this file and the code disagree, the code wins; fix this file in the same commit as the change.

## What it is

A pipeline to produce content with AI influencers: Influencer (face, niche, tone) > Content (one piece) > Steps (script, image, video, final assembly). UI in PT-BR. Cost is quoted before and recorded after each step.

## Stack

Next.js 16 (App Router, Server Actions) + TypeScript + Tailwind 4 (legacy `tailwind.config.ts` via `@config`), Prisma 7 on Neon (`@prisma/adapter-neon`), Auth.js v5 (Google only, JWT sessions, closed beta by `ALLOWED_EMAILS`), fal.ai for generation. Design system: tokens and `components/ui` from the Claude Design handoff (`Proposta LabIA com Design System/`, 2026-10-02).

## Screens (`src/app`)

`/acesso` (shared access code), `/login`, `/` (influencers), `/influencers/new`, `/i/[id]` (tabs: Conteúdos, Personagem, Biblioteca, Perfil), `/i/[id]/c/[contentId]` (the pipeline, one card per step). API: `POST /api/influencers/[id]/refresh` (polls running jobs), `/api/auth/*`.

## How generation works (`src/lib/generation.ts`)

Character kit = step 1 sheet (nano-banana-2, 2K, 3:2) then step 2 portraits front/profile/detail (nano-banana-2/edit, 1K, using the approved sheet as reference). Rules, ported from the V1 coordinator:
- the price is quoted by the V1 provider layer (`src/lib/providers/`, copied from `main`), shown in R$, and sent back with the approval; a changed price charges nothing;
- one `operationKey` per intent: a double submit or parallel requests never charge or send twice;
- the ledger reserves the price in the same transaction that creates the step (row lock per user, so no overspend); refund on failure;
- submit state `not_submitted -> submitting -> submitted | submission_unknown`; an ambiguous submit is never resent and keeps the reservation (`npx tsx scripts/ledger.ts refund <stepId> [verifiedActualBrl]` reconciles (VIDEO requires the verified total actual cost; concurrent reconciliation cannot refund twice));
- no worker: the page polls `/api/influencers/[id]/refresh`, which checks fal once per running step. After three errors, mocks refund unused reservation; real-provider errors keep it as cost_unknown for manual reconciliation because a read failure or policy rejection does not prove zero cost. Metadata failure also keeps the reservation. Completed video blocks remain charged after later failure. Persisted not_submitted phases can resume; a submitting phase older than five minutes becomes submission_unknown for manual reconciliation, never an automatic resend.
- `FAL_MOCK=1` (dev/test only, ignored in production) swaps fal for a fake provider with real prices; prompt markers `[mock-fail]` and `[mock-submit-error]` simulate failures.

## Access

`LABIA_ACCESS_CODE` + `AUTH_SECRET` gate sign-in (signed cookie, 8 tries/10 min/IP in Postgres, fails closed in production when unset); the check also runs in the Auth.js `signIn` callback. `ALLOWED_EMAILS` is an optional extra restriction.

## Data (`prisma/schema.prisma`)

User, Influencer (with `visualSignature`), Content, Step (`kind CHARACTER` belongs to an influencer; content IMAGE uses the existing contentId relation; `operationKey`, `submissionState`), Asset (`role` SHEET/FRONT/PROFILE/DETAIL), LedgerEntry, RateLimitEvent. Balance = sum of `LedgerEntry.deltaBrl`; top-ups are manual: `npx tsx scripts/ledger.ts topup <email> <brl>`.

## Roadmap to a finished V2

Goal: a platform that is feature-complete, deployed and ready for the founders to test real models by hand. Building and testing here never runs a real generation (use `FAL_MOCK=1`). The UI must follow `design/reference/` (Claude Design handoff; see AGENTS.md): the current build is generic and must be improved from that reference, adapted to V2's structure. Keep everything in the tokens (`tailwind.config.ts`, `src/app/globals.css`, `src/components/ui`) so that a later rebrand by Claude Design is a token change.

### Awaiting review — 2026-10-05
- Content IMAGE now offers seven reviewed reference-capable endpoints: Nano Banana 2/Pro, Seedream 5.0 Lite/4.5, FLUX.1 Kontext Pro/Max and Qwen Image Max. Model > quality > scene; quality options show R$/image and the approved total is recomputed on the server. The owned FRONT portrait stays mandatory. Each request is capped to one output image, uses an immutable per-image price snapshot and reuses the existing reservation/idempotency/polling ledger. Character-kit models remain as configured. GPT Image 2.5 Flare and FLUX.2 variants were audited but are not activated by this block: token/input-output megapixel billing needs separate faithful quote/settlement rules. All verification is local/mock, not an authenticated provider run.
- Video selection is model-first: every registered model stays visible; quality lists only that model's supported resolutions. Controls follow model > audio > quality > duration. Resolutions are sorted ascending; toggling supported audio recomputes quality rates and the total. Quality options show R$/second. A native duration slider steps through supported durations only and updates the adjacent estimated clip total immediately; fixed-duration models show a fixed value. total cost remains next to approval. Fixed-quality APIs have a separate "Definida pelo modelo" choice. Token/clip equivalents are marked approximate, input-image surcharges remain separate, and source/date details are collapsed. No exchange-rate text or large price table is shown. `npm run prices:check` reads unit-price metadata for manual review; it never generates media or automatically overwrites catalog formulas.
- **V2-PROVIDERS — implementation finished locally, awaiting review.** Closed at Felipe's request on2026-10-04. Review and full-app testing planned for2026-10-05, before deciding on commit/integration into`v2`. Delivered:36 video models,7 reference-image models and pricing controls. See[`docs/provider-catalog-task.md`](docs/provider-catalog-task.md) for scope and retained follow-ups. Felipe subsequently authorized a commit and publication of`felipe/labia-v2-work` as a draft PR for team visibility. Full-app review/integration remains scheduled for2026-10-05; no merge into`v2` or`main` and no deployment authorized.
- Video is the first priority. The content video step now offers 36 I2V models: Grok 1.5/Lite, Seedance 2.5/US, Kling 2.5/3 Pro/3 Turbo Pro, Wan 2.5/2.6/3, Veo 3.1, LTX 2.5 Pro and Hailuo 2.3 Standard, MiniMax H3/Max/Max Turbo and Hailuo-02 Standard/Fast, PixVerse V6/C1, Vidu Q3/Q3 Turbo, Happy Horse 1.1 and Gemini Omni Flash 1.1, Vidu Q2 Pro/Turbo, Veo 3.1 Fast, Wan 2.1 Pro, Hailuo-02 Pro, Hailuo 2.3 Fast Standard, MiniMax Video-01/Director/Live and PixVerse 3.5/4/5 (verified5sconfigurations), plus the legacy three-clip Kling recipe. Model, duration, resolution and supported audio controls determine the displayed/server-recomputed quote. Native clips keep an immutable recipe/price snapshot, settle from measured metadata, and finalize by asset reuse at no extra provider charge. Discovery snapshot: 553 public video/processing entries across 12 pages; it is not an enabled-model list. Full catalog coverage remains a follow-up after this closed implementation block. The complete I2V audit fetched 107 public OpenAPI schemas out of 108 candidates (one404), and108 public pricing pages. These discovery files alone do not enable models. Other modalities/families and real-provider verification remain pending. Maintenance: [`docs/provider-model-maintenance.md`](docs/provider-model-maintenance.md).
- Ponytail review on 2026-10-03 removed the selector's dependence on catalog order: the legacy recipe resolves its configured Kling endpoint explicitly. The selector is shared by all influencer/content video pages; it is not an image, script or voice selector, and has not been deployed.

### Done
- Foundation: Next 16, Prisma 7 on Neon, Auth.js with Google, access code gate, Claude Design tokens and `ui` components.
- Character kit: sheet then front/profile/detail portraits (quoted in R$, idempotent, balance reserved under a row lock, refunds, ambiguous submit never resent, manual reconciliation via `scripts/ledger.ts`).
- Content pipeline: scene IMAGE from the FRONT portrait; VIDEO = three chained 5s Kling blocks (last frame via fal FFmpeg, measured duration cost); ASSEMBLY via fal merge-videos; content moves to REVIEW. All verified only with the fake provider (41 tests, desktop and 390px).
- Video model selection and native single-clip execution. Validation runs before debit; the exact submitted endpoint is persisted. Quote rules are captured for native/legacy recipes so later catalog/currency changes do not reinterpret their calculated settlement. Current evidence is mock/browser verification only, not a real provider invoice.

### To do (in blocks; each block is small, committed, and updates this file)
1. **Go live.** New Vercel project for V2 (not the V1 project), env vars, production Neon branch, Google OAuth client, domain, access code, CI on GitHub (typecheck, lint, tests, build; none exists yet). Needs the founders: accounts, OAuth client, domain.
2. **Files that last.** Copy generated media from fal URLs to Vercel Blob; uploads (base photo, audio, an existing character sheet), ported from V1 `app/api/assets/upload` with its tests. Needs the founders: `BLOB_READ_WRITE_TOKEN` in `.env.local` and on Vercel.
3. **Voice and lip sync.** Research is in `docs/video-and-voice-research.md` (LatentSync after assembly recommended for cost; PixVerse and Sync Lipsync 2 are alternatives). Needs the founders: lip sync option, uploaded audio vs generated voice.
4. **Complete the pipeline.** Real SCRIPT step (needs the founders: user-written vs AI-written, and the model), retry/regeneration of any step, reuse clips of a failed chain, download the final video, archive/delete content and influencers.
5. **Management screens.** Library with filters (V1 has them), balance and top-up screen (today a script), per-user spend limit, cost-per-piece report (the metric the founders will measure).
6. **Canvas** as a second view of the same steps (port V1 pieces: typed handles, invalid-edge hint, palette by area).
7. **UI/UX pass from the design reference.** Rework the shell/header (cost chip, mobile sheet), home, influencer and content screens, library and states (loading, empty, error) using `design/reference/` and its `MAPA-DE-APLICACAO.md` copy rules, adapted to Influencers > Content > Steps. Can start now, no decisions needed.
8. **Finish.** Terms and privacy pages, mobile pass, optional MCP.
9. **Model/API catalog and provider extensibility (V2-PROVIDERS, in progress).** Verify fal.ai's current catalog against the LabIA integrations, integrate selected missing APIs and update existing ones. Review the catalog/adapter/pipeline boundaries so new models and provider updates have a small, documented integration path. Preserve server-side pricing, idempotency, reservation/refund and non-blocking polling. See [`docs/provider-catalog-task.md`](docs/provider-catalog-task.md); coordinate shared provider and generation files with Felipe.

Not now: payments, self-service signup, locale currency, auto-posting, Cloudflare.

Unverified until the founders run real generations by hand: real fal outputs and invoices (`/edit` price is assumed equal to the base model; FFmpeg metadata/merge are listed at $0), face continuity across clips, and fal media URL lifetime.

## Environment

Listed in `.env.example`. `DIRECT_URL` (unpooled) is used by Prisma migrations, `DATABASE_URL` (pooled) by the app. Dev-only e-mail login exists when `NODE_ENV=development`.

## Run and check

`npm run dev`, `npm run typecheck`, `npm run lint`, `npx vitest run` (41 tests; the money-path ones run against the database with their own seeded user, deleted afterwards), `npm run build`.
