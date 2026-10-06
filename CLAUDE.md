# LabIA

Content pipeline for AI influencers, sold as one monthly subscription (R$ 49,90) that grants credits; every generation shows its credit cost before and after (Next.js 16, Neon, Prisma 7, Auth.js, fal.ai). First product of a larger all-in-one; the goal now is to validate niche and business model. Owner: Felipe Zilli. Diego Pozzer: market and distribution.

This file is identical to `AGENTS.md` (read by Codex). Edit one, mirror the other.

## Rules

- Everything in the repo is in English. The product UI and customer-facing copy are in Brazilian Portuguese (PT-BR). Chat with Diego and Felipe is in PT-BR.
- The code is the source of truth; `PROJECT_STATUS.md` is the short current-state snapshot. Update it in the same commit as any behavior change.
- Branches: `main` is production (every push deploys); founders work and push straight to `main` (the `dev` branch rule is retired). Task branches `diego/<task>` / `felipe/<task>` are optional and merge into `main`.
- Autonomy: work freely on `main` without asking: commit, push, merge task branches, pull/rebase, delete dead code and run mock (`FAL_MOCK=1`) flows. Before pushing run `npm run typecheck`, `npm run lint`, `npx vitest run` and `npm run build`. Still confirm first: a real paid call above R$ 5 (show the R$ estimate first, the real cost after) and destructive operations on real data.
- Work in small blocks and commit at the end of each one. Commit with explicit paths, never `git add -A`.
- Money-moving server actions recompute the price on the server. The ledger stays in reais of provider cost; the UI shows credits (`src/lib/plan.ts` holds price, credits per month and the credit value).
- "It works" only after running it (test or real call). UI changes: check them in the browser at about 390px and desktop.
- Before calling any UI done, run it through `PRODUCT_REVIEW_LENS.md` (look at the screenshot first).
- UI/UX: follow the design reference in `design/reference/` (Claude Design handoff: `LabIA Design System.dc.html`, `LabIA Telas.dc.html`, `LabIA Telas - Casa e Acesso.dc.html`, `LabIA Header.dc.html`, tokens and components in `handoff/`, application map and copy rules in `handoff/MAPA-DE-APLICACAO.md`). The current build is too generic: improve layouts, states (loading, empty, error), header with the cost chip and mobile sheet, and PT-BR copy using it. It was drawn for an earlier information architecture (projects and flows), so adapt it to Influencers > Content > Steps instead of copying screens literally. Keep colors, type and spacing in the tokens so a later rebrand stays a token change. To view the mockups: `python3 -m http.server 4100 --directory design/reference` and open the `.dc.html` files.
- Tests that touch the database seed their own user and delete it in `afterAll`; never drive or edit real data.
- Never commit or print secrets. Keys live in `.env.local`; `.env.example` lists the required ones.
- Prefer deleting or reusing to adding: Leaner code, then stdlib, then an installed dependency, then new code. Do not optimize what should not exist.
- Handoffs: write `.handoff/report.md` (gitignored) at the end of a session: commits, what was verified and how, what was not, decisions, money spent, open questions, next step.

## Gotchas

- `prisma migrate dev` refuses non-interactive shells: hand-write `prisma/migrations/<ts>_name/migration.sql`, then `npx prisma migrate deploy` and `npx prisma generate`. `prisma format` realigns columns, so scripted edits of `schema.prisma` must match the current text.
- `Button asChild` (Radix Slot) breaks in server components with React 19: use `buttonVariants` on a `<Link>`.
- `CostChip` states `free`, `estimated` and `actual` need a numeric `value` (`free` takes `0`), otherwise it shows "A calcular".
- `FalProvider.waitForResult` blocks; use `checkResult`. Next 16: `params` and `searchParams` are Promises; read `node_modules/next/dist/docs` for unfamiliar APIs.
- A client component must never import a server module, even for a constant: `password-form.tsx` importing `src/lib/password.ts` shipped `node:crypto` and a module-level scrypt hash to the browser. Shared constants live in import-free modules (`password-rules.ts`, `consent.ts`).
- Every `/admin` server action starts with `await requireOwner()` (a layout does not protect an action; `admin/actions.test.ts` checks it). Owners are granted only with `scripts/owner.ts`.
- `npm run test:e2e` runs its own `next dev` on port 3100 with `FAL_MOCK=1`; never point it at a server on 3000. Specs seed through `tests/helpers.ts` (`sql` over `pg`: the Prisma 7 client is ESM-only and Playwright loads CommonJS) and delete their accounts in `afterAll`.
- Pushing to `main`: if `prisma/migrations` gained anything, run `npx prisma migrate deploy` against LabIA Prod FIRST, then push. The build does not migrate, and code ahead of its schema breaks production.
