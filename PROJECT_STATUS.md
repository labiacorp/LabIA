# LabIA: current state

Production is `main`; integration is `dev` (see the branch rule in `CLAUDE.md`). V2 was rewritten from scratch on 2026-10-03. Describes what exists, nothing else. If this file and the code disagree, the code wins; fix this file in the same commit as the change.

## What it is

A pipeline to produce content with AI influencers: Influencer (face, niche, tone) > Content (one piece) > Steps (script, image, video, final assembly). UI in PT-BR. Cost is quoted before and recorded after each step.

## Stack

Next.js 16 (App Router, Server Actions) + TypeScript + Tailwind 4 (legacy `tailwind.config.ts` via `@config`), Prisma 7 on Neon (`@prisma/adapter-neon`), Auth.js v5 (Google only, JWT sessions, closed beta by `ALLOWED_EMAILS`), fal.ai for generation. Design system: tokens and `components/ui` from the Claude Design handoff (`Proposta LabIA com Design System/`, 2026-10-02).

## Screens (`src/app`)

`/acesso` (shared access code), `/login`, `/painel` (dashboard), `/conta` (profile/photo/bio and effective format/view preferences, owned usage totals, balance, rolling 30-day net reservations, private JSON export), `/conta/seguranca` (e-mail, password, Google status, sign out everywhere, delete account), `/admin` (owners only), `/verificar-email`, `/esqueci-senha`, `/redefinir-senha/[token]`, `/termos`, `/privacidade`, `/consentimento`, `/influenciadores` (owned character list and search), `/conteudos` (owned production list, 24-item pages, search, character/status filters and reversible archives), `/conteudos/novo` (free draft creation with owned character and 9:16/16:9/1:1 format), `/saldo` (available balance and latest 100 ledger entries), `/biblioteca` (global owned media, filters, 24-item pages, details and downloads), `/conexoes` (read-only integration readiness), `/` (primary influencer studio: appearance builder, presets/sheet previews, owned characters, motion briefs, history), `/influencers/new` (redirect to studio), `/i/[id]` (tabs: Conteúdos, Personagem, Biblioteca, Perfil), `/i/[id]/c/[contentId]` (editable title/brief when no generation is running, free script, pipeline steps/canvas, final review and downloads). API: authenticated `GET /api/assets/[id]/download`, `POST /api/influencers/[id]/refresh` (polls running jobs), `/api/auth/*`.

## Reusable drafts and referrals

- `/modelos` offers five original editable script starters and owned saved briefing/script snapshots. Save is idempotent per source production; reuse and duplication create fresh free pipeline steps without copying media, charges or approval. Personal models can be deleted without affecting their productions and are included in account export.
- Character profile selects and previews a completed owned FRONT portrait. Scene UI and execution use this explicit selection, including when newer portraits exist.
- `/conta#indicacoes` exposes a stable personal referral link and new-account count. `/r/[code]` captures first-touch attribution for 30 days; the sign-in creation branch attributes only new accounts. `/convite` explains beta restrictions. No financial reward, email sending or access-gate bypass. See `docs/research/referrals.md`.

## Motion recreation and imported references

`/trends` prepares parking/group, dance and custom motion briefs with an owned imported video and up to three ordered images. Import supports normalized JPEG/PNG/WebP and structurally validated MP4 H.264 (4–30s), maximum 4 MiB. Production uses private Vercel Blob; explicit development mock mode uses ignored local storage. Private previews enforce ownership, support ranges and expose short-lived provider links only at generation.

Genjutsu Motion Transfer uses the shared reservation/operation-key coordinator and asynchronous polling. Completed video appears in production review and the library. Real final cost stays unknown until verified; reservations are preserved for reconciliation. Mock output is clearly identified. Live Blob/Higgsfield integration remains unverified without credentials; the catalog contains recipes and requires the user's source video. Details: `docs/qa/2026-10-04-motion-recreation.md`.

## How generation works (`src/lib/generation.ts`)

