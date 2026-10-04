# LabIA: current state

Branch `v2`, rewritten from scratch on 2026-10-03. Describes what exists, nothing else. If this file and the code disagree, the code wins; fix this file in the same commit as the change.

## What it is

A pipeline to produce content with AI influencers: Influencer (face, niche, tone) > Content (one piece) > Steps (script, image, video, final assembly). UI in PT-BR. Cost is quoted before and recorded after each step.

## Stack

Next.js 16 (App Router, Server Actions) + TypeScript + Tailwind 4 (legacy `tailwind.config.ts` via `@config`), Prisma 7 on Neon (`@prisma/adapter-neon`), Auth.js v5 (Google only, JWT sessions, closed beta by `ALLOWED_EMAILS`), fal.ai for generation. Design system: tokens and `components/ui` from the Claude Design handoff (`Proposta LabIA com Design System/`, 2026-10-02).

## Screens (`src/app`)

`/acesso` (shared access code), `/login`, `/painel` (dashboard), `/conta` (editable display name and sign-out), `/influenciadores` (owned character list and search), `/conteudos` (owned production list, search and status filters), `/saldo` (available balance and latest 100 ledger entries), `/` (primary influencer studio: appearance builder, presets/sheet previews, owned characters, motion briefs, history), `/influencers/new` (redirect to studio), `/i/[id]` (tabs: Conteúdos, Personagem, Biblioteca, Perfil), `/i/[id]/c/[contentId]` (the pipeline, one card per step). API: `POST /api/influencers/[id]/refresh` (polls running jobs), `/api/auth/*`.

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
- Platform shell: active desktop navigation and accessible native mobile/account dialogs; dashboard with account-scoped counts and recent productions; editable account display name retained on subsequent sign-in; influencer/content searches and content-status filters; read-only balance and ledger. Lists show the latest 100 matches and disclose the limit. Shared loading/error states and empty/filter-empty states. The studio remains at `/`; the wordmark opens `/painel`.
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
4. **Complete the pipeline.** Real SCRIPT step (needs the founders: user-written vs AI-written, and the model), retry/regeneration of any step, reuse clips of a failed chain, download the final video, archive/delete content and influencers.
5. **Management screens.** Global library with filters (V1 has them), authorized manual top-up management (balance/extract UI is read-only), per-user spend limit, cost-per-piece report, and pagination beyond the disclosed 100-item list limits. Influencer/content editing and archiving remain to build.
6. **Canvas** as a second view of the same steps (port V1 pieces: typed handles, invalid-edge hint, palette by area).
7. **UI/UX pass from the design reference.** Continue the influencer detail and production screens, global library and states (loading, empty, error) using `design/reference/` and its `MAPA-DE-APLICACAO.md` copy rules, adapted to Influencers > Content > Steps. Can start now, no decisions needed.
8. **Finish.** Terms and privacy pages, mobile pass, optional MCP.

Not now: payments, self-service signup, locale currency, auto-posting, Cloudflare.

Unverified until the founders run real generations by hand: real fal outputs and invoices (`/edit` price is assumed equal to the base model; FFmpeg metadata/merge are listed at $0), face continuity across clips, and fal media URL lifetime.

## Environment

Listed in `.env.example`. `DIRECT_URL` (unpooled) is used by Prisma migrations, `DATABASE_URL` (pooled) by the app. Dev-only e-mail login exists when `NODE_ENV=development`.

## Run and check

`npm run dev`, `npm run typecheck`, `npm run lint`, `npx vitest run` (50 tests; the money-path ones run against the database with their own seeded user, deleted afterwards), `npm run build`.
