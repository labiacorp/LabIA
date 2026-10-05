# LabIA: current state

Branch `v2`, rewritten from scratch on 2026-10-03. Describes what exists, nothing else. If this file and the code disagree, the code wins; fix this file in the same commit as the change.

## What it is

A pipeline to produce content with AI influencers: Influencer (face, niche, tone) > Content (one piece) > Steps (script, image, video, final assembly). UI in PT-BR. Cost is quoted before and recorded after each step.

## Stack

Next.js 16 (App Router, Server Actions) + TypeScript + Tailwind 4 (legacy `tailwind.config.ts` via `@config`), Prisma 7 on Neon (`@prisma/adapter-neon`), Auth.js v5 (Google only, JWT sessions, closed beta by `ALLOWED_EMAILS`), fal.ai for generation. Design system: tokens and `components/ui` from the Claude Design handoff (`Proposta LabIA com Design System/`, 2026-10-02).

## Screens (`src/app`)

`/acesso` (shared access code), `/login`, `/painel` (dashboard), `/conta` (profile/photo/bio and effective format/view preferences, owned usage totals, balance, rolling 30-day net reservations, private JSON export, current/all-session sign-out), `/influenciadores` (owned character list and search), `/conteudos` (owned production list, 24-item pages, search, character/status filters and reversible archives), `/conteudos/novo` (free draft creation with owned character and 9:16/16:9/1:1 format), `/saldo` (available balance and latest 100 ledger entries), `/biblioteca` (global owned media, filters, 24-item pages, details and downloads), `/conexoes` (read-only integration readiness), `/` (primary influencer studio: appearance builder, presets/sheet previews, owned characters, motion briefs, history), `/influencers/new` (redirect to studio), `/i/[id]` (tabs: Conteúdos, Personagem, Biblioteca, Perfil), `/i/[id]/c/[contentId]` (editable title/brief when no generation is running, free script, pipeline steps/canvas, final review and downloads). API: authenticated `GET /api/assets/[id]/download`, `POST /api/influencers/[id]/refresh` (polls running jobs), `/api/auth/*`.

## Reusable drafts and referrals

- `/modelos` offers five original editable script starters and owned saved briefing/script snapshots. Save is idempotent per source production; reuse and duplication create fresh free pipeline steps without copying media, charges or approval. Personal models can be deleted without affecting their productions and are included in account export.
- Character profile selects and previews a completed owned FRONT portrait. Scene UI and execution use this explicit selection, including when newer portraits exist.
- `/conta#indicacoes` exposes a stable personal referral link and new-account count. `/r/[code]` captures first-touch attribution for 30 days; the sign-in creation branch attributes only new accounts. `/convite` explains beta restrictions. No financial reward, email sending or access-gate bypass. See `docs/research/referrals.md`.

## Motion recreation and imported references

`/trends` prepares parking/group, dance and custom motion briefs with an owned imported video and up to three ordered images. Import supports normalized JPEG/PNG/WebP and structurally validated MP4 H.264 (4–30s), maximum 4 MiB. Production uses private Vercel Blob; explicit development mock mode uses ignored local storage. Private previews enforce ownership, support ranges and expose short-lived provider links only at generation.

Genjutsu Motion Transfer uses the shared reservation/operation-key coordinator and asynchronous polling. Completed video appears in production review and the library. Real final cost stays unknown until verified; reservations are preserved for reconciliation. Mock output is clearly identified. Live Blob/Higgsfield integration remains unverified without credentials; the catalog contains recipes and requires the user's source video. Details: `docs/qa/2026-10-04-motion-recreation.md`.

## How generation works (`src/lib/generation.ts`)

Character kit = step 1 sheet (nano-banana-2, 2K, 3:2) then step 2 portraits front/profile/detail (nano-banana-2/edit, 1K, using the approved sheet as reference). Rules, ported from the V1 coordinator:
- the price is quoted by the V1 provider layer (`src/lib/providers/`, copied from `main`), shown in R$, and sent back with the approval; a changed price charges nothing;
- one `operationKey` per intent: a double submit or parallel requests never charge or send twice;
- the ledger reserves the price in the same transaction that creates the step (row lock per user, so no overspend); refund on failure;
- submit state `not_submitted -> submitting -> submitted | submission_unknown`; an ambiguous submit is never resent and keeps the reservation (`npx tsx scripts/ledger.ts refund <stepId> [verifiedActualBrl]` reconciles (VIDEO requires the verified total actual cost; concurrent reconciliation cannot refund twice));
- no worker: the page polls `/api/influencers/[id]/refresh`, which checks fal once per running step; any error counts and only the third one fails the step and refunds unused reservation. Metadata failure keeps the remaining reservation as cost_unknown for manual reconciliation. Completed video blocks remain charged after later failure. Every persisted not_submitted phase can be resumed by refresh; submitting/unknown phases are never automatically resent.
- `FAL_MOCK=1` (dev/test only, ignored in production) swaps fal for a fake provider with real prices; prompt markers `[mock-fail]` and `[mock-submit-error]` simulate failures.

