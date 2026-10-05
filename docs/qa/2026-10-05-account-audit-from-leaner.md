# Account, profile and settings audit, 2026-10-05 (from Leaner's playbook)

Report-only. Nothing in the code or database was changed. Scope: `/login`, `/acesso`,
`/conta` and everything behind it (`src/auth.ts`, `src/app/login/actions.ts`,
`src/app/(app)/conta/*`, `src/app/api/account/*`, `src/lib/{password,access,rate-limit,session}.ts`).

The lens: Leaner (same stack: Next 16, Auth.js v5, Prisma 7, Neon) already went through
email + password + Google accounts in production, with real users and real bugs. Each item below
names what Leaner does and where, so it can be read and ported instead of re-designed.

## The one-paragraph version

`/conta` was designed for a Google-only product. `docs/research/platform-benchmark-and-execution.md`
says it explicitly: "Avoid invented password controls for a Google-only identity system." Today
(commits `96717f4`, `e33854c`) LabIA became an email + password product too, and signup opened to
anyone when `LABIA_ACCESS_CODE` is unset, production included. The account area did not follow:
there is no way to verify an email, recover or change a password, see which login methods an
account has, change the email, or delete the account. One of those gaps is a security hole, not
just a missing feature (A1).

---

## A. Security (fix before more people sign up)

### A1. Pre-account takeover: unverified password signup + Google merges by email
- **Where**: `src/app/login/actions.ts:58-76` (signup), `src/lib/referrals.ts` `registerSignIn`
  (`upsert` by email), called from `src/auth.ts:95` on every sign-in.
- **How it happens**: an attacker signs up with `victim@gmail.com` and a password. Nothing checks
  that they own the address. Later the real owner clicks "Continuar com Google": Google proves the
  email, `registerSignIn` finds the existing row by email and signs them **into the attacker's
  account**. Everything the victim then creates (characters, faces, media, balance top-ups) lives
  in an account the attacker can open with the password they set.
- **Why now**: the code already knew. The comment at `login/actions.ts:50` says "Add a mailed link
  before opening the beta". `e33854c` opened the beta (open signup when no access code is set)
  without the mailed link.
- **Leaner's answer**: an account created with a password cannot sign in until its email is
  confirmed. `EmailVerificationToken` (hashed at rest, single-use, expiring, old ones invalidated on
  reissue), with both a link and a 6-digit code (`src/app/check-email/`,
  `src/app/verify-email/[token]/`). Google sign-in only trusts `email_verified`, which LabIA already
  checks.
- **Smallest fix if email sending is not ready**: when Google signs into an existing row that has a
  `passwordHash` and was never verified, clear the `passwordHash` (Google just proved ownership,
  the password was set by whoever typed the address first) and bump `tokenVersion`. Or simply set
  `ALLOWED_EMAILS`/`LABIA_ACCESS_CODE` in production until verification exists.

### A2. "Sair da conta" does not revoke the session
- **Where**: `src/app/(app)/actions.ts:25` `logout()` only calls `signOut()`.
- **What**: it clears the cookie in this browser, but the JWT itself stays valid until it expires
  (Auth.js default: 30 days). A copied cookie (shared computer, extension, a screenshot of devtools)
  keeps working after the user "logged out".
- **Leaner's answer**: `logoutAction` (`src/lib/auth-actions.ts`) bumps `tokenVersion` before
  clearing the cookie, so "log out" and "sign out everywhere" are the same operation. LabIA already
  has `tokenVersion` and checks it on every request, so this is a one-line change.

### A3. Minimum password is 4 characters
- **Where**: `src/lib/password.ts:3` (`PASSWORD_MIN = 4`, lowered today in `e33854c`).
- scrypt at N=2^16 is excellent, but it cannot help a 4-character password. The per-email limiter
  (8 per 15 min) bounds online guessing; it does nothing once a hash leaks. Leaner uses 8. Ask
  for 8 and drop the "too short" friction somewhere else (e.g. a show-password toggle).

### A4. Anyone can lock a user out of password login
- **Where**: `src/auth.ts:57`, `hit(\`login:${email}\`, 8, 900)` counts **every** attempt for that
  email, from any IP, before the password is checked.
- **What**: 8 wrong guesses from anywhere block the real owner for 15 minutes, and a script can
  keep it blocked indefinitely. Google sign-in still works, so it is an annoyance, not a lockout.
- **Leaner's answer**: the per-email counter only counts failures (`isAccountLocked`,
  `recordLoginFailure`, `clearLoginFailures` on success, `src/lib/rate-limit.ts`), and the per-IP limit carries the brute-force
  load. Note Leaner's own lesson: size IP limits for shared networks (venue Wi-Fi, carrier CGNAT).

### A5. Signup tells strangers which emails have accounts
- `login/actions.ts:68`: "Já existe uma conta com este e-mail". Low priority in a beta, but once
  verification exists the standard answer is "we sent a link to that address" in both cases.
  Leaner has a Playwright spec for exactly this (`tests/enumeration.spec.ts`).

---

## B. Missing account features (Leaner already has each one)

In the order a password user will hit them:

