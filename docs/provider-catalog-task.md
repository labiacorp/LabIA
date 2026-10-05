# V2-PROVIDERS: model/API catalog and provider extensibility

## Assignment

- Owner: Felipe + Codex.
- GitHub review: [draft PR #5](https://github.com/labiacorp/LabIA/pull/5), targeting `v2`; open and not merged.
- Branch: `felipe/labia-v2-work`, created from `v2` at `ded7c3146667e13e9866fd0bb256643fd82edeef`.
- Started: 2026-10-03.
- Status: implementation block finished locally on 2026-10-04, marked finished at Felipe's request; awaiting full-app review on 2026-10-05 before deciding whether to integrate into `v2`; Felipe subsequently authorized committing/publishing the task branch for team visibility. This status does not assert complete fal.ai catalog coverage or live provider verification.
- Priority: video first, including Grok and updated Seedance; confirmed by Felipe on 2026-10-03.
- Initial discovery: [`fal-video-audit-2026-10-03.md`](fal-video-audit-2026-10-03.md), a historical pre-implementation audit with the complete 553-entry public video-search snapshot. Current integration/maintenance: [`provider-model-maintenance.md`](provider-model-maintenance.md). The reviewed I2V registry and the legacy recipe are exposed in the content form; real-provider verification is pending.
- Coordination: this implementation block is closed for review; no further code changes requested today. Other V2 work should coordinate overlapping provider, cost and generation changes with Felipe. Felipe authorized publishing the task branch and a draft PR to GitHub for team review. No merge or release is authorized.

## Intended outcome

Make relevant fal.ai APIs available in LabIA, verify the existing integrations, and make adding or updating models and providers straightforward. An API appearing in fal.ai's catalog, being listed in LabIA, being usable in a pipeline step, passing mock tests, and producing a verified real result are separate states and must be reported separately.

Felipe explicitly requested all available video APIs on2026-10-04. The13-entry initial shortlist is not the acceptance scope. Track every public endpoint and its required operation inputs; do not call discovery or a disabled option an integration. Authenticated account availability and paid execution remain distinct checks.

## Initial repository observations

Verified from the current checkout, before any implementation:

- `src/lib/providers/fal-models.ts` contains image/video model definitions, endpoint variants, capabilities and pricing notes, including references dated July 2026. Their current accuracy has not yet been checked against fal.ai.
- `src/lib/providers/fal.ts` combines SDK queue calls with model-specific input mapping, output parsing and cost calculations.
- `src/lib/providers/model-provider.ts` defines the shared provider contract; `src/lib/provider.ts` selects fal.ai or the development mock and adds non-blocking polling through `PollableProvider`.
- `src/lib/character.ts` fixes character-sheet and portrait model IDs; `src/lib/content-plan.ts` fixes the content image/video defaults.
- No current fal.ai documentation audit, authenticated availability check or real generation was performed when recording this task.

## Work blocks

1. **Inventory and official-source audit.** Compare what is defined, supported by the adapter, and reachable from the V2 pipeline with current official fal.ai model/API documentation. Record candidate missing APIs, changed/deprecated endpoints, input/output schemas, capabilities, limits and pricing with source links and verification dates. Keep uncertain pricing and account-specific availability explicit.
2. **Architecture review and design.** Map the current path from model selection through validation, quoting, submission, polling, result normalization and cost reconciliation. Define a minimal boundary between model catalog, provider transport, model-specific mappings and pipeline policy. Reuse the existing contracts where possible; document the proposed changes before implementation using the Superpowers architectural workflow.
3. **Selected integrations and updates.** Add or update the full requested video API set in small blocks. Make supported choices available to compatible pipeline steps. Keep capability-specific restrictions visible; retain existing defaults until changes are explicitly chosen. Keep model identifiers and parameters on persisted steps sufficient to recover existing jobs.
4. **Verification and maintenance guide.** Verify contracts with mocked SDK responses and `FAL_MOCK=1`, test meaningful cost/lifecycle failures, and document the exact files and checks required to add a model, update an endpoint/price, or add a provider. Record the checks completed for each integration and any remaining real-provider validation.

## Acceptance criteria

- A dated, source-backed matrix distinguishes provider documentation, local registration, adapter support, pipeline availability, mock verification and real verification for the selected APIs.
- Each selected integration validates its supported parameters before reserving funds, maps provider inputs/outputs correctly, and exposes an attributable price estimate in R$ before generation.
- Updating a model or provider does not require duplicating ledger logic or rewriting the generation coordinator. A worked integration/update demonstrates the documented maintenance path.
- Server-side price recomputation, one operation key per intent, balance reservation, failure refunds, ambiguous-submission handling and non-blocking polling remain covered by relevant checks.
- Existing persisted jobs can still be polled and reconciled after catalog updates; incompatible or unverified models are not presented as ready for use.
- Required typecheck, lint, relevant tests and build pass before delivery. Model-selection UI changes are checked in the browser at desktop and approximately 390px.
- `PROJECT_STATUS.md` reflects the actual delivered behavior and remaining verification after each implementation block.

## Coordination boundaries

Likely shared areas, to refine into an explicit implementation file list after the design:

- `src/lib/providers/`, `src/lib/provider.ts`.
- `src/lib/character.ts`, `src/lib/content-plan.ts`, `src/lib/generation.ts` and related tests.
- Any model-selection UI, persisted model/provider fields, or cost displays needed by the approved integrations.

Deployment, Blob/uploads, voice/lip-sync workflow, general UI redesign, management screens and canvas remain separate roadmap tasks. This task can audit their supporting APIs and record dependencies without implementing those workflows. Other branches should coordinate overlapping edits rather than treating this list as ownership of unrelated work. Preserve roadmap entries from simultaneous work when merging status updates.

## Cost and release constraints

Documentation inspection and local mock verification do not authorize paid calls. A real generation requires Felipe's explicit approval for that action and an R$ estimate first; record the actual cost afterward. No automatic paid fallback. Push, merge and deployment require the owner's go-ahead under `AGENTS.md`.

## Review handoff — 2026-10-05

Felipe closed the model API implementation demand on 2026-10-04 and requested review/testing across the whole app tomorrow, before deciding on a commit and integration into `v2`. Current delivered scope:36 video endpoints plus the legacy recipe,7 reference-image endpoints, model/quality/audio/duration controls and shared server-validated pricing/ledger handling.84 tests,typecheck and build passed; desktop/390px checked with an isolated mock database. No paid generation, commit,push,merge or deployment.

Review model availability and compatibility across content, character kit and library; verify quality ordering,audio pricing,duration limits,stale-price rejection,reference ownership and job recovery. Check existing persisted jobs and the distinction between mock and live operation. Character-kit choices remain fixed; the new selectors are on content steps.

Known follow-ups are retained explicitly:complete fal.ai endpoint coverage, GPT Image2.5 token billing, FLUX.2 input/output megapixel billing, authenticated availability/paid validation and price/promotion synchronization. The proposed Cloudflare Worker has not been implemented,deployed or scheduled. Real paid tests require action-specific approval and the estimate first. No release or merge into `main` is authorized. No automatic reminder was requested.

## GitHub publication for review — 2026-10-04

Felipe subsequently requested GitHub visibility for the team. This authorizes committing/publishing only `felipe/labia-v2-work` and opening a draft PR targeting `v2`. It does not authorize merging into `v2` or `main`, deploying or running paid generations. Tomorrow's full-app review remains the integration gate.

`origin/v2` advanced to `ad2a49f` (influencer studio) while this task branch was based on `ded7c31`. The draft must be reviewed together with that work, including overlap in PROJECT_STATUS,layout and the new-influencer route. No concurrent studio work is being overwritten or merged automatically. Reviewers should also decide the existing reconciliation policy when calculated actual spend exceeds the approved estimated reservation; it can produce an additional debit. This is inherited behavior retained by the new measured-output models, not a claim of a hard spending ceiling.

Publication completed: implementation commit `c6c5c31` pushed to `origin/felipe/labia-v2-work`; draft[PR#5](https://github.com/labiacorp/LabIA/pull/5) opened with base`v2`. Review and known follow-ups are visible to repository members. No merge or manual deployment.
