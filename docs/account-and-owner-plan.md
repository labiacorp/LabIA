# Plan: owner accounts and the full account pipeline

Status: proposal, 2026-10-05. Nothing here is built yet. Companion to
`docs/qa/2026-10-05-account-audit-from-leaner.md` (the gaps this plan closes, with the Leaner
code each one can be ported from).

Each phase is one branch (`diego/<task>`), small commits, its own tests, and updates
`PROJECT_STATUS.md` in the same commit as the behavior change. Phases 0 and 7 can ship without
email; 2 to 6 need the email sender from phase 1.

Decided for now (2026-10-05): the 4-character password minimum stays while the only users are the
founders. It is item 1 of the launch checklist (phase 7).

---

## Phase 0. Owner accounts (privileged normal accounts)

**Goal**: Diego and Felipe keep using normal LabIA accounts, created the normal way, and those
accounts additionally see an owner area: users, balances, manual top-ups, reconciliation of
uncertain generations. Same idea as Leaner's admin for ticket campaigns.

### Why not copy Leaner's mechanism as-is

Leaner grants admin by email: `ADMIN_EMAILS` env var, checked by `isAdminEmail()`. That is safe
there because a Leaner password account cannot sign in until its email is verified. **LabIA does
not verify emails yet** (audit item A1). With an email allowlist, whoever first signs up with
`felipe@...` and a password, before Felipe himself has an account under that address, becomes
owner. So in LabIA the privilege must be bound to the **account**, not to an email string.

### Design

1. **`User.role`**: enum `USER | OWNER`, default `USER`. Additive migration
   (hand-written, per the AGENTS.md gotcha).
2. **Granted only from the terminal**, never from the UI and never from an env var:
   `npx tsx scripts/owner.ts grant <email>`, `revoke <email>`, `list`. Same shape as
   `scripts/ledger.ts`. Running it needs the production `DATABASE_URL`, which only the founders
   have. Granting requires the account to already exist, so you sign in once first, then grant.
3. **Owner powers need a Google session.** The jwt callback records how this session signed in
   (`token.authMethod = account.provider` on sign-in). `requireOwner()` accepts only
   `authMethod === "google"`. Consequence: even with a 4-character password, guessing an owner's
   password yields a normal account, never the owner area. Google brings its own 2FA and verified
   email. (A dev-only bypass for the `dev` provider, behind `NODE_ENV === "development"`, keeps
   local testing possible.)
