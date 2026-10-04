# Whole-application user audit — 2026-10-04

The owner asked for realistic use, stress testing and fixes throughout the app, especially profile. All authenticated browser checks used disposable accounts, deleted afterward. No image/video generation was submitted, no provider job ID was created and no ledger entry was written by these browser journeys. Existing local mock media and a fixed one-pixel PNG served as fixtures. The integration suite separately exercises the fake provider only.

## Findings and corrections

| Finding | Reproduction / evidence | Correction |
| --- | --- | --- |
| Valid long names/titles forced horizontal overflow | 17 failing route/width combinations in the first 45-case sweep, including desktop production pages | User-controlled text wraps at arbitrary boundaries without hiding overflow; form controls may shrink within their container |
| Profile lacked photo and useful preferences | Account only exposed display-name editing | Private normalized profile photo, upload/remove, bio, default production format and default Steps/Canvas view; defaults are consumed by both draft creation paths |
| Access limiter failed under concurrency | 12 concurrent attempts against a limit of 3 accepted **10** before the fix | Per-key transaction advisory lock serializes counting and insertion; the identical workload accepts **3** after the fix |
| Download outage leaked parser details | Intercept download with HTTP 503 and HTML; UI displayed `Unexpected token '<'` | Controlled PT-BR messages for expired sessions, unavailable files and retryable server/network failures; retry download verified |
| Missing objects showed default English page | Open an unknown or foreign character | PT-BR recovery page with panel/content links; no foreign data rendered |
| Studio history exposed archived productions as active work | Archive in content management then inspect studio history | History filters archived content consistently with active production views |
| Profile counts linked to a smaller active-only list | Account content count included archives while destination hid them | Account now labels/counts active contents; export preserves archive metadata |

A streamed Next.js not-found page may have HTTP 200 after streaming begins. The initial HTTP-only assertion was corrected to inspect the rendered not-found state and absence of foreign data. This was not an authorization bypass. Download/photo APIs still enforce explicit 401/404 responses.

## Browser coverage

- Dashboard, studio, characters, contents, new draft, library, balance, account, connections, four character tabs, production Steps and Canvas: 15 views at 390, 1024 and 1440px. Baseline 17 overflow cases; post-fix 45/45 without overflow, JS errors or unexpected ledger writes.
- Additional narrow/mobile-tablet sweep: 320 and 768px, 30/30 views passed without overflow or JS errors. Total: 75 view/width combinations.
- Real UI journey: create a character without generation, edit niche/persona, navigate into a character-specific draft, save script, open media details, simulate download failure, retry download, dismiss modal, inspect empty filters.
- Profile: save name/bio/preferences, reload, upload/remove a fixed PNG fixture, verify normalized WebP response, reject an oversized file and a forged PNG containing SVG, verify anonymous and foreign-account isolation, consume format and view defaults, explicitly override Canvas with the Steps tab.
- Session controls: revoke all sessions and retry with the old cookie in a second context; protected export returns 401.
- Access: rejected a disposable email through the real development sign-in form. The configured allowlist excludes disposable users, so successful login and authenticated product interaction use isolated test JWTs. The access-code form was not presented in this development environment; its logic and concurrent limiter are covered by tests. Google OAuth is unconfigured/unverified; no claim of live Google sign-in success.
- Query stress: negative, infinite and unsafe page numbers; duplicate query keys; invalid status values; missing/foreign identifiers.

## Profile storage design

Only a normalized 256×256 WebP thumbnail is stored on the user record. Source uploads are limited to 5 MB and 36 million decoded pixels; accepted formats are static JPEG, PNG and WebP. The original file and metadata are not retained. Sharp is an explicit pinned dependency. This small private account thumbnail does not require Blob; production media imports still need durable object storage.

The avatar endpoint derives identity from the session, accepts no target-user identifier, and returns private/no-store WebP. Updating Google profile metadata on sign-in cannot overwrite the custom thumbnail. JSON account export includes bio, preferences and the user's normalized photo. User-entered identity fields cannot update email, token version or other accounts.

## Limits

This is a bounded functional/concurrency audit, not proof of production load capacity. Live Google sign-in, external storage, paid generation quality, email changes, account deletion and provider recovery remain unverified or unimplemented. Those remaining capabilities are tracked in the competitive execution plan. Production dependency audit reports zero findings; existing development-only tooling advisories remain separate.

## Reproduction

Final verification: 85 tests passed; lint, typecheck and production build passed.

Run `npm run typecheck`, `npm run lint`, `npx vitest run` and `npm run build`. Regression tests cover profile validation, photo normalization, private photo access and concurrent rate limiting. Local browser runners and screenshots are under ignored `.handoff/` (`stress-qa`, `stress-narrow`, `profile-qa`, `workflow-qa`, `login-qa`); they use isolated fixtures and the bundled Playwright runtime. Never reuse founder accounts or enable paid calls for these checks.