Character kit = step 1 sheet (nano-banana-2, 2K, 3:2) then step 2 portraits front/profile/detail (nano-banana-2/edit, 1K, using the approved sheet as reference). Rules:
- the sheet (step 1) has a model/quality selector over seven text-to-image endpoints (`SHEET_DEFINITIONS` in `src/lib/providers/image-models.ts`, priced and validated on the server); the generated sheet shows its model and exact prompt. The text-to-image ids other than Nano Banana 2 are inferred from the audited edit ids and not yet confirmed against fal.ai (`npm run prices:check`); portraits still use Nano Banana 2 `/edit`;
- the character tab shows the real cost of each finished kit step and the kit total (`stepCost`/`kitSpent` in `src/lib/character.ts`); an unverified cost reads "indisponível", never R$ 0;
- the price is quoted by the provider layer (`src/lib/providers/`), shown in R$, and sent back with the approval; a changed price charges nothing;
- one `operationKey` per intent: a double submit or parallel requests never charge or send twice;
- the ledger reserves the price in the same transaction that creates the step (row lock per user, so no overspend); refund on failure;
- submit state `not_submitted -> submitting -> submitted | submission_unknown`; an ambiguous submit is never resent and keeps the reservation (`npx tsx scripts/ledger.ts refund <stepId> [verifiedActualBrl]` reconciles (VIDEO requires the verified total actual cost; concurrent reconciliation cannot refund twice));
- no worker: the page polls `/api/influencers/[id]/refresh`, which checks fal once per running step. After three errors, mocks refund unused reservation; real-provider errors keep it as cost_unknown for manual reconciliation because a read failure or policy rejection does not prove zero cost. Metadata failure also keeps the reservation. Completed video blocks remain charged after later failure. Persisted not_submitted phases can resume; a submitting phase older than five minutes becomes submission_unknown for manual reconciliation, never an automatic resend.
- `FAL_MOCK=1` (dev/test only, ignored in production) swaps fal for a fake provider with real prices; prompt markers `[mock-fail]` and `[mock-submit-error]` simulate failures.

## Access

`LABIA_ACCESS_CODE` + `AUTH_SECRET` gate sign-in (signed cookie, 8 tries/10 min/IP in Postgres, fails closed in production when unset); the check also runs in the Auth.js `signIn` callback. `ALLOWED_EMAILS` is an optional extra restriction.

## Accounts, owners and e-mail (2026-10-05)

Full plan and reasoning: `docs/account-and-owner-plan.md`; the audit it answers: `docs/qa/2026-10-05-account-audit-from-leaner.md`.

- **E-mail confirmation.** Password sign-up never signs in: it mails a link and a 6-digit code (`EmailToken`, hashed, single use, the latest of a purpose retires older ones) and the password provider refuses an unconfirmed address. Sign-up with a taken address answers the same and mails the owner instead. Google sign-ins bind `googleSub`, mark the address verified and drop a password nobody proved (closes the pre-account takeover). Password accounts created before the migration confirm like new ones; Google-only ones were backfilled as verified.
- **Password reset** (`/esqueci-senha`): 1-hour single-use link; also how a Google-only account gets a password; ends every session.
- **Acesso e segurança** (`/conta/seguranca`): change password (current one required; other sessions end), change e-mail (old address keeps working until the new one is confirmed from its own inbox, then sessions end and the old address is notified), delete account (typed EXCLUIR; refused while a step runs or has an unresolved cost, guard inside the delete; private uploads removed). Google-only accounts prove themselves with a Google sign-in from the last 5 minutes (`src/lib/reauth.ts`): one gate for the page, revealed when a locked row is tapped, plus an inline copy for a session that ages out mid-form.
- **Logout revokes**: "Sair" bumps `tokenVersion`, so it equals "sair de todos os navegadores".
- **Owners.** `User.role` OWNER, granted only with `npx tsx scripts/owner.ts grant <email>` (never by UI or env var), honoured only on a Google session (`src/lib/owner.ts`; the dev provider stands in locally). `/admin`: accounts with balances, manual top-up (two-step, idempotent per operation key, replaces `scripts/ledger.ts topup`), reconciliation of uncertain steps, and the `admin_actions` log. Every admin action calls `requireOwner()` first; a test enforces it. No founder account is an owner until someone runs the grant.
- **Terms and consent.** `/termos` and `/privacidade` are DRAFTS: legal entity, CNPJ and contact address are missing, and the image-rights/likeness clauses need the founders' and a lawyer's read. Password sign-up requires the checkbox; Google-created accounts accept once at `/consentimento` (enforced in the `(app)` layout). Bump `CURRENT_TERMS_VERSION` and `LEGAL_UPDATED_AT` (`src/lib/consent.ts`) by hand when the text changes; accounts created before `CONSENT_TRACKING_SINCE` are never asked and never backfilled.
- **E-mail is OFF in production** until both `RESEND_API_KEY` and `EMAIL_FROM` are set (`emailEnabled()`, no sending domain yet): password sign-up, password reset and e-mail change are hidden and refused; sign-in, Google and the rest keep working. `scripts/owner.ts grant` also confirms the account's address, which is how the founders' pre-existing password accounts (production) get in. Live in production since 2026-10-05: migrations applied to LabIA Prod and both founders granted owner (which also confirmed their addresses).
- **Login form** keeps the typed e-mail and password after a failed attempt (controlled fields: React 19 clears an uncontrolled form after every action) and the password field has a show/hide toggle (`PasswordInput`, `src/components/ui/password-input.tsx`). Local sign-in without a password: the development-only "Entrar sem Google" form with an `ALLOWED_EMAILS` address, opened on the `AUTH_URL` host (`127.0.0.1`).
- **E-mail sending**: Resend HTTP API (`src/lib/email.ts`). Production requires `RESEND_API_KEY`, `EMAIL_FROM` and `LABIA_PUBLIC_URL` (links are never built from the request Host). Development writes to `.handoff/outbox.jsonl`.

