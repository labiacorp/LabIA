# V2 platform audit and V1 flow recovery

Reviewed 2026-10-04 at Diego's request. This is a repository and mock-browser audit, not a claim that real providers or production deployment have been validated.

## Sources examined

- Current V2 application, authentication, schema, generation coordinator, video chain, ledger, pages and tests.
- GitHub V1 (`origin/main`, `9a53fbd0dc809194b162536cec02f3c1f097c610`) via read-only `git show`.
- `/Users/phill/LabIA-branches-backup.bundle`, imported into an ignored bare repository solely for inspection. Backup main is `384f8b1229d884bc1ca1693025bc542f7019b488`; the recovery and blueprint branches are also preserved. This backup is distinct from today's GitHub main.
- V1 flow registry, utility/image/video nodes, graph validation/topology, templates, runner and canvas controls. The backup's `feat/projects-canvas-recovery` and `feat/flow-blueprint-mcp-learning` branches show media import and blueprint work that must not disappear from the recovery map.
- Read-only Leaner sources: Auth.js Google provider/callbacks, shared Google sign-in action, login control, account settings and business profile/category forms. No Leaner code or data was changed.

## What V1 actually had

| Capability | Evidence | V2 mapping / status after this work |
| --- | --- | --- |
| Canvas with draggable nodes, zoom, minimap and saved viewport | `app/(studio)/fluxos/flow-canvas.tsx` | Canvas restored as a second view of Content Steps. Positions are saved in this browser, separately for mobile/desktop; server-saved arbitrary graphs remain pending. |
| Typed ports and connection feedback | `lib/flows/types.ts`, `validation.ts`, `components/flows/canvas-connections.ts` | Current recipe connections are fixed; arbitrary rewiring, cycle validation and invalid-edge feedback are not yet ported. |
| Node palette grouped by create/project/post-production | `components/flows/canvas-node-actions.ts` | Script, scene, chained video and assembly are available through current Steps. Arbitrary add/remove nodes remains pending. |
| Text, prompt, note, imported media and output nodes | `lib/flows/utility-nodes.ts`, `image-nodes.ts` | Free manual script is implemented. Notes and imported media sources still need integration. |
| Image generation, image-to-video, continuation and assembly | `lib/flows/image-nodes.ts`, `video-nodes.ts` | Scene from front portrait, three 5s continuations and final merge already exist. A standalone text-to-video recipe and per-clip model/duration choices remain pending. |
| Templates for image-only, image-to-video and imported product media | `lib/flows/templates.ts` | V2 currently has one influencer reel recipe. A recipe selector and imported-product path remain pending. |
| Blueprint: briefing, project context, source, test clip, human review, extension, assembly, output | Backup blueprint branch and templates | Manual script, final review and downloadable output are now functional. Project-context notes and a review checkpoint between video segments remain pending. |
| Topological execution, waiting/skipped nodes, run snapshot and run polling | `lib/flows/topology.ts`, `runner.ts` | V2 uses the existing asynchronous Step coordinator and guarded polling. General branched execution and run history remain pending. |
| Cost estimate and one-use confirmation before paid execution | `lib/flows/costs.ts`, `execution-confirmation.ts` | V2 re-quotes server-side, locks the user's balance and uses operation keys. Those safeguards remain in place. |
| Project-linked media import and media search | Backup project/canvas recovery branch | Global owned library with search, filters, pagination, details and downloads is restored. Upload/storage needs durable-media integration and Blob credentials. |
| Provider connections / external executors and MCP bridge | V1 connections/executors APIs and backup MCP branch | V2 shows configuration readiness for its actual integrations. Browser-account executors and MCP tools are not offered as working connections yet. |

The V1 palette had an empty Direction category and compatibility-only actions. A menu entry or blueprint annotation alone does not prove an executable feature. The restored canvas uses the existing V2 recipe and its server actions; it does not claim parity with the arbitrary V1 editor.

## Page audit and fixes

