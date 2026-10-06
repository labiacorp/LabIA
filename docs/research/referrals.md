# Referrals for the closed beta

Research date: 2026-10-04. Sources are public product documentation; no authenticated competitor testing or financial reward claims.

## Evidence

- [Dropbox referral guide](https://help.dropbox.com/storage-space/earn-space-referring-friends): personal referral links, eligibility for new accounts and referral status. The useful pattern is to distinguish sharing from completed registration rather than count clicks as customers.
- [Dropbox program](https://www.dropbox.com/refer): benefits follow creation and validation of a new account. LabIA does not copy its reward economics.
- [Supabase admin invitations](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail): an administrative access invitation is different from attribution. LabIA retains Auth.js and its existing beta gate; no extra auth dependency or email sender is necessary.

## Implemented contract

Every account has an opaque stable 128-bit referral code, generated on the server when the account page is opened. The account page displays and copies a same-origin link and shows the count of new accounts attributed to it. It never exposes invitees' emails or other profile information.

`/r/[code]` validates the code against the database, sets a first-touch HttpOnly SameSite=Lax cookie lasting 30 days, and redirects to a Portuguese explanation page. Production cookies are Secure. Invalid links receive an explicit recovery page. No click analytics, raw IP history or automatic emails.

The authenticated sign-in callback records attribution only in the user creation branch. Existing users cannot acquire or change an attribution; database uniqueness serializes account creation, and a database check also prevents self-referral. Google email verification, access-code validation and ALLOWED_EMAILS continue to apply before registration. 

Rewards (2026-10-06, values to validate): the first paid Stripe top-up of a referred account grants R$ 10 to it and R$ 10 to the inviter, as `REFERRAL` ledger entries with `referral-welcome:<id>` / `referral:<id>` notes under a partial unique index, so webhook retries never pay twice. The inviter stops earning at R$ 100. The trigger is a paid top-up, never sign-up, so fake accounts cost real money. Bonus credit is spendable only. Not yet handled: reversing the bonus on a refund, and blocking a card already used by the inviter.

Invites: a referral link with invites left lets a new person past the access code (3 per user, 3 more per R$ 50 spent on generations; each account created through the link uses one). Anyone who signs in gets an access pass, so invited accounts do not need the code later. ALLOWED_EMAILS still applies.

## Verification boundaries

Integration tests seed disposable accounts, check stable codes under concurrent requests, new-account attribution, repeat sign-in, returning accounts, self-referral and invalid codes. Route tests check cookie lifetime, first-touch preservation, invalid links and absence of an access-pass cookie. Browser checks cover copying the link, anonymous landing, invalid-link recovery and mobile/desktop layouts. Google OAuth is not configured locally; live Google conversion remains unverified. No paid media generation is used.
