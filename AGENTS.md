# LabIA

Content pipeline for AI influencers, sold as one monthly subscription (R$ 49,90) that grants credits; every generation shows its credit cost before and after (Next.js 16, Neon, Prisma 7, Auth.js, fal.ai). First product of a larger all-in-one; the goal now is to validate niche and business model. Owner: Felipe Zilli. Diego Pozzer: market and distribution.

This file is identical to `AGENTS.md` (read by Codex). Edit one, mirror the other.

## Rules

- Everything in the repo is in English. The product UI and customer-facing copy are in Brazilian Portuguese (PT-BR). Chat with Diego and Felipe is in PT-BR.
- The code is the source of truth; `PROJECT_STATUS.md` is the short current-state snapshot. Update it in the same commit as any behavior change.
- Branches and sync: see "Branches and sync" below. It is the same for Diego, Felipe and every agent (Claude, Codex); follow it exactly so the two machines never drift.
- Autonomy: work freely on `dev` without asking: commit, push, merge task branches into `dev`, pull/rebase local commits, delete dead code and run mock (`FAL_MOCK=1`) flows. Still confirm first: anything into `main`, a real paid call (say why, the scope and the max R$ first; the real cost after), Production env vars, the Production ledger, and destructive operations on real data.
- Work in small blocks and commit at the end of each one. Commit with explicit paths, never `git add -A`.
- Money-moving server actions recompute the price on the server. Every charge is whole credits (`chargeBrl()`), so each ledger row is a multiple of `CREDIT_BRL` and the rows add up to the balance; the raw provider cost lives on the step (`actualCostBrl`); the UI shows credits (`src/lib/plan.ts` holds price, credits per month and the credit value).
- "It works" only after running it (test or real call). UI changes: check them in the browser at about 390px and desktop.
- Before calling any UI done, run it through `PRODUCT_REVIEW_LENS.md` (look at the screenshot first).
- UI/UX: follow the design reference in `design/reference/` (Claude Design handoff: `LabIA Design System.dc.html`, `LabIA Telas.dc.html`, `LabIA Telas - Casa e Acesso.dc.html`, `LabIA Header.dc.html`, tokens and components in `handoff/`, application map and copy rules in `handoff/MAPA-DE-APLICACAO.md`). The current build is too generic: improve layouts, states (loading, empty, error), header with the cost chip and mobile sheet, and PT-BR copy using it. It was drawn for an earlier information architecture (projects and flows), so adapt it to Influencers > Content > Steps instead of copying screens literally. Keep colors, type and spacing in the tokens so a later rebrand stays a token change. To view the mockups: `python3 -m http.server 4100 --directory design/reference` and open the `.dc.html` files.
- Tests that touch the database seed their own user and delete it in `afterAll`; never drive or edit real data.
- Never commit or print secrets. Keys live in `.env.local`; `.env.example` lists the required ones.
- Prefer deleting or reusing to adding: Leaner code, then stdlib, then an installed dependency, then new code. Do not optimize what should not exist.
- Handoffs: write `.handoff/report.md` (gitignored) at the end of a session: commits, what was verified and how, what was not, decisions, money spent, open questions, next step.

## Branches and sync

Diego and Felipe work at the same time, each with an agent. One flow for everyone:

1. **Start of every session, before reading or editing code:** `git switch dev && git pull origin dev`. The other person (or their agent) may have pushed minutes ago. Pull again before every push.
2. **`dev` is the shared working branch and the only preview:** all work lands here. Every push to `dev` makes the Vercel Preview (`labia-git-dev-labiacorp-5727.vercel.app`, LabIA Dev database). That preview is where things are checked; other branches never deploy (`vercel.json` `git.deploymentEnabled`).
3. **`main` is production:** every push deploys labia.studio. Nobody works on it directly. When a founder says "puxa/sobe para a main", it means release to the web now: merge `dev` into `main` and push. No new preview, no extra review step: the preview on `dev` was the check. Afterwards fast-forward `dev` to `main` so both point at the same commit.
4. **Task branches are short and optional:** `diego/<task>` or `felipe/<task>` from `dev`, merged back into `dev` (`--no-ff`) as soon as the task is done, then deleted locally and on origin. Small changes can go straight to `dev`. No branch lives for days.
5. **Updating:** `git pull --rebase origin dev` only rebases your own unpushed commits; never rewrite history that is already on origin (no force-push to `dev` or `main`). On a conflict keep both changes; when a screen was redesigned by the other side, keep the new layout and put your feature back into it.
6. **Before every push to `dev`:** `npm run typecheck && npm run lint && npx vitest run && npm run build`, plus `npm run test:e2e` when UI changed. Do not run `build` while a `next dev` runs in the same folder (Turbopack panics and pages reload in a loop).
7. **Local testing is mock by default:** `FAL_MOCK=1 ALLOWED_EMAILS= npx next dev -p 3100`, then "Entrar sem Google" with any test e-mail. Only one `next dev` per folder.
8. **Migrations:** hand-written in `prisma/migrations/` (see Gotchas) and named in the commit message. Apply to LabIA Dev before pushing to `dev`. The production build runs `prisma migrate deploy` (`vercel.json`), so Prod migrates when `main` deploys; never run migrations against Prod by hand.
9. **Commits:** small, with explicit paths (never `git add -A`), `PROJECT_STATUS.md` updated in the same commit as any behavior change. Say in the message what changed and why, so the other side understands it after a pull.
10. **Design source:** Claude Design project "LabIA brand directions", file `LabIA App.dc.html`. UI follows it; anything missing from it is asked, not invented.

## Gotchas

- `prisma migrate dev` refuses non-interactive shells: hand-write `prisma/migrations/<ts>_name/migration.sql`, then `npx prisma migrate deploy` and `npx prisma generate`. `prisma format` realigns columns, so scripted edits of `schema.prisma` must match the current text.
- `Button asChild` (Radix Slot) breaks in server components with React 19: use `buttonVariants` on a `<Link>`.
- `CostChip` states `free`, `estimated` and `actual` need a numeric `value` (`free` takes `0`), otherwise it shows "A calcular".
- `FalProvider.waitForResult` blocks; use `checkResult`. Next 16: `params` and `searchParams` are Promises; read `node_modules/next/dist/docs` for unfamiliar APIs.
- A client component must never import a server module, even for a constant: `password-form.tsx` importing `src/lib/password.ts` shipped `node:crypto` and a module-level scrypt hash to the browser. Shared constants live in import-free modules (`password-rules.ts`, `consent.ts`).
- Every `/admin` server action starts with `await requireOwner()` (a layout does not protect an action; `admin/actions.test.ts` checks it). Owners are granted only with `scripts/owner.ts`.
- `npm run test:e2e` runs its own `next dev` on port 3100 with `FAL_MOCK=1`; never point it at a server on 3000. Specs seed through `tests/helpers.ts` (`sql` over `pg`: the Prisma 7 client is ESM-only and Playwright loads CommonJS) and delete their accounts in `afterAll`.
- Production migrates in its own build (`vercel.json` runs `prisma migrate deploy` when `VERCEL_ENV=production`); Preview builds do not, so a new migration must be applied to LabIA Dev before pushing `dev`. `prisma.config.ts` reads `DIRECT_URL` before `DATABASE_URL`: to point a Prisma command at another database, override both.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
