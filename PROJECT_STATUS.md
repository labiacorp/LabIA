# LabIA: current state

Branch `v2`, rewritten from scratch on 2026-10-03. Describes what exists, nothing else. If this file and the code disagree, the code wins; fix this file in the same commit as the change.

## What it is

A pipeline to produce content with AI influencers: Influencer (face, niche, tone) > Content (one piece) > Steps (script, image, video, final assembly). UI in PT-BR. Cost is quoted before and recorded after each step.

## Stack

Next.js 16 (App Router, Server Actions) + TypeScript + Tailwind 4 (legacy `tailwind.config.ts` via `@config`), Prisma 7 on Neon (`@prisma/adapter-neon`), Auth.js v5 (Google only, JWT sessions, closed beta by `ALLOWED_EMAILS`), fal.ai for generation. Design system: tokens and `components/ui` from the Claude Design handoff (`Proposta LabIA com Design System/`, 2026-10-02).

## Screens (`src/app`)

`/login`, `/` (influencers), `/influencers/new`, `/i/[id]` (tabs: Conteúdos, Biblioteca, Perfil), `/i/[id]/c/[contentId]` (the pipeline, one card per step).

## Data (`prisma/schema.prisma`)

User, Influencer, Content, Step, Asset, LedgerEntry. Balance is the sum of `LedgerEntry.deltaBrl`; top-ups are manual.

## Not built yet

- Generation: nothing calls fal.ai yet. Plan: `fal.queue.submit` with `webhookUrl`, result received on a route that verifies the ED25519 signature and is idempotent. No worker.
- Cost quote and confirmation per step; ledger spend/refund.
- Face reference upload (Vercel Blob), library content, voice, final assembly (`fal-ai/ffmpeg-api/merge-videos`).
- Payments, terms and privacy text, CI, Vercel project/env for v2.

## Environment

Listed in `.env.example`. `DIRECT_URL` (unpooled) is used by Prisma migrations, `DATABASE_URL` (pooled) by the app. Dev-only e-mail login exists when `NODE_ENV=development` and is never registered in a production build. Old fal.ai model catalog and pricing worth reusing: `git show main:lib/providers/fal-models.ts`.

## Run and check

`npm run dev`, `npm run typecheck`, `npm run build`. No tests yet.
