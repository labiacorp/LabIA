# LabIA: task board

Source: founders' call 2026-10-07 (Gemini notes) plus the Playwright run that created an influencer and content. Two lanes so Diego's and Felipe's agents work at the same time without touching the same files.

## How agents use this file

1. Start of session: `git switch dev && git pull origin dev`, then read this file.
2. Your lane: git author `Phill` = Diego (lane D). `Felipe Zilli` / `zilli26` = Felipe (lane F). Take the first unchecked task in your lane, top to bottom. Never take a task from the other lane; if yours is empty, take from "Shared, last".
3. Stay inside your lane's files. If a task needs a file the other lane owns, make the smallest change possible and say so in the commit message.
4. When done: tick the box, append the commit hash, update `PROJECT_STATUS.md`, all in the task's commit. Do not push only to tick a box (push in batches, CLAUDE.md "Branches and sync").
5. Blocked or a decision needed: write `BLOCKED: <question>` under the task, commit it, move to the next task.
6. Copy language: from now on, new or changed UI copy is in English (decision 2026-10-07). Do not translate untouched screens; that is task S1.

## Already done (no action)

- Git flow main/dev/task branches documented in CLAUDE.md and AGENTS.md (c656dda, 433fc93, c163d86).
- GitHub branches cleaned: only `dev` and `main` on origin.
- Credit value: 1 credit = R$ 0,05 (`src/lib/plan.ts`).

## Lane D: Diego (shell, account, integrations screens, UI polish)

Owns: `src/app/(app)/layout.tsx` and nav/header components, `src/app/(app)/conta/`, `src/app/(app)/integracoes/`, `src/app/(app)/conexoes/`, `src/components/ui/`, `src/app/globals.css`, `tailwind.config.ts`, `src/app/api/mcp/`.

- [ ] **D1. Navigation on top.** Move the left sidebar nav into a top bar (keeps the cost chip and the mobile sheet). Check 1280 and 390.
- [ ] **D2. Profile cleanup.** Move Integrações into Conta (profile) and out of the main nav. Remove the "Exportar meus dados" row (`conta/account-settings.tsx:38`); keep `/api/account/export` and point the privacy page to "ask by e-mail" (LGPD portability still needs a path). Password and e-mail change live in the profile; remove duplicated rows.
- [ ] **D3. Google connection.** In Conta, Google shows "desconectado" with nothing to click. Make it connect (Auth.js account linking) or show the real state. Fix the root cause, not the label.
- [ ] **D4. Only working networks are clickable.** Only X connects today. Instagram, TikTok, LinkedIn, Threads, YouTube, Facebook and Bluesky get a disabled card with a "Coming soon" tag instead of a button that fails.
- [ ] **D5. Visual pass.** Shrink the giant warnings on the content/step screens to inline notes; fix contrast; the credit counter on the video step (step 03) is white text on green, unreadable: fix it in `CostChip`/tokens, not per screen. Run `PRODUCT_REVIEW_LENS.md`.
- [ ] **D6. MCP.** After D1-D5. Extend `/api/mcp` (currently read tools + free drafts). Scope to be written as a short plan in this file before coding.

## Lane F: Felipe (generation, models, credits, publishing logic)

Owns: `src/lib/` (generation, models, plan, social/publishing), `src/app/(app)/i/[id]/c/[contentId]/` (step forms), `src/app/(app)/conteudos/`, `src/app/(app)/trends/`, `src/app/(app)/modelos/`.

- [ ] **F1. Speech missing in the video.** The test video had only background music, no spoken script, and the first frame framed the image wrong. Find why the script never becomes speech (voice/lip sync step, or the model gets no audio input) and fix it. Mock first; a real call only with the founders' OK and a max R$.
- [ ] **F2. Script and prompt limits.** Raise the 2000-char cap consistently: `conteudos/management.ts:16-17`, `i/[id]/c/[contentId]/management-actions.ts:20`, `script-form.tsx:13`, `creation-form.tsx:45`, `video-form.tsx:141`, `src/lib/content-generation.ts:33`, `src/lib/motion.ts:13`, `trends/motion-form.tsx:155`. One shared constant. Long pasted blocks also broke the "ficha" generation: check that path.
- [ ] **F3. Max video length 60s.** Allow total duration up to 60 s (clips summed), priced and capped on the server.
- [ ] **F4. 16:9 format.** Add 16:9 next to the default 9:16 for image and video steps; price and model support per format.
- [ ] **F5. Model picker shows name and price.** Every model option shows the model name and its credits per 5 s (video) or per image. Resolutions use standard names (480p, 768p, 1080p), never "0.5K". The user picks model and resolution explicitly on image and video steps.
- [ ] **F6. One approval, exact credits.** Remove double confirmations in creation and script generation; show the exact credit number before and after, no ambiguous ranges.
- [ ] **F7. X publishing.** Verify the X account connection end to end, then scheduling with suggested times (no pre-validation of content). Other networks stay "Coming soon" (D4).
- [ ] **F8. TikTok trends import (research only).** Write `docs/research/tiktok-trends.md`: APIs, storage cost, import method, cron vs agent. No code.

## Shared, last

- [ ] **S1. Full English UI sweep.** Translate every remaining PT-BR screen in one pass when both lanes are idle (touches every file, so nobody else edits UI meanwhile). PT-BR localization comes later.

## Founders, by hand (not for agents)

- Diego: send the screenshot with the integration error logs.
- Diego: create a fictional influencer selling a blue bag and post a test (real paid run).
- Felipe: Genjutsu business.
- Both: clean stale pages in Notion and turn new demands into blocks here.