## Data (`prisma/schema.prisma`)

User, Influencer (with `visualSignature`), Content, Step (`kind CHARACTER` belongs to an influencer; content IMAGE uses the existing contentId relation; `operationKey`, `submissionState`), Asset (`role` SHEET/FRONT/PROFILE/DETAIL), LedgerEntry, RateLimitEvent. Balance = sum of `LedgerEntry.deltaBrl`; top-ups are manual: `npx tsx scripts/ledger.ts topup <email> <brl>`. `UNLIMITED_EMAILS` (the founders) skip the balance check; their spends are still recorded, and the header and `/saldo` show the real fal.ai credit instead (needs an ADMIN-scoped `FAL_ADMIN_KEY`, otherwise "Indisponível").

## Roadmap to a finished V2

Goal: a platform that is feature-complete, deployed and ready for the founders to test real models by hand. Building and testing here never runs a real generation (use `FAL_MOCK=1`). The UI must follow `design/reference/` (Claude Design handoff; see AGENTS.md): the current build is generic and must be improved from that reference, adapted to V2's structure. Keep everything in the tokens (`tailwind.config.ts`, `src/app/globals.css`, `src/components/ui`) so that a later rebrand by Claude Design is a token change.

### Awaiting review — 2026-10-05
- Content IMAGE now offers seven reviewed reference-capable endpoints: Nano Banana 2/Pro, Seedream 5.0 Lite/4.5, FLUX.1 Kontext Pro/Max and Qwen Image Max. Model > quality > scene; quality options show R$/image and the approved total is recomputed on the server. The owned FRONT portrait stays mandatory. Each request is capped to one output image, uses an immutable per-image price snapshot and reuses the existing reservation/idempotency/polling ledger. Character-kit models remain as configured. GPT Image 2.5 Flare and FLUX.2 variants were audited but are not activated by this block: token/input-output megapixel billing needs separate faithful quote/settlement rules. All verification is local/mock, not an authenticated provider run.
- Video selection is model-first: every registered model stays visible; quality lists only that model's supported resolutions. Controls follow model > audio > quality > duration. Resolutions are sorted ascending; toggling supported audio recomputes quality rates and the total. Quality options show R$/second. A native duration slider steps through supported durations only and updates the adjacent estimated clip total immediately; fixed-duration models show a fixed value. total cost remains next to approval. Fixed-quality APIs have a separate "Definida pelo modelo" choice. Token/clip equivalents are marked approximate, input-image surcharges remain separate, and source/date details are collapsed. No exchange-rate text or large price table is shown. `npm run prices:check` reads unit-price metadata for manual review; it never generates media or automatically overwrites catalog formulas.
- **V2-PROVIDERS — implementation finished locally, awaiting review.** Closed at Felipe's request on2026-10-04. Review and full-app testing planned for2026-10-05, before deciding on commit/integration into`v2`. Delivered:36 video models,7 reference-image models and pricing controls. See[`docs/provider-catalog-task.md`](docs/provider-catalog-task.md) for scope and retained follow-ups. Published for team visibility as draft[PR#5](https://github.com/labiacorp/LabIA/pull/5), branch`felipe/labia-v2-work`. Full-app review/integration remains scheduled for2026-10-05; merged into `main` on 2026-10-05 at Diego's request after resolving conflicts with the multi-provider generation code; no deployment authorized.
- Video is the first priority. The content video step now offers 36 I2V models: Grok 1.5/Lite, Seedance 2.5/US, Kling 2.5/3 Pro/3 Turbo Pro, Wan 2.5/2.6/3, Veo 3.1, LTX 2.5 Pro and Hailuo 2.3 Standard, MiniMax H3/Max/Max Turbo and Hailuo-02 Standard/Fast, PixVerse V6/C1, Vidu Q3/Q3 Turbo, Happy Horse 1.1 and Gemini Omni Flash 1.1, Vidu Q2 Pro/Turbo, Veo 3.1 Fast, Wan 2.1 Pro, Hailuo-02 Pro, Hailuo 2.3 Fast Standard, MiniMax Video-01/Director/Live and PixVerse 3.5/4/5 (verified5sconfigurations), plus the legacy three-clip Kling recipe. Model, duration, resolution and supported audio controls determine the displayed/server-recomputed quote. Native clips keep an immutable recipe/price snapshot, settle from measured metadata, and finalize by asset reuse at no extra provider charge. Discovery snapshot: 553 public video/processing entries across 12 pages; it is not an enabled-model list. Full catalog coverage remains a follow-up after this closed implementation block. The complete I2V audit fetched 107 public OpenAPI schemas out of 108 candidates (one404), and108 public pricing pages. These discovery files alone do not enable models. Other modalities/families and real-provider verification remain pending. Maintenance: [`docs/provider-model-maintenance.md`](docs/provider-model-maintenance.md).
- Ponytail review on 2026-10-03 removed the selector's dependence on catalog order: the legacy recipe resolves its configured Kling endpoint explicitly. The selector is shared by all influencer/content video pages; it is not an image, script or voice selector, and has not been deployed.

