# LabIA

Pay-per-use AI image and video generation on a flow canvas (Next.js 15, Supabase, Prisma, fal.ai). Owner: Felipe Zilli. Diego: market and distribution.

This file is identical to `AGENTS.md` (read by Codex). Edit one, mirror the other.

## Rules

- Everything in the repo is in English. The product UI and customer-facing copy are in Brazilian Portuguese (PT-BR). Chat with Diego and Felipe is in PT-BR.
- The code is the source of truth. There are no status or history docs in the repo: read the code.
- Work on a branch. **A push to `main` is a production deploy**: run `npm run typecheck`, `npx vitest run` and `npm run build` first, and only merge with the owner's go-ahead.
- "It works" only after running it and checking from the outside (test, preview, real call).
- Show the estimated cost before and the real cost after every AI generation.
- Never commit secrets. Keys live in `.env.local`; `.env.example` lists the required ones.
- Commit with explicit paths, never `git add -A`.
- Current state of the app: `PROJECT_STATUS.md` (update it in the same commit as the change).
