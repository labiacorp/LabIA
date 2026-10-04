# Competitive research and execution plan

Owner request: research leading creation platforms, make a long plan, execute it in parts without waiting for another instruction after each feature. The latest direction prioritizes a whole-application user audit and the account/profile experience. This plan supersedes the outdated delivery boundaries in `v2-platform-plan.md`; architecture and financial safeguards remain applicable.

## Scope and evidence standard

Research baseline: 2026-10-04. The sample covers influential products in adjacent categories, not a verified ranking by revenue or active users. Use official documentation and publicly visible product pages. A documented capability is not proof that we tested its logged-in execution, output quality, price, or availability on every plan. Do not infer missing capabilities from their absence on a marketing page. Recheck model availability and pricing immediately before implementing a paid integration.

For each research cycle, trace the same tasks: first visit, sign-in, profile, choose a character, import a reference, start from a template, write a script, estimate cost, execute, recover failure, review, reuse, export, and resume on mobile. Record the source/date, observed behavior, uncertainty, LabIA gap, proposed acceptance test, and implementation cost. Use public screenshots or a permitted test account when possible. Never label simulated media as production output.

## Initial benchmark

| Platform | Official evidence | Product pattern | LabIA decision |
| --- | --- | --- | --- |
| Higgsfield | [AI Influencer help](https://higgsfield.ai/creator-hub/help-center/tools/how-do-i-use-ai-influencer), [updated studio](https://higgsfield.ai/blog/new-ai-influencer) | Guided character configuration, reusable character library and a short path into motion | Keep the primary studio; make its references and next actions visible throughout production |
| Runway | [Workflows](https://help.runwayml.com/hc/en-us/articles/45763528999699-Introduction-to-Workflows), [References](https://help.runwayml.com/hc/en-us/articles/40042718905875-Creating-with-Gen-4-Image-References) | Reusable process templates, linked steps, saved visual references | Improve repeatable production and reference selection before expanding to arbitrary graphs |
| HeyGen | [Templates](https://help.heygen.com/en/articles/13466178-how-to-use-templates-in-heygen-to-streamline-video-creation), [Brand System](https://help.heygen.com/en/articles/9889198-how-to-create-a-brand-system) | Editable starting structures and persistent brand assets reduce repeated setup | Add editable brief/script templates and clear character identity; do not expose unavailable rendering controls |
| Synthesia | [Features](https://www.synthesia.io/features), [Editor](https://docs.synthesia.io/docs/video-edit-page) | Scene editing, brand consistency, organization and review | Establish a complete personal review flow before team roles and collaboration |
| Canva | [Brand Kit](https://www.canva.com/pro/brand-kit/), [Magic Design](https://www.canva.com/help/use-magic-design/) | Brand-aware templates and explicit reuse of existing media | Build useful creator defaults and saved production recipes, not decorative settings |
| Freepik / Spaces | [Spaces](https://www.freepik.com/spaces), [Overview](https://www.freepik.com/ai/docs/introduction-to-spaces) | Templates, reusable node workflows and collaboration | Keep Steps as the sole execution model; canvas and recipes must reuse that model |

Inference: the recurring advantage is retained creative context—identity, references, reusable structure, revision and accessible outputs. Adding model names alone will not fix LabIA's fragmented user journey. This is a product hypothesis to validate with observed task completion, not a market-share claim.

## Execution sequence

Each part ends with working behavior, meaningful regression checks, desktop/mobile review, a small commit, an updated PR to v2, and refreshed project status. Continue to the next unblocked item. External credentials or paid validation limit only the dependent item, not all independent work. No real paid generation is authorized by this research request.

### Part 0 — Whole-product user audit (initial pass delivered)

Walk every authenticated page with a new account and a populated account. Exercise forms, empty states, searches, pagination, back navigation, dialogs, keyboard interaction, long strings, malformed query parameters, missing objects and foreign account URLs. Inspect 390px, tablet and desktop. Verify authentication failures, session revocation, asset download ownership and zero generation/ledger writes during this audit. Record reproducible failures and regressions, not just screenshots or test counts.

Acceptance: all available routes are reachable, no unexplained blank screen, no overflow under valid input bounds, no account data crossing ownership boundaries, and failures have a recovery action. Unavailable provider capabilities are identified honestly.

### Part 1 — Complete personal profile and preferences (delivered)

A user must recognize their account, edit personal identity, use/remove a profile photo, understand their access method, choose production defaults that are actually consumed, export their own data and sign out locally or everywhere. Preserve custom profile edits after sign-in. Avoid invented password controls for a Google-only identity system.

Acceptance: profile/photo/preferences persist after reload and appear consistently in navigation and creation; invalid uploads fail safely; defaults change new drafts only; another account cannot read a private photo; removing a photo restores the fallback. Fresh-auth-sensitive account email/deletion operations need a separate design rather than an unsafe button.

### Part 2 — Reusable production starters

Add an original curated collection for product demonstration, three tips, storytelling, FAQ and product comparison. Every starter previews its purpose, script structure and format. Allow saving an owned production brief/script as a personal template and using it with another owned character. Duplication creates fresh generation steps and never copies charges, approvals or provider job identifiers.

Acceptance: starting from a template is free, editable and traceable; ownership is enforced; applying a template cannot silently overwrite an existing production; paid steps still require a fresh quote and explicit confirmation.

### Part 3 — Character identity and reference management

Show actual portraits in character cards, kit completeness, current reference and the effect of profile edits. Support choosing an owned approved reference, with provenance. Reuse the library rather than maintaining a second asset catalog. Research the consistency controls exposed by the configured provider before adding UI for them.

Acceptance: reference selection reaches the generated prompt/job input; foreign assets and incompatible media are rejected; existing content keeps its original provenance; changing a reference does not silently regenerate anything.

### Part 4 — Durable media and imports

Port tested V1 upload patterns. Add validated image/audio/video imports, type/size/dimension checks, pending/error/retry UI and durable object storage. Keep media access scoped to its owner. Move generated media to durable storage with a recoverable state transition. Implement and test adapters locally while Blob credentials are absent; do not claim persistence is live before verifying it.

Acceptance: interrupted upload does not create a usable dangling asset; refresh resumes or explains recovery; downloaded bytes match the stored file; generated provenance and expense survive relocation.

### Part 5 — Script, voice and finished delivery

Research current voice/lip-sync model APIs, language support, cost units and duration limits from official sources. Build the selected mock contract and scene script flow; offer voice upload when storage is ready. Add pronunciation/voice preview only where supported. Capture timing constraints between script, voice and the three video segments.

Acceptance: a full mock reel reaches final download with clear duration and cost; invalid audio cannot start a paid job; real quality/cost validation stays pending until specifically authorized. Do not advertise a voice feature that only changes a label.

### Part 6 — Generation history, failure recovery and cost clarity

Separate intent, attempt and artifact. Surface running, failed, partially completed and unknown-cost states. A retry must preserve successful segments and require a new cost confirmation only for remaining work. Reconcile ambiguous submissions before resending. Add user-readable job diagnostics without provider payload leaks.

Acceptance: double clicks and concurrent requests cannot double charge; partial success remains accessible; unknown submission never auto-replays; displayed total matches ledger reconciliation.

### Part 7 — Review and delivery workspace

Bring script, media, cost and approval together. Add review notes and clear revision state, final export naming, download feedback and ownership-safe history. Research caption/subtitle support; implement only when generated output or downloadable sidecar is real. Keep auto-posting out of the current founders' scope.

Acceptance: a user can review, mark changes, return later and download the correct final artifact without opening unrelated pages. Approval cannot target an unfinished or foreign output.

### Part 8 — Repeatable workflows and canvas

Compare Runway/Spaces task paths in more detail. Introduce supported recipe variants before free-form graph editing. Keep compatible inputs explicit; reject invalid connections and cycles before paid execution. Persist layouts to the user/account rather than only a browser when workflow editing warrants it.

Acceptance: list and canvas use the same state and prices; editing a layout never triggers a paid action; recipe migration preserves previous jobs and assets.

### Part 9 — Search, organization and visibility

Expand true pagination to characters and ledger. Add useful filters and asset naming, selected only after observing frequent tasks. Make activity and next actions visible from the dashboard. Avoid premature team/workspace structures while the product uses individual ownership.

Acceptance: every owned item remains discoverable beyond 100 records; searches survive navigation; filtered empty states explain how to recover; active/archived totals use clear labels.

### Part 10 — Polish, accessibility and performance

Audit keyboard-only use, focus restoration, form labels, status announcements, reduced motion, target size, high zoom, long translations and slow networks. Profile navigation/database round trips before optimizing. Use meaningful loading/error states and persistent feedback, including upload and export failures.

Acceptance: no keyboard traps, unlabeled controls or essential hover-only actions; mobile supports the same core tasks; loading does not erase the current draft; error recovery preserves user input.

### Part 11 — V2 release readiness

Dedicated V2 hosting and database, OAuth redirect validation, environment readiness, migrations, CI integration and rollback plan. Maintain V1 independently. Validate a fresh-user journey on the deployed V2 preview, not only localhost. Record all still-simulated behavior.

Acceptance: checks pass on the release commit; no mock provider in production; OAuth works end-to-end with the intended domain; deployment and production promotion follow existing ownership decisions.

## Measurement and progress

Track task completion, dead ends, fields re-entered, first-draft time, failed saves, recoverable failures, and cost discrepancies. Establish actual observed baselines before claiming improvements in percentages. For this closed beta, short task logs from founder usage are more useful than fabricated analytics.

Current: the public-source benchmark is complete at an initial capability level. Detailed authenticated competitor testing, live generation quality and comparative prices are not verified. Parts 0 and 1 are delivered with findings and verification in `../qa/2026-10-04-user-audit.md`. Parts 2–11 are queued with explicit acceptance criteria; their status must not be presented as delivered.
