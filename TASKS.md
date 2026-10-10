# LabIA: task board

Source: founders' call 2026-10-07 (Gemini notes) plus the Playwright run that created an influencer and content. Two lanes so Diego's and Felipe's agents work at the same time without touching the same files.

## How agents use this file

1. Start of session: `git switch dev && git pull origin dev`, then read this file.
2. **Felipe does everything** (Diego's weekly quota is spent, 2026-10-07). Both lanes below are Felipe's. Work lane F first (generation and money paths), then lane D, then S1. Diego is out of the queue until further notice; he only reviews.
3. Take the first unchecked task, top to bottom. The lanes keep their owned files so a second person can join later without conflicts.
4. When done: tick the box, append the commit hash, update `PROJECT_STATUS.md`, all in the task's commit. Push `dev` in batches (CLAUDE.md "Branches and sync").
5. Blocked or a decision needed: write `BLOCKED: <question>` under the task, commit it, move to the next task.
6. Copy language: new or changed UI copy is in English (decision 2026-10-07). Do not translate untouched screens; that is task S1.

## Already done (no action)

- Git flow main/dev/task branches documented in CLAUDE.md and AGENTS.md (c656dda, 433fc93, c163d86).
- GitHub branches cleaned: only `dev` and `main` on origin.
- Credit value: 1 credit = R$ 0,05 (`src/lib/plan.ts`).
- Script/idea limit 10.000 chars (`src/lib/limits.ts`); Integrations moved into Profile, export row removed; bundle networks active again (Felipe, 2026-10-07), Bluesky "Em breve"; approving a face now also makes the side portrait, and the ready page shows front, side and sheet.

## Lane D: shell, account, integrations screens, UI polish (Felipe, after lane F)

Owns: `src/app/(app)/layout.tsx` and nav/header components, `src/app/(app)/conta/`, `src/app/(app)/integracoes/`, `src/app/(app)/conexoes/`, `src/components/ui/`, `src/app/globals.css`, `tailwind.config.ts`, `src/app/api/mcp/`.

- [ ] **D0. Consent before sign-in, one checkbox.** Today the "Antes de começar" screen (`src/app/consentimento/`, gate in `src/app/(app)/layout.tsx`, fields in `src/lib/consent.ts`) appears only after Google sign-in, so a user signs in and then has to decide to agree or leave, which makes no sense.
  - Move the agreement to before authentication: on `/login` and `/criar-conta`, show the checkbox next to the Google button and the e-mail form; the Google button stays disabled until it is ticked.
  - One checkbox only: "I'm 18 or older and I accept the Terms of Use and the Privacy Policy" (links to `/termos` and `/privacidade`). Remove the synthetic-media and no-real-people checkboxes (`CONSENT_FIELDS` becomes `[CONSENT_FIELD]`); keep the synthetic-media notice in the Terms text instead.
  - Google flow: the checkbox is read before redirecting to Google (cookie or `state`), and the server records `consentAcceptedAt` and `consentTermsVersion` on first sign-in, so Google users never see the post-login screen. Check how Auth.js creates the user and record consent there. E-mail sign-up already has its own checkbox: make it the same single one.
  - Existing accounts with `consentAcceptedAt` null that were created after `CONSENT_TRACKING_SINCE` keep the old gate, now with the single checkbox, as a fallback. Bump `CURRENT_TERMS_VERSION` only if `/termos` text changes (add "18 or older" there if missing).
  - Tests: the consent action test, an e2e for sign-in blocked without the tick, and the Google path with the mock "Entrar sem Google". Check at 1280 and 390. Copy in English.
- [x] **D1. Navigation on top.** Move the left sidebar nav into a top bar (keeps the cost chip and the mobile sheet). Check 1280 and 390. Done 2026-10-07 (felipe/models-layout-prompts), sizes cut about 15% at the same time.
- [ ] **D3. Google connection.** In Conta, Google shows "desconectado" with nothing to click. Make it connect (Auth.js account linking) or show the real state. Fix the root cause, not the label.
- [ ] **D5. Visual pass.** Shrink the giant warnings on the content/step screens to inline notes; fix contrast; the credit counter on the video step (step 03) is white text on green, unreadable: fix it in `CostChip`/tokens, not per screen. Run `PRODUCT_REVIEW_LENS.md`.
- [ ] **D6. MCP.** After D1-D5. Extend `/api/mcp` (currently read tools + free drafts). Scope to be written as a short plan in this file before coding.

## Lane F: generation, models, credits, publishing logic (Felipe, first)

Owns: `src/lib/` (generation, models, plan, social/publishing), `src/app/(app)/i/[id]/c/[contentId]/` (step forms), `src/app/(app)/conteudos/`, `src/app/(app)/trends/`, `src/app/(app)/modelos/`.

- [ ] **F1. Speech missing in the video.** The test video had only background music, no spoken script, and the first frame framed the image wrong. Find why the script never becomes speech (voice/lip sync step, or the model gets no audio input) and fix it. Mock first; a real call only with the founders' OK and a max R$.
- [ ] **F3. Max video length 60s.** Allow total duration up to 60 s (clips summed), priced and capped on the server.
- [ ] **F4. 16:9 format.** Add 16:9 next to the default 9:16 for image and video steps; price and model support per format.
- [x] **F5. Model picker shows name and price.** Every model option shows the model name and its credits per 5 s (video) or per image. Resolutions use standard names (480p, 768p, 1080p), never "0.5K". The user picks model and resolution explicitly on image and video steps. Name/price picker shipped on 2026-10-08 in main (`ad7ff94`).
  - Follow-up 2026-10-09: new content now exposes format and generation settings, saves validated choices in pending steps and allows editing the same untouched draft. Motion drafts also support editing model, quality, sound and source duration before generation. Local/mock browser checks passed on desktop and 390px; release is still pending. See PROJECT_STATUS.md.
- [ ] **F6. One approval, exact credits.** Remove double confirmations in creation and script generation; show the exact credit number before and after, no ambiguous ranges.
- [ ] **F7. X publishing.** Verify the X account connection end to end, then scheduling with suggested times (no pre-validation of content). Bundle networks are active (Felipe's decision, 2026-10-07); Bluesky stays "Coming soon".
- [x] **F8. TikTok trends import (research only).** Write `docs/research/tiktok-trends.md`: APIs, storage cost, import method, cron vs agent. No code. Done 2026-10-08, now also covers trending songs (Felipe). Needs the founders' answers listed at the end of the doc before any code.
- [x] **F9. Motion trim corrections and Standard models.** Keep the editor reachable after a four-second cut and navigation; add cancel and restore-original actions; preserve source audio and exact duration; include Kling 2.6 / 3 Standard Motion Control using verified published rates. Implemented and verified locally 2026-10-10: six desktop/mobile browser scenarios passed, plus independent H.264/AAC decoding. Release requested by Felipe; deployment verification is pending. Full local suite: 313 passed, 45 failed, 6 skipped; no paid generation. Existing Notion task: "Tendências: cortar o vídeo para teste barato, prompt detalhado e custo claro".

## Shared, last

- [ ] **S1. Full English UI sweep.** Translate every remaining PT-BR screen in one pass when both lanes are idle (touches every file, so nobody else edits UI meanwhile). PT-BR localization comes later.

## Founders, by hand (not for agents)

- Diego: send the screenshot with the integration error logs.
- Diego: create a fictional influencer selling a blue bag and post a test (real paid run).
- Felipe: Genjutsu business.
- Both: clean stale pages in Notion and turn new demands into blocks here.