### Done
- Audit of legacy capabilities and read-only Leaner patterns: `docs/v2-platform-audit.md` maps verified legacy capabilities and remaining gaps. Added global library with owned server-side filters/pagination, correct image/video/audio previews, provenance, step cost and safe attachment downloads; editable character profile/category; free manual script feeding prompt defaults; canvas view of existing Steps (zoom, minimap, readable mobile layout, positions saved in this browser); final-video approval/adjustment/review. Missing provider credentials are rejected before reserving any balance. Raw provider errors are replaced with controlled UI copy and unknown actual costs remain unavailable. Login shows OAuth readiness/errors and validates development email; Connections reports configuration without claiming verified provider health.
- Platform shell: active desktop navigation and accessible native mobile/account dialogs; dashboard with account-scoped counts and recent productions; editable account display name retained on subsequent sign-in; influencer/content searches and content-status filters; read-only balance and ledger. Influencer and ledger lists show the latest 100 matches and disclose the limit; content lists have real pagination. Shared loading/error states and empty/filter-empty states. The studio remains at `/`; the wordmark opens `/painel`.
- Foundation: Next 16, Prisma 7 on Neon, Auth.js with Google, access code gate, Claude Design tokens and `ui` components.
- Character kit: sheet then front/profile/detail portraits (quoted in R$, idempotent, balance reserved under a row lock, refunds, ambiguous submit never resent, manual reconciliation via `scripts/ledger.ts`).
- Content pipeline: scene IMAGE from the FRONT portrait; VIDEO = three chained 5s Kling blocks (last frame via fal FFmpeg, measured duration cost); ASSEMBLY via fal merge-videos; content moves to REVIEW. All verified only with the fake provider (41 tests, desktop and 390px).
- Reel estimate on the content page (about R$ 5.89 without voice at 5.21).
- Primary studio, closely following the Higgsfield reference requested by Diego: 19 appearance groups stored in the character prompt, six editable briefs, character sheet dialog, account-scoped gallery/history and motion draft creation with the existing V2 pipeline. Registration/drafts are free; generation keeps the existing BRL approval. Public reference preview images are externally hosted and attributed. Photo upload, Genjutsu motion transfer and object replacement remain unimplemented. Details: `docs/references/higgsfield-influencer-studio.md`.
- Studio verification passed on GitHub. The reusable CI workflow is preserved separately on `useleaner/LabIA:diego/v2-ci`; adding it upstream requires a token with workflow scope or a maintainer merge through GitHub. Database integration tests need an isolated Neon database.
- Video model selection and native single-clip execution. Validation runs before debit; the exact submitted endpoint is persisted. Quote rules are captured for native/legacy recipes so later catalog/currency changes do not reinterpret their calculated settlement. Current evidence is mock/browser verification only, not a real provider invoice.

