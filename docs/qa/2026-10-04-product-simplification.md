# Product simplification audit

The user requested an app-wide UX review with subtraction first, especially in profile. This pass reviewed all main authenticated routes, both character profile contexts, production Steps/Canvas and server-action groups. It preserves the paid execution coordinator and concentrates changes on unnecessary UI, navigation and access to existing data.

## Page decisions

| Area | Keep | Remove or simplify |
| --- | --- | --- |
| Shared header | Navigation, balance, account, creation | Separate actions/navigation; persistent token-based theme toggle; mobile tabs and sheet |
| Dashboard | Studio entry, owned totals, recent production | Replace generic introduction with a creation-focused hierarchy; direct Trends/template shortcuts |
| Account | Name, photo, access email, referrals | Remove repeated content counts, balance/usage cards, private-only bio, creation defaults and membership date from the screen |
| Account security/data | Session revocation and export | Secondary disclosures; concise copy; retain confirmation for session revocation |
| Photo editing | Import/remove/error feedback | Hide empty filename and Save until a file is chosen; compact change-photo action |
| Character list | Search, owned characters, library access | Show actual selected portrait; active-content count and readable singular/plural copy |
| Character identity | Fields that feed prompts and reference choice | Label tab Identity to distinguish account profile; optional visual details disclosure; remove internal ID fragments from reference labels |
| Character kit | Cost confirmation, staged references | Keep: these controls affect paid results and identity consistency |
| Character library | Owned previews, filters/downloads | Reuse shared library rather than build a duplicate |
| Content list | Active/archive separation, filtering, paging | Compact responsive filter grid, readable counts, filtered empty state can clear filters |
| New production | Character, title, idea, format | Optional script disclosure; existing templates open it when populated |
| Production Steps | Brief, script, execution, status/cost/review | Group duplicate/save/archive actions; retain explicit paid confirmations and manual-cost boundaries |
| Canvas | Alternate view of the same Steps | Keep shared backend; no arbitrary editing or paid shortcut added |
| Library | Files, search/filter, provenance, download | Reference import becomes a secondary disclosure; library is the primary content |
| Templates | Reuse script/brief with free drafts | Keep useful starters and personal templates; no additional configuration added |
| Trends | Source/reference selection and saved recreation | Keep initial workflow and mock/real distinction; no third-party video catalog claim |
| Balance | Available funds and accurate owned ledger | Replace 100-entry truncation with 25-entry pagination; explain reservations in a disclosure |
| Connections | Provider configuration diagnostic | Remove from ordinary account navigation: customers cannot configure these integrations in beta; direct diagnostic route remains |
| Login/invite/referral | Google/access gate and first-touch referral | Retain access restrictions; no extra fields or account onboarding invented |

## Function review

- Account name update now leaves omitted biography/default fields untouched, avoiding preference resets after simplifying the form. Unknown identity fields cannot change the authenticated owner or email.
- Avatar validation/private storage, referral attribution, exports and token-version session revocation remain intact.
- Character edits/reference selection, production creation, brief/script editing, templates, reversible archives and final review keep owner scoping and existing validation.
- Provider submission, reservation locking/idempotency, polling and manual reconciliation remain on the existing execution path. No real generation was submitted during this audit.
- Upload/private-file access/download routes retain ownership, file validation and controlled errors. Collapsing UI does not alter permissions.
- Balance pagination bounds query parameters, preserves stable date/id ordering and filters every count/read to the authenticated user. An integration test seeds 105 owned entries plus another user's entry, then verifies older entries and owner isolation in rendered output.

## Verification

Browser walkthrough: 14 route/view combinations at desktop and 390px, with readiness awaited, no document overflow. Account and identity layouts inspected visually; creation dialog, theme reload persistence and mobile navigation checked. Browser walks only read existing data; writes use disposable test fixtures. No paid/provider generation, real top-up or real-account edit.

An initial full-suite rerun had one Neon connection termination in an unchanged money test (102 passed). A subsequent full run passed 103 tests. The completed pass passed the 103-test suite plus the new pagination integration test (104 total), typecheck, lint and production build.

## Remaining work

This is the first complete simplification pass, not a claim that all external integrations are operational. Live Google/Blob/Higgsfield validation, larger uploads, durable generated-output storage, richer execution recovery and voice/lip sync remain tracked separately. No stored personal data or historical preferences were deleted as part of removing unnecessary account controls.
