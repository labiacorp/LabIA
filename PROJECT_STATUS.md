# LabIA: current state

Generated from the code on 2026-10-03 (commit `38b7d01`, "v1"). Describes what exists, nothing else: no history, no plans. If this file and the code disagree, the code wins; fix this file in the same commit as the change.

## What it is

Web app to generate images and videos with AI APIs on a node canvas, grouped into projects, with the cost shown before and after each run. UI in PT-BR.

## Stack

Next.js 15 (App Router) + TypeScript + Tailwind, Supabase (Postgres, Auth, Storage), Prisma 6, pg-boss queue, React Flow canvas, fal.ai (main provider), OpenAI image through a local Codex executor, Resend for auth e-mails. Deploy: Vercel; a push to `main` deploys to production and runs `prisma migrate deploy` first (`vercel.json`).

## Screens

Public: landing `/`, `/acesso` (shared access code), `/entrar`, `/criar-conta` (+ code, confirm, resend), `/esqueci-a-senha`, `/redefinir-senha`, `/sem-acesso`.
Logged in: `/fluxos` and `/fluxos/[flowId]` (canvas), `/projetos` and `/projetos/[projectId]`, `/biblioteca`, `/criar`, `/conexoes`. Admin: `/admin/convites`. Reference: `/design-system`.
API under `app/api/`: flows (runs, cost, validate-connection, node-definitions), projects (+ assets), assets/upload, generations, provider-connections, executors (pairing, heartbeat), `mcp`.

## Canvas nodes (`lib/flows/`)

prompt, text, text-input, note, image-generation, text2video, video-generation, video-extend, video-assembly, asset-input, asset-output. Runs go through a queue; a signed cost quote is required before execution (`execution-confirmation.ts`).

## Data (`prisma/schema.prisma`)

Workspace, WorkspaceMember (OWNER/MEMBER), Invite, Profile, RateLimitEvent, Brand, Project (IMAGE/VIDEO; DRAFT, IN_PROGRESS, REVIEW, APPROVED, ARCHIVED), Flow, FlowRun, FlowRunNode, ExecutionConfirmation, Generation, Asset, ProviderConnection, ProviderCapability, ExecutorPairing. 3 migrations, all closing the tables to Supabase's public API (RLS forced, no policy): keep that pattern.

## Accounts and access

- Every account gets its own workspace on signup and operates alone (`WorkspaceMember` is the gate; no membership means no access). `middleware.ts` protects every route by default; public paths are listed there on purpose.
- A shared access code (`LABIA_ACCESS_CODE`) sits in front of login and signup forms. `LABIA_SIGNUP_MODE`: `open` (default) or `invite`.
- New workspaces cannot spend (`spendEnabled=false`); the admin enables it. Without it only local, free nodes run.
- Google login exists in code, never exercised for real. Rate limits and lockout live in Postgres.
- Decided, not built: a shared workspace (inviting another person) is a higher-plan feature; the basic plan is a single user.

## Environment variables

Listed in `.env.example`. Without the Supabase and database ones the app locks everyone out. Production signup also needs `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `LABIA_COOKIE_SECRET`, `LABIA_ACCESS_CODE`, `LABIA_BOOTSTRAP_OWNER_EMAIL`, `LABIA_ADMIN_EMAILS`.

## Run and test

- `npm ci`, `.env.local` from `.env.example`, `npm run dev`.
- Local login without touching production: Supabase CLI local stack, `npx prisma migrate deploy` (the Prisma CLI reads `.env`, not `.env.local`), `npm run dev:seed-auth`. Confirmation e-mails land in Mailpit (`http://127.0.0.1:54324`).
- Checks: `npm run typecheck`, `npm run lint`, `npx vitest run` (70 files, 389 tests), `npm run build`.
- `npm run worker` processes the queue and **can spend real money** (fal.ai). Never start it without an estimate in R$ and the owner's ok.
- Tests do not prove real generation quality.

## Known gaps (verified in code)

- No terms or privacy text; the signup checkbox links to nothing.
- No CAPTCHA on the public signup (honeypot and Postgres rate limits only).
- No CI on GitHub: nothing enforces typecheck or tests before a push to `main`.
- MCP tools answer with a login error until wrapped in `runWithExecutionScope` (`lib/mcp/`).
- No per-user spend cap, account screen (password change) or 2FA.
- Production setup (Supabase project, e-mail domain, Vercel variables) is not verifiable from the repo.