### To do (in blocks; each block is small, committed, and updates this file)
1. **Go live.** Done 2026-10-05: Vercel project `labia` (`main` deploys Production, other branches Preview), Neon "LabIA Prod" for Production and "LabIA Dev" for Preview and local, Google OAuth, private Blob store, CI. Remaining: a domain, then `EMAIL_FROM` (turns e-mail on), and `HF_CREDENTIALS`.
2. **Files that last.** Copy generated media from fal URLs to Vercel Blob; uploads (base photo, audio, an existing character sheet). Needs the founders: `BLOB_READ_WRITE_TOKEN` in `.env.local` and on Vercel.
3. **Voice and lip sync.** Research is in `docs/video-and-voice-research.md` (LatentSync after assembly recommended for cost; PixVerse and Sync Lipsync 2 are alternatives). Needs the founders: lip sync option, uploaded audio vs generated voice.
4. **Complete the pipeline.** Optional AI-written script (manual script is free and functional), safe retry/regeneration with attempt history and verified-clip reuse, durable uploads, and archive/restore for content/influencers. Final mock-video download and human review are implemented.
5. **Management screens.** Manual top-up management is done (`/admin`, owners only); remaining: per-user spend limit, cost-per-piece reporting and pagination beyond the disclosed 100-item influencer/content/ledger limits. Character profile editing is implemented; title/idea editing and reversible archives are implemented. Global library has filters and real pagination.
6. **Canvas extensions.** The second view of Steps is implemented. Persistent shared layout, arbitrary graph editing, typed connection validation, cycle prevention, palette and branched execution remain.
7. **UI/UX pass from the design reference.** Continue the influencer detail and production screens, global library and states (loading, empty, error) using `design/reference/` and its `MAPA-DE-APLICACAO.md` copy rules, adapted to Influencers > Content > Steps. Can start now, no decisions needed.
8. **Finish.** Terms and privacy pages exist as drafts (see Accounts above); legal review, mobile pass, optional MCP.
9. **Model/API catalog and provider extensibility (V2-PROVIDERS, in progress).** Verify fal.ai's current catalog against the LabIA integrations, integrate selected missing APIs and update existing ones. Review the catalog/adapter/pipeline boundaries so new models and provider updates have a small, documented integration path. Preserve server-side pricing, idempotency, reservation/refund and non-blocking polling. See [`docs/provider-catalog-task.md`](docs/provider-catalog-task.md); coordinate shared provider and generation files with Felipe.

Not now: payments, self-service signup, locale currency, auto-posting, Cloudflare.

Unverified until the founders run real generations by hand: real fal outputs and invoices (`/edit` price is assumed equal to the base model; FFmpeg metadata/merge are listed at $0), face continuity across clips, and fal media URL lifetime.

## Environment

Listed in `.env.example`. `DIRECT_URL` (unpooled) is used by Prisma migrations, `DATABASE_URL` (pooled) by the app. Sign-in: Google, or e-mail + password (scrypt, `users.password_hash`; signup is open unless `LABIA_ACCESS_CODE` or `ALLOWED_EMAILS` is set; min password 4 by decision until launch; the address must be confirmed before password sign-in; login and signup rate-limited). The passwordless e-mail login exists only when `NODE_ENV=development`.

Databases (Neon, org LabIA): "LabIA Prod" (green-pine-20802172, single branch `production`) is Vercel Production only; "LabIA Dev" (wandering-fog-36140443) is Vercel Preview and local `.env.local`. Never point Preview or local at Prod. Vercel env, 2026-10-05: DATABASE_URL and DIRECT_URL per environment; FAL_KEY, FAL_ADMIN_KEY, UNLIMITED_EMAILS, RESEND_API_KEY and LABIA_PUBLIC_URL in Production; AUTH_SECRET, USD_BRL_RATE, Google OAuth and the Blob store vars in both. Not set yet: EMAIL_FROM (keeps e-mail off), HF_CREDENTIALS, LABIA_ACCESS_CODE/ALLOWED_EMAILS (open sign-up, which stays off while e-mail is off).

## Run and check