## Access

`LABIA_ACCESS_CODE` + `AUTH_SECRET` gate sign-in (signed cookie, 8 tries/10 min/IP in Postgres, fails closed in production when unset); the check also runs in the Auth.js `signIn` callback. `ALLOWED_EMAILS` is an optional extra restriction.

## Data (`prisma/schema.prisma`)

User, Influencer (with `visualSignature`), Content, Step (`kind CHARACTER` belongs to an influencer; content IMAGE uses the existing contentId relation; `operationKey`, `submissionState`), Asset (`role` SHEET/FRONT/PROFILE/DETAIL), LedgerEntry, RateLimitEvent. Balance = sum of `LedgerEntry.deltaBrl`; top-ups are manual: `npx tsx scripts/ledger.ts topup <email> <brl>`.

## Roadmap to a finished V2

Goal: a platform that is feature-complete, deployed and ready for the founders to test real models by hand. Building and testing here never runs a real generation (use `FAL_MOCK=1`). The UI must follow `design/reference/` (Claude Design handoff; see AGENTS.md): the current build is generic and must be improved from that reference, adapted to V2's structure. Keep everything in the tokens (`tailwind.config.ts`, `src/app/globals.css`, `src/components/ui`) so that a later rebrand by Claude Design is a token change.

### Done
- Audit/recovery from V1, the branch backup and read-only Leaner patterns: `docs/v2-platform-audit.md` maps verified legacy capabilities and remaining gaps. Added global library with owned server-side filters/pagination, correct image/video/audio previews, provenance, step cost and safe attachment downloads; editable character profile/category; free manual script feeding prompt defaults; canvas view of existing Steps (zoom, minimap, readable mobile layout, positions saved in this browser); final-video approval/adjustment/review. Missing provider credentials are rejected before reserving any balance. Raw provider errors are replaced with controlled UI copy and unknown actual costs remain unavailable. Login shows OAuth readiness/errors and validates development email; Connections reports configuration without claiming verified provider health.
- Platform shell: active desktop navigation and accessible native mobile/account dialogs; dashboard with account-scoped counts and recent productions; editable account display name retained on subsequent sign-in; influencer/content searches and content-status filters; read-only balance and ledger. Influencer and ledger lists show the latest 100 matches and disclose the limit; content lists have real pagination. Shared loading/error states and empty/filter-empty states. The studio remains at `/`; the wordmark opens `/painel`.
- Foundation: Next 16, Prisma 7 on Neon, Auth.js with Google, access code gate, Claude Design tokens and `ui` components.
- Character kit: sheet then front/profile/detail portraits (quoted in R$, idempotent, balance reserved under a row lock, refunds, ambiguous submit never resent, manual reconciliation via `scripts/ledger.ts`).
- Content pipeline: scene IMAGE from the FRONT portrait; VIDEO = three chained 5s Kling blocks (last frame via fal FFmpeg, measured duration cost); ASSEMBLY via fal merge-videos; content moves to REVIEW. All verified only with the fake provider (41 tests, desktop and 390px).
- Reel estimate on the content page (about R$ 5.89 without voice at 5.21).
- Primary studio, closely following the Higgsfield reference requested by Diego: 19 appearance groups stored in the character prompt, six editable briefs, character sheet dialog, account-scoped gallery/history and motion draft creation with the existing V2 pipeline. Registration/drafts are free; generation keeps the existing BRL approval. Public reference preview images are externally hosted and attributed. Photo upload, Genjutsu motion transfer and object replacement remain unimplemented. Details: `docs/references/higgsfield-influencer-studio.md`.
- Studio verification passed on GitHub. The reusable CI workflow is preserved separately on `useleaner/LabIA:diego/v2-ci`; adding it upstream requires a token with workflow scope or a maintainer merge through GitHub. Database integration tests need an isolated Neon database.

