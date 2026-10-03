# LabIA

Content pipeline for AI influencers, pay-per-use, with the cost shown before and after every generation (Next.js 16, Neon, Prisma 7, Auth.js, fal.ai). First product of a larger all-in-one; the goal now is to validate niche and business model. Owner: Felipe Zilli. Diego Pozzer: market and distribution.

This file is identical to `AGENTS.md` (read by Codex). Edit one, mirror the other.

## Rules

- Everything in the repo is in English. The product UI and customer-facing copy are in Brazilian Portuguese (PT-BR). Chat with Diego and Felipe is in PT-BR.
- The code is the source of truth; `PROJECT_STATUS.md` is the short current-state snapshot. Update it in the same commit as any behavior change.
- Branches: two long-lived branches. `main` is production and only receives finished work; today it still holds V1 (the deployed blueprint: read it with `git show main:<path>`, import its good pieces, never modify it). `v2` is the working branch (it becomes `develop` once V2 is promoted to `main`). Every task gets its own branch (`diego/<task>` or `felipe/<task>`) and enters the working branch by pull request; nobody pushes directly to `main` or to the working branch. Promoting the working branch to `main` is decided by both founders together. Before the first promotion, keep V1 reachable (tag or branch `v1-archive`) and make sure V2 has its own Vercel project and environment: a push to `main` is a production deploy. Never push, merge or deploy without the owner's go-ahead (then run `npm run typecheck`, `npx vitest run` and `npm run build` first).
- Work in small blocks and commit at the end of each one. Commit with explicit paths, never `git add -A`.
- Money: no real generation, top-up or paid call without the owner's explicit OK for that action and the estimate in R$ shown first; show the real cost after. Use `FAL_MOCK=1` (dev/test only) to exercise flows. Money-moving server actions recompute the price on the server.
- "It works" only after running it and checking from the outside (test, real call). A UI change is done only after looking at it in the browser (about 390px and desktop).
- UI/UX: follow the design reference in `design/reference/` (Claude Design handoff: `LabIA Design System.dc.html`, `LabIA Telas.dc.html`, `LabIA Telas - Casa e Acesso.dc.html`, `LabIA Header.dc.html`, tokens and components in `handoff/`, application map and copy rules in `handoff/MAPA-DE-APLICACAO.md`). The current build is too generic: improve layouts, states (loading, empty, error), header with the cost chip and mobile sheet, and PT-BR copy using it. It was drawn for V1's information architecture (projects and flows), so adapt it to V2 (Influencers > Content > Steps) instead of copying screens literally. Keep colors, type and spacing in the tokens so a later rebrand stays a token change. To view the mockups: `python3 -m http.server 4100 --directory design/reference` and open the `.dc.html` files.
- Tests that touch the database seed their own user and delete it in `afterAll`; never drive or edit real data.
- Never commit or print secrets. Keys live in `.env.local`; `.env.example` lists the required ones.
- Prefer deleting or reusing to adding: V1/Leaner code, then stdlib, then an installed dependency, then new code. Do not optimize what should not exist.
- Handoffs: write `.handoff/report.md` (gitignored) at the end of a session: commits, what was verified and how, what was not, decisions, money spent, open questions, next step.

## Gotchas

- `prisma migrate dev` refuses non-interactive shells: hand-write `prisma/migrations/<ts>_name/migration.sql`, then `npx prisma migrate deploy` and `npx prisma generate`. `prisma format` realigns columns, so scripted edits of `schema.prisma` must match the current text.
- `Button asChild` (Radix Slot) breaks in server components with React 19: use `buttonVariants` on a `<Link>`.
- `CostChip` states `free`, `estimated` and `actual` need a numeric `value` (`free` takes `0`), otherwise it shows "A calcular".
- `FalProvider.waitForResult` blocks; use `checkResult`. Next 16: `params` and `searchParams` are Promises; read `node_modules/next/dist/docs` for unfamiliar APIs.