4. **One check, fresh on every request**: `src/lib/owner.ts`
   ```ts
   export async function requireOwner(): Promise<string> // returns userId or notFound()
   ```
   Reads the session, then `role` from the database (not from the JWT, so a `revoke` takes effect
   on the next request, same reasoning as the existing `tokenVersion` check).
   `notFound()`, never a redirect: to a non-owner, `/admin` must look like a URL that does not
   exist (Leaner's `requireAdminUserId` comment explains why).
5. **Called everywhere, not just in the layout.** `src/app/(app)/admin/layout.tsx` calls it, and
   so does **every server action and route handler** under it. A layout does not protect a server
   action; anyone can POST to an action id directly. Leaner's 16 admin actions each start with
   `await requireAdminUserId()`; keep that rule and add a test that greps for it.
6. **Audit trail for everything that moves money.** New `AdminAction` table: `actorId`, `action`
   (`TOPUP`, `RECONCILE`, `ROLE_GRANT`, ...), `targetUserId`, `data` (JSON), `createdAt`.
   Written in the same transaction as the change it records. Top-ups also store the actor on the
   `LedgerEntry` note so the user's own statement says it was manual.
7. **Navigation**: an "Admin" entry appears only when the layout's existing user query (extended
   with `role` and the session's `authMethod`) says owner. Hiding the link is cosmetic; (4) and
   (5) are the protection.

### First owner screens (what makes phase 0 worth building)

- **`/admin/usuarios`**: list of accounts (email, created, balance, last activity, referral
  source), search. Read-only.
- **Manual top-up** from that list, replacing `scripts/ledger.ts topup`: amount (server enforces
  the same 0 to 1000 BRL bound), a required note, a confirmation that repeats amount and email,
  and an idempotency key so a double click never credits twice (the generation coordinator's
  `operationKey` pattern). Per AGENTS.md, *using* it on a real account still needs the owner's OK
  for that top-up; building and testing it uses seeded accounts only.
- **Uncertain generations**: steps in `submission_unknown` / `cost_unknown`, with the reconcile
  form that today is `scripts/ledger.ts refund`. Video still requires the verified total cost.
- **Product call to make**: `/conexoes` (which provider keys are configured) is operator
  information. Consider moving it under `/admin`.

### Tests

- Unit: `requireOwner` with a normal user, an owner signed in by password, an owner signed in by
  Google, an owner revoked mid-session (next request 404), no session.
- Every exported function in `src/app/(app)/admin/**/actions.ts` starts with `requireOwner()`
  (a simple source test, so a new action cannot forget it).
- Integration (seeds its own two users, deletes them in `afterAll`): a top-up by an owner writes
  exactly one `LedgerEntry` and one `AdminAction`; the same request by a normal user writes
  nothing; a repeated idempotency key writes nothing the second time.
- Browser at 390px and desktop: owner sees Admin, normal user gets the not-found page at `/admin`.

---

## Phase 1. Transactional email

Everything from phase 2 on needs to send email. Leaner uses Resend (`src/lib/resend/`): plain
templates, user-supplied text HTML-escaped, sending inside `after()` so a slow provider never
blocks the response. Port that module.

**Needs the founders**: a sending domain (DNS records), `RESEND_API_KEY`, `EMAIL_FROM`.

---

## Phase 2. Email verification (closes audit A1)

- One token table for every email flow: `EmailToken` (`userId`, `purpose`: `VERIFY | RESET |
  CHANGE_EMAIL`, `tokenHash`, `codeHash`, `newEmail?`, `expiresAt`, `usedAt`). Hashed at rest,
  single use, older unused tokens of the same purpose invalidated on reissue. Leaner keeps two
  tables for this; one is enough.
- `User.emailVerifiedAt`. Google sign-ins set it (Google already proves `email_verified`).
- Password signup creates the account, sends a link and a 6-digit code (`/verificar-email`), and
  the password provider refuses to sign in until verified.
- **The takeover fix**: when Google signs into an existing row that has a `passwordHash` and no
  `emailVerifiedAt`, clear the password and bump `tokenVersion`. Google just proved who owns the
  address; the password was set by whoever typed it first.
- Resend link with its own rate limit (port `resendVerificationAction`).

## Phase 3. Forgot / reset password

`/esqueci-senha` and `/redefinir-senha/[token]`: same answer whether or not the email exists,
token valid for 1 hour, reset revokes every session (`tokenVersion`). Port from Leaner's
`forgot-password/` and `reset-password/[token]/`.

## Phase 4. "Acesso e segurança" becomes a real security page

- **Login methods**, as rows that show their state: `Senha` ("Definida" / "Criar senha"),
  `Google` ("Conectado" / "Conectar"). Store `googleSub` on `User` when Google signs in, so the
  link is to a Google account, not just to an email string. Never allow removing the last method.
- **Change password**: asks for the current one, revokes the other sessions.
- **One re-authentication gate for the page**, revealed when a sensitive row is tapped (lock icon
  instead of the chevron), never one gate per control (Leaner shipped three stacked
  "Continuar com Google" blocks once and it read as broken). Password accounts re-enter the
  password; Google accounts do a fresh Google sign-in with `prompt: "login"`, accepted for
  5 minutes. Keep the inline variant for a session that ages out between opening a form and
  submitting it.
- **"Sair da conta" revokes the session** (audit A2): bump `tokenVersion` before `signOut()`.
  One line; can ship earlier, with phase 0.
- **Login limiter counts failures only** (audit A4): reset the per-email counter on success.

## Phase 5. Change email and delete account

- **Change email**: store the new address on an `EmailToken` (`purpose: CHANGE_EMAIL`), keep the
  current email and sessions untouched, swap and revoke only when the link is clicked. Do not copy
  Leaner's version: it overwrites the email first, so a typo locks the user out.
- **Delete account**: behind the re-auth gate, typed confirmation. Refuse while a step is
  `RUNNING` or a reservation is open (guard inside the delete query, not a check-then-delete).
  **Needs the founders**: what happens to `LedgerEntry` rows (financial records may have to be
  kept: anonymize the user instead of deleting them), to Blob media, and to referral links.

## Phase 6. Terms, Privacy and recorded consent

- `/termos`, `/privacidade` (roadmap item 8). Must cover image rights: the user owns or has
  permission for every face and reference they upload, and what LabIA does with generated
  likenesses.
- `User.consentAcceptedAt`, `User.consentTermsVersion`, `CURRENT_TERMS_VERSION` constant bumped by
  hand whenever the text changes. Checkbox on signup; an interstitial for accounts created after
  tracking starts. Accounts that existed before are never backfilled (that would record an
  acceptance nobody gave). Port from Leaner's `src/lib/consent.ts`.
- **Needs the founders**: the text itself (and ideally a lawyer's read, given the likeness angle).

## Phase 7. Launch checklist (before anyone outside the team signs up)

1. Password minimum back to 8 (audit A3).
2. Enumeration-safe copy on signup and reset (audit A5).
3. Decide how signup opens: invite links, waitlist, or fully open; set or remove
   `LABIA_ACCESS_CODE` / `ALLOWED_EMAILS` accordingly.
4. Rate limits sized for shared networks (one venue Wi-Fi or carrier CGNAT is many people).
5. Playwright specs for every flow above, each seeding and deleting its own accounts.
6. Owner accounts reviewed: `scripts/owner.ts list` shows only the founders.

---

## Order and dependencies

| Phase | Needs email | Needs founders | Rough size |
|---|---|---|---|
| 0 Owner accounts + A2 logout fix | no | no | 1 to 2 blocks |
| 1 Email sender | n/a | domain + key | 1 block |
| 2 Verification | yes | no | 1 to 2 blocks |
| 3 Reset password | yes | no | 1 block |
| 4 Security page | partly | no | 2 blocks |
| 5 Change email, delete account | yes | ledger retention decision | 2 blocks |
| 6 Terms and consent | no | the legal text | 1 block |
| 7 Launch checklist | n/a | how signup opens | 1 block |

Phase 0 can start now. Phase 1 is the one founder action that unblocks most of the rest.