| # | Feature | LabIA today | Leaner reference |
|---|---|---|---|
| B1 | Verify email after signup | none (A1) | `src/app/check-email/`, `src/app/verify-email/[token]/` |
| B2 | Forgot / reset password | none: a password user who forgets is locked out forever | `src/app/forgot-password/`, `src/app/reset-password/[token]/` (hashed single-use token, 1h, all sessions revoked on reset) |
| B3 | Change password | none | `changePasswordAction` in `src/app/(app)/settings/conta/actions.ts` (asks for the current password, revokes other sessions) |
| B4 | See and manage login methods | not shown; a Google user cannot add a password, a password user cannot link Google | `connect-google-form.tsx`, `disconnect-google-form.tsx` (refuses to remove the last method) |
| B5 | Change email | read-only text inside "Editar perfil" | `change-email-form.tsx`. **Do not copy Leaner's version as-is**: it overwrites `email` before the new address is confirmed, which lets a typo lock the user out. Store a pending email and swap on confirmation (Leaner's own audit, `AUDIT-2026-10-05.md` S3) |
| B6 | Delete account | none | `delete-account-form.tsx`: typed confirmation, refuses while a purchase is pending, guard inside the delete itself (not a check-then-delete). LabIA analogue: refuse while a step is `RUNNING` or a reservation is open, and decide what happens to the ledger (financial records may need to be kept) |
| B7 | Re-authentication before sensitive changes | none | `reauth-gate.tsx`, see "How to lay it out" below |
| B8 | Terms and Privacy acceptance on record | none (roadmap item 8) | `consentAcceptedAt` + `consentTermsVersion` on `User`, `CURRENT_TERMS_VERSION` in `src/lib/consent.ts`, `/consent` interstitial for new accounts only |

B2 to B6 all need transactional email. LabIA has no email sender yet. Leaner uses Resend
(`src/lib/resend/`): plain transactional templates with HTML-escaped names, sent in `after()` so a
slow email never blocks the response. That is the one dependency this whole list hangs on.

B8 matters more for LabIA than it did for Leaner: users upload real faces and generate a
likeness. The Terms need an image-rights clause ("you own or have permission for the faces you
upload") and the acceptance needs to be recorded with its version. Leaner's two hard-won rules:
bump the version string by hand whenever the text changes, and never backfill acceptance for
accounts created before tracking started.

---

## C. How to lay it out (what Leaner learned the hard way)

Current `/conta`: identity block, then "Saldo e extrato", "Acesso e segurança" (only "end all
sessions"), "Exportar meus dados", referrals, "Sair da conta". Clean, and the Apple/Linear
direction is right. Suggested shape once B lands, reusing the existing dialog pattern:

- **Rows show their current value**, like Google and X account settings: `E-mail` shows the
  address, `Senha` shows "Definida" or "Criar senha", `Login com Google` shows "Conectado" or
  "Conectar". Today the email is read-only text buried inside "Editar perfil", where nobody looks
  for it.
- **"Acesso e segurança" becomes the home** for E-mail, Senha, Login com Google, Sessões. "Excluir
  conta" sits last, visually separated, and opens its own dialog.
- **One re-authentication gate for the whole page, never one per control.** Leaner shipped three
  identical "Continuar com Google" blocks stacked on one screen (one per sensitive control) and it
  read as broken. Now the rows stay tappable with a lock icon instead of the chevron; tapping one
  reveals a single gate, and passing it unlocks all of them. Keep a second, inline variant for the
  case where the session ages out between opening a form and submitting it (Leaner's
  `DeleteAccountForm` tracks `initiallyNeedsReauth` and `expiredMidSession` separately for this).
- **A password-only account re-authenticates with its password; a Google-only account with a fresh
  Google sign-in** (`prompt: "login"`, accepted only if the sign-in happened in the last few
  minutes). Leaner: `googleReauthAction` in `src/lib/google-signin.ts`, freshness window
  `GOOGLE_REAUTH_FRESHNESS_MS` = 5 min.

---

## D. Where LabIA is already ahead (worth porting back to Leaner)

- **Data export** (`/api/account/export`): owned data only, no tokens or provider internals, the
  photo included. Leaner has no export at all.
- **Rate limiter in Postgres with an advisory lock** (`src/lib/rate-limit.ts`): concurrency-tested,
  and it cannot fail open the way Leaner's Redis limiters do when Redis is unreachable.
- **Avatar endpoint** derives identity from the session and takes no user id, so there is nothing to
  enumerate.
- **`tokenVersion` checked on every request** with no cache (Leaner's web session allows up to 60s
  of lag after a revoke).

---

## Suggested order

1. **Today, no code**: set `ALLOWED_EMAILS` or `LABIA_ACCESS_CODE` in production until A1 is fixed.
2. A2 (one line) and A3 (one constant).
3. Email sender + B1 (closes A1 properly), then B2. A password product without "forgot password"
   is a support queue.
4. B3, B4 and the "Acesso e segurança" layout from section C, with the single re-auth gate.
5. B5 (pending-email pattern) and B6.
6. B8 together with roadmap item 8 (Terms and Privacy pages).

## Not covered

- Live Google OAuth (unconfigured locally, per `2026-10-04-user-audit.md`).
- Anything outside account/profile/settings: generation, ledger, providers, library.
- No browser pass: this audit reads code and flows; it renders nothing. Every item above that
  changes UI still needs the 390px + desktop check the repo rules require.