### To do (in blocks; each block is small, committed, and updates this file)
1. **Go live.** New Vercel project for V2 (not the V1 project), env vars, production Neon branch, Google OAuth client, domain, access code, CI workflow integration, and a dedicated CI Neon database for integration tests. Needs the founders: accounts, OAuth client, domain.
2. **Files that last.** Copy generated media from fal URLs to Vercel Blob; uploads (base photo, audio, an existing character sheet), ported from V1 `app/api/assets/upload` with its tests. Needs the founders: `BLOB_READ_WRITE_TOKEN` in `.env.local` and on Vercel.
3. **Voice and lip sync.** Research is in `docs/video-and-voice-research.md` (LatentSync after assembly recommended for cost; PixVerse and Sync Lipsync 2 are alternatives). Needs the founders: lip sync option, uploaded audio vs generated voice.
4. **Complete the pipeline.** Optional AI-written script (manual script is free and functional), safe retry/regeneration with attempt history and verified-clip reuse, durable uploads, and archive/restore for content/influencers. Final mock-video download and human review are implemented.
5. **Management screens.** Authorized manual top-up management (balance/extract UI is read-only), per-user spend limit, cost-per-piece reporting and pagination beyond the disclosed 100-item influencer/content/ledger limits. Character profile editing is implemented; title/idea editing and reversible archives are implemented. Global library has filters and real pagination.
6. **Canvas extensions.** The second view of Steps is implemented. Persistent shared layout, arbitrary graph editing, typed connection validation, cycle prevention, palette and branched execution remain; recover these from V1 while preserving the V2 model.
7. **UI/UX pass from the design reference.** Continue the influencer detail and production screens, global library and states (loading, empty, error) using `design/reference/` and its `MAPA-DE-APLICACAO.md` copy rules, adapted to Influencers > Content > Steps. Can start now, no decisions needed.
8. **Finish.** Terms and privacy pages, mobile pass, optional MCP.

Not now: payments, self-service signup, locale currency, auto-posting, Cloudflare.

Unverified until the founders run real generations by hand: real fal outputs and invoices (`/edit` price is assumed equal to the base model; FFmpeg metadata/merge are listed at $0), face continuity across clips, and fal media URL lifetime.

## Environment

Listed in `.env.example`. `DIRECT_URL` (unpooled) is used by Prisma migrations, `DATABASE_URL` (pooled) by the app. Dev-only e-mail login exists when `NODE_ENV=development`.

## Run and check

`npm run dev`, `npm run typecheck`, `npm run lint`, `npx vitest run` (103 tests; the money-path ones run against the database with their own seeded user, deleted afterwards), `npm run build`.

Dependency audit: production dependency scan reports zero findings after targeted mysql2/deepmerge-ts overrides. Five high findings remain in the development lint/glob chain via braces; the current advisory lists no patched version. See the audit document for sources and compatibility checks.

## Account management follow-up

Profile thumbnails are private normalized 256px WebP stored with the user; new drafts and production views consume saved defaults. The access limiter serializes same-key concurrent requests. See `docs/qa/2026-10-04-user-audit.md` for the whole-app audit and `docs/research/platform-benchmark-and-execution.md` for the research-led execution plan.

User token versions invalidate JWT sessions on every authenticated request after global sign-out; legacy tokens remain valid only at version zero. Account exports select owned profile, character briefs, media links and ledger amounts, excluding tokens and provider internals. Migration `20261004090000_account_sessions` adds the version column.

Content archival is soft: media and ledger are retained. It uses the same per-user row lock as generation starts, rejects RUNNING steps and prevents new paid starts while archived. The dashboard shows active production only; account production counts show active items. Character tabs link to the single creation form and the paginated filtered content list.

Connections now distinguishes Higgsfield and private reference-storage configuration from verified live availability.

## Shared UI refresh

The header now separates creation/account actions from horizontally scrollable page navigation, with persistent light/dark theme switching and an accessible native creation dialog linking to characters, production and Trends. The dashboard prioritizes the studio, new productions, Trends and templates. Mobile retains the full navigation sheet; balance is accessible through the account menu on narrow screens. Theme changes reuse shared tokens and local browser storage.

## Simplification audit

Account now focuses on name/photo/email and a compact referral card. Removed duplicated dashboard counts, rolling reservation totals, private-only bio and production defaults from the account UI. Existing stored preferences are preserved when saving only the name. Session revocation/export remain available through disclosures. No destructive schema changes. Character cards show selected portraits; identity editing separates optional visual details. Blank production creation hides optional script; library import is secondary; production actions are grouped. Shared inputs and character tabs meet 44px touch targets. Balance history now paginates 25 owned entries instead of truncating at 100.

Validation for the simplification pass: 103 tests in the full suite plus the new rendered balance-pagination integration test passed (104 total); typecheck, lint and production build passed. Browser review covered 14 authenticated route/view combinations at desktop and 390px. No real generation or charges.
