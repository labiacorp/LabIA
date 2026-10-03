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
- no worker: the page polls `/api/influencers/[id]/refresh`, which checks fal once per running step; any error counts and only the third one fails the step and refunds unused reservation. Metadata failure keeps the remaining reservation as cost_unknown for manual reconciliation. Completed video blocks remain charged after later failure. Every persisted not_submitted phase can be resumed by refresh; submitting/unknown phases are never automatically resent.
- `FAL_MOCK=1` (dev/test only, ignored in production) swaps fal for a fake provider with real prices; prompt markers `[mock-fail]` and `[mock-submit-error]` simulate failures.

## Access

`LABIA_ACCESS_CODE` + `AUTH_SECRET` gate sign-in (signed cookie, 8 tries/10 min/IP in Postgres, fails closed in production when unset); the check also runs in the Auth.js `signIn` callback. `ALLOWED_EMAILS` is an optional extra restriction.

## Data (`prisma/schema.prisma`)

User, Influencer (with `visualSignature`), Content, Step (`kind CHARACTER` belongs to an influencer; content IMAGE uses the existing contentId relation; `operationKey`, `submissionState`), Asset (`role` SHEET/FRONT/PROFILE/DETAIL), LedgerEntry, RateLimitEvent. Balance = sum of `LedgerEntry.deltaBrl`; top-ups are manual: `npx tsx scripts/ledger.ts topup <email> <brl>`.

## Not built yet

- A real generation has never run from v2 (only the fake provider). First one needs the R$ estimate shown and the owner's ok; `FAL_KEY` is set locally and on Vercel; fal media URLs are stored as returned (copy to Vercel Blob later; the `/edit` price is assumed equal to the base model until confirmed).
- Audio upload, voice and lip sync (V1 audio upload remains to port; model choice and Blob token are pending).
- Content IMAGE is runnable from the latest completed FRONT portrait (nano-banana-2/edit, 1K, content aspect ratio). The existing step is reserved and submitted once, with a scene prompt, cost approval, balance check, polling, preview and content-linked library asset. Each content step runs once; retry/regeneration UI is not built yet. SCRIPT is still a placeholder. VIDEO reserves three 5s Kling blocks and advances a persisted chain: generation -> fal FFmpeg metadata with extract_frames -> continuation from end_frame_url. Actual cost uses each measured duration and V1 pricing (including the 5s minimum). ASSEMBLY queues fal merge-videos with the persisted clip order and moves the content to REVIEW. Metadata and merge are listed at $0/compute second in official fal docs (2026-10-03); no real calls have verified their outputs or invoice. The content page shows the estimate of a 15s reel without voice (one 1K scene image + three 5s Kling blocks, `src/lib/content-plan.ts`, about R$ 5.89 at 5.21); the script step has no model or price yet.
- Canvas (planned as a second view of the same steps), library filters, MCP, payments, terms and privacy text, CI, Vercel env for v2.

## Environment

Listed in `.env.example`. `DIRECT_URL` (unpooled) is used by Prisma migrations, `DATABASE_URL` (pooled) by the app. Dev-only e-mail login exists when `NODE_ENV=development`.

## Run and check

`npm run dev`, `npm run typecheck`, `npm run lint`, `npx vitest run` (41 tests; the money-path ones run against the database with their own seeded user, deleted afterwards), `npm run build`.