`npm run dev`, `npm run typecheck`, `npm run lint`, `npx vitest run` (165 tests; the money-path ones run against the database with their own seeded user, deleted afterwards), `npm run build`, `npm run test:e2e` (Playwright, 12 tests x desktop and 390px; starts its own `next dev` on port 3100 with `FAL_MOCK=1`, never the one on 3000; specs seed and delete their own accounts and clear only the local address's rate-limit counters).

CI (`.github/workflows/ci.yml`): all of the above plus `npm audit --omit=dev --audit-level=high` on every push and PR, against a Postgres service container; no Neon, provider or production secret reaches it. Runs on GitHub Actions; pushing a change to a workflow file needs a token with the `workflow` scope. Dependabot is off on purpose (2026-10-05).

Dependency audit: production dependency scan reports zero findings after targeted mysql2/deepmerge-ts overrides. Five high findings remain in the development lint/glob chain via braces; the current advisory lists no patched version. See the audit document for sources and compatibility checks.

## Account management follow-up

Profile thumbnails are private normalized 256px WebP stored with the user; new drafts and production views consume saved defaults. The access limiter serializes same-key concurrent requests. See `docs/qa/2026-10-04-user-audit.md` for the whole-app audit and `docs/research/platform-benchmark-and-execution.md` for the research-led execution plan.

User token versions invalidate JWT sessions on every authenticated request after global sign-out; legacy tokens remain valid only at version zero. Account exports select owned profile, character briefs, media links and ledger amounts, excluding tokens and provider internals. Migration `20261004090000_account_sessions` adds the version column.

Content archival is soft: media and ledger are retained. It uses the same per-user row lock as generation starts, rejects RUNNING steps and prevents new paid starts while archived. The dashboard shows active production only; account production counts show active items. Character tabs link to the single creation form and the paginated filtered content list.

Connections now distinguishes Higgsfield and private reference-storage configuration from verified live availability.

## Shared UI refresh

The header now separates creation/account actions from horizontally scrollable page navigation, with persistent light/dark theme switching and an accessible native creation dialog linking to characters, production and Trends. The dashboard prioritizes the studio, new productions, Trends and templates. Mobile retains the full navigation sheet; balance is accessible through the account menu on narrow screens. Theme changes reuse shared tokens and local browser storage.

## Simplification audit

Account now focuses on name/photo/email and a compact referral card. Removed duplicated dashboard counts, rolling reservation totals, private-only bio and production defaults from the account UI. Existing stored preferences are preserved when saving only the name. Session revocation/export remain available through disclosures. No destructive schema changes. Character cards show selected portraits; identity editing separates optional visual details. Blank production creation hides optional script; library import is secondary; production actions are grouped. Shared inputs and character tabs meet 44px touch targets. Balance history now paginates 25 owned entries instead of truncating at 100.

Validation for the simplification pass: 103 tests in the full suite plus the new rendered balance-pagination integration test passed (104 total); typecheck, lint and production build passed. Browser review covered 14 authenticated route/view combinations at desktop and 390px. No real generation or charges.

## Account settings and workspace direction

User authorized ignoring legacy brand/design constraints for a more polished product. Researched Apple account/settings and Linear's calmer workspace/navigation. Account now uses centered identity, grouped settings rows and focused native dialogs for profile, sessions and referrals; existing server actions are reused. Desktop navigation is a quiet sidebar; mobile retains tabs/sheet. Shared neutral palette with blue accents and Inter display type replaces green laboratory styling; new browsers default to light while saved theme choices persist. Library has quick type tabs, direct search, secondary advanced filters and clickable image previews. Filename search includes imported references. Studio opens only the first optional trait group.

Workspace direction checks: all 104 tests passed, plus targeted library regressions after direct-search changes; typecheck/lint/build passed. Browser checked eight routes at 390/1024/1440px (24 views), with no overflow; account edit dialog and image detail click-through verified. No real provider calls or user-data writes.

## Creation home

Dashboard now presents a primary character-studio story, original code-based process artwork on desktop, three useful entry routes and real owned-image previews for recent productions. Large metric cards are replaced by a quiet linked summary. Mobile omits decorative process artwork so entry actions arrive earlier. No provider calls or generation were added. Imported filename search has a disposable-owner isolation regression test.

Creation-home checks: 105 tests across 31 files pass, typecheck/lint/build pass. Content list and dashboard share ProductionCard and scoped real previews. Primary-action white text contrast was measured and adjusted above 4.5:1 in both themes.