| Area | Finding | Change |
| --- | --- | --- |
| Access/login | Google button was offered with no configured client; callback errors had no explanatory copy; dev email lacked server format validation | Credential readiness, controlled error copy, pending development form and email validation; successful login goes to the dashboard. Normal closed-beta gate remains. |
| Account | Display name now persists across sign-ins, but account operations beyond profile/logout are not available | Kept the first-block behavior; did not copy Leaner's password, tickets or billing flows into this Google-only beta. |
| Dashboard/navigation | No global library destination | Library added to global navigation and the media-count card; Connections available from the account dialog. |
| Character/profile | Profile was read-only; invalid tab query could leave navigation without a selected tab | Editable name, niche/category suggestions, tone, persona and visual signature; ownership enforced; tab normalized and mobile tabs wrap. |
| Character media | Latest 60 assets without filtering; audio rendered as video; no provenance/download | Reused the global library with the character filter, correct native audio/video/image previews, details, pagination and download. |
| Production | Script card had no usable editor; no flow view, final decision controls or final download | Free saved script feeds future prompt defaults; canvas, final approval/adjustment/review controls, and video downloads. Review requires a completed owned final video and no running step. |
| Generation setup | Missing fal credentials could fail at submit after reserving balance | Readiness is checked on the server before the ledger transaction and shown in generation forms; production cannot enable mock mode. |
| Production costs | Missing/ambiguous actual costs could appear as zero | Unknown settled costs render unavailable; known subtotal is labeled as verified spend. Step estimates stay visible. |
| Errors/forms | Raw provider errors shown to customers; duplicate scene/motion field IDs | Controlled customer-facing failure copy and unique field IDs. Stored provider details remain available for internal investigation. |
| Library/download | No global library or authenticated attachment route | 24-file pages, ownership-bound search and filters; streaming attachment endpoint restricted to provider hosts, no unchecked redirects, MIME checks and safe filenames. Browser displays download failures. |
| Connections | No visibility into integration configuration | Read-only readiness screen. Configuration presence is explicitly distinguished from a verified working connection. |

## Dependency audit

`npm audit` initially reported nine high-severity findings. Added targeted overrides for Prisma's pinned `mysql2` (3.24.5) and `@prisma/config`'s `deepmerge-ts` (8.0.2), retaining Prisma 7 and Next 16. Prisma configuration loading/client generation, production build and the test suite are verified with these overrides. Deepmerge 8 changes Map semantics; the inspected Prisma config path uses plain config records, and future config changes should recheck compatibility. See the [maintainer release notes](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0) and [advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx).

Afterward `npm audit --omit=dev` reports zero findings. Five high findings remain in the development lint/glob dependency chain through braces. Its [current advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) lists no patched version. Do not blindly apply the suggested forced downgrade of the framework or ORM.

## Verification

- Typecheck, lint and production build pass; 65 tests cover the existing money path plus ownership and input validation for script/review/download, library parsing and login readiness.
- Browser QA uses seeded throwaway accounts and `FAL_MOCK=1`. Both accounts are deleted in `finally`, including when checks fail.
- Library pagination, video playback, actual mock-file download/attachment headers, audio preview, foreign/anonymous download denial, script persistence, review approval, character category editing, canvas and authenticated pages checked.
- Responsive checks: 390, 768, 1024px, plus desktop screenshots at 1440px. Mobile canvas opens at a readable zoom with vertically arranged cards; mobile library filters collapse. Screenshots reviewed, not merely generated.
- No real provider generation, credit additions, paid calls or founder data changes. Zero ledger entries for QA accounts.

## Remaining work, in dependency order

1. Production metadata editing, archive/restore and full pagination of influencer/content/ledger lists. Preserve media and money records when archiving.
2. Durable uploads and source selection (existing sheet, reference image, audio), then imported-product and image-only recipes.
3. Attempt history and safe retry/regeneration with reuse of verified clips. Submission-unknown/cost-unknown jobs must be reconciled, never resent automatically.
4. Persistent canvas layout, palette and graph editing mapped to Steps, server-side typed edge/cycle checks, multi-clip controls and dependency execution. The current canvas is a production view.
5. Voice/lip sync using the founders' selected model/audio approach, intermediate human review and final export.
6. OAuth credentials, dedicated V2 deployment/CI environment, terms/privacy and beta administration. Account deletion/email changes would need fresh reauthentication and a retention design before shipping.
7. Optional executor connections and MCP, carrying over the V1 ownership and spend approvals.

Real Google OAuth, durable remote downloads/media lifetime, model invoices and face continuity remain unverified. Credentials and model decisions are concrete dependencies, not reasons to block the already testable management UI.
