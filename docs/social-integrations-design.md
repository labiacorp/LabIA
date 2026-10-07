# Social integrations: design

Status: approved by Felipe on 2026-10-06 (design in chat); this file is the written spec.
Branch: `felipe/integracoes-api-rede-social` (from `dev`).
Research behind every number: `docs/research/social-apis-x-linkedin-threads.md`, `social-apis-meta-tiktok-youtube.md`, `social-aggregators.md`, `social-scheduling-infra.md` (all read on 2026-10-06).

## Goal

Customers connect their social accounts in LabIA and publish or schedule the content they produced, with the cost shown before and recorded after, like every generation. This replaces "auto-posting" in the "Not now" list of `PROJECT_STATUS.md`.

Success for this branch:
- An "Integrações" area lists every network with a polished card. X works for everyone; the bundle.social networks are open to every signed-in user; the rest show "Em breve".
- A user connects X with OAuth, publishes a finished image or video now or at a chosen time, sees the R$ cost before confirming, and finds the post (link, status, real cost) afterwards.
- Nothing is ever published twice, charged twice, or resent after an ambiguous result.
- Everything runs in mock mode (`FAL_MOCK=1`) without credentials, and the tests never post.

## Decisions (and why)

1. **X through its official API, directly.** No review, deterministic per-post price (US$ 0.015, or US$ 0.20 when the text contains a URL; pay-per-use since 2026-02-06), which fits pay-per-use exactly.
2. **Other networks through an aggregator, starting with bundle.social, open to all users (founders' decision, 2026-10-07).** Aggregators use the official APIs under apps that already passed Meta review, TikTok audit, LinkedIn partner approval and YouTube audit (4 to 8+ weeks each for us, and we lack a domain, a CNPJ in the terms and a final privacy policy). bundle.social bills per post (Free: 20 posts and 3 teams per month, enough to test; Pro US$ 100 for 10,000 posts). LabIA uses a single bundle.social organization, so the free tier (20 posts per month) is shared by all users: a limit to watch, upgrade to Pro when real usage starts. The catalog audience `owners` still exists to gate a network later.
3. **One internal interface, one adapter per backend.** Moving a network from the aggregator to an own app later means a new adapter, not a new feature. Caveat: changing the backend of a network forces its users to reconnect (tokens belong to the app that issued them).
4. **No new worker.** X has no native scheduling, so a dispatcher route publishes due posts; bundle.social schedules natively and reports by webhook.
5. **AI label on by default.** X `made_with_ai`, and the equivalent field wherever the backend exposes it. AI influencer content without a label risks removal or strikes.
6. **v1 charges only the exact X pass-through.** bundle.social posts cost R$ 0,00 for now; the aggregator fee is LabIA overhead. Margin and final per-post pricing are a founders' decision for later.

Out of scope: analytics, editing a published post, threads or replies, multi-image posts, carousels, LinkedIn personal profiles (LinkedIn forbids profiles for anyone other than yourself, so not for AI personas), Bluesky, own Meta/TikTok/Google/LinkedIn apps, messaging channels and MCP ("Conectar sua IA").

## Architecture

```
/integracoes (accounts + publications)      Publish dialog (library asset, content final video)
                 \                                  /
                  src/lib/social/  (core: accounts, posts, pricing, ledger, idempotency, dispatch)
                                   |
                         Publisher interface
             x (official X API)  |  bundle (bundle.social)  |  mock (FAL_MOCK=1)
```

### Modules (`src/lib/social/`)

| File | Purpose |
|---|---|
| `networks.ts` | Import-free catalog, safe for client components: network id, PT-BR label, backend (`x`, `bundle` or none), audience (`all`, `owners`, `soon`), max text length, accepted media. |
| `pricing.ts` | Import-free. `quotePost(network, text)` returns USD and BRL (rate `USD_BRL_RATE`, default 5.4, like the rest of the app). X: 0.015, or 0.200 when the text contains anything URL-like. Others: 0. Prices carry their source and date. |
| `crypto.ts` | AES-256-GCM token sealing with `SOCIAL_TOKEN_KEY` (32 bytes, base64). Stored as `v1:<iv>:<tag>:<ciphertext>`, with the account id as additional authenticated data. Never logs plaintext. |
| `publisher.ts` | The interface and `getPublisher(backend)`, which returns the mock whenever `mockEnabled()` is true. |
| `x.ts` | X adapter: OAuth 2.0 Authorization Code with PKCE, token refresh, media upload, post creation, revoke. |
| `bundle.ts` | bundle.social adapter: team per user, hosted portal link, account sync, scheduled post creation, status, cancel, webhook verification. |
| `mock.ts` | Mock adapter: instant connect as `@labia_teste`, fake post ids and URLs, `[mock-fail]` and `[mock-unknown]` text markers to simulate failure and an ambiguous result. |
| `posts.ts` | Core: create posts (quote check, reservation, idempotency), dispatch due posts, cancel, reconcile, settle. |

### Publisher interface

Adapters are stateless HTTP clients; the core owns the database, token sealing and the locked refresh. Exact types live in the implementation plan (Task 3).

```ts
interface Publisher {
  startConnect(input: { userId: string; redirectUri: string }): Promise<{ url: string; secret: string | null }>;
  finishConnect(input: { userId: string; redirectUri: string; params: URLSearchParams; secret: string | null }): Promise<ConnectedAccount[]>;
  refresh?(refreshToken: string): Promise<TokenSet>;
  publish(input: { account: AccountRef; text: string; media: MediaRef | null; aiLabel: boolean; scheduledAt: Date | null; operationKey: string }): Promise<PublishOutcome>;
  status(input: { account: AccountRef; providerPostId: string }): Promise<PublishOutcome>;
  cancel?(input: { account: AccountRef; providerPostId: string }): Promise<void>;
  disconnect(input: { account: AccountRef }): Promise<void>;
}
type PublishOutcome =
  | { state: "published"; providerPostId: string; url: string | null }
  | { state: "scheduled"; providerPostId: string }        // backend schedules natively
  | { state: "failed"; reason: FailureReason; retryable: false }
  | { state: "unknown" };                                  // sent, result not known: never resend
type FailureReason = "auth_expired" | "media_rejected" | "text_rejected" | "rate_limited" | "platform_error";
```

## Data model (one migration)

```prisma
enum SocialNetwork { X INSTAGRAM TIKTOK LINKEDIN THREADS YOUTUBE FACEBOOK BLUESKY }
enum SocialAccountStatus { CONNECTED EXPIRED ERROR DISCONNECTED }
enum SocialPostStatus { SCHEDULED PUBLISHING PUBLISHED FAILED CANCELED UNKNOWN }

model SocialAccount {
  id, userId -> User (cascade), influencerId? -> Influencer (set null)
  network SocialNetwork, backend String            // "x" | "bundle" | "mock"
  providerAccountId String                         // id on the network (X user id) or at the aggregator
  handle String, displayName String?, avatarUrl String?
  status SocialAccountStatus @default(CONNECTED)
  accessToken String?, refreshToken String?        // sealed by crypto.ts; null for aggregator accounts
  tokenExpiresAt DateTime?, scopes String?
  connectedAt, updatedAt
  posts SocialPost[]
  @@unique([backend, providerAccountId])           // one LabIA owner per external account
  @@index([userId, network])
}

model SocialTenant {                               // aggregator-side grouping (bundle.social team) per user
  id, userId -> User (cascade), backend String, externalId String, createdAt
  @@unique([userId, backend])
}

model SocialPost {
  id, userId -> User (cascade), accountId -> SocialAccount (cascade)
  contentId? -> Content (set null), assetId? -> Asset (set null)
  text String, aiLabel Boolean @default(true)
  scheduledAt DateTime, timezone String @default("America/Sao_Paulo")
  status SocialPostStatus @default(SCHEDULED)
  operationKey String @unique                      // one per (intent, account)
  claimedAt DateTime?                              // set when status becomes PUBLISHING
  providerPostId String?, url String?, publishedAt DateTime?
  estimatedCostBrl Decimal(12,4), actualCostBrl Decimal(12,4)?
  error String?                                    // controlled PT-BR copy, never raw provider text
  createdAt, updatedAt
  ledger LedgerEntry[]
  @@index([status, scheduledAt])
  @@index([userId, createdAt])
}
// LedgerEntry gains socialPostId? -> SocialPost (set null)
```

## Flows

### Connect X
1. `GET /api/integrations/x/start` (signed in): creates `state` and a PKCE verifier, stores both in a sealed httpOnly cookie (10 minutes, path `/api/integrations/x`), redirects to `https://x.com/i/oauth2/authorize` with scopes `tweet.read tweet.write users.read media.write offline.access`.
2. `GET /api/integrations/x/callback`: checks the cookie and `state` (mismatch or missing cookie: back to `/integracoes?erro=x`), exchanges the code at `https://api.x.com/2/oauth2/token` (confidential client, Basic auth), reads `GET /2/users/me`, upserts the account with sealed tokens. An X account already owned by another LabIA user is refused with a clear message. Redirects to `/integracoes?conectado=x`.
3. Callback URL comes from `LABIA_PUBLIC_URL` (production) or the request origin in development; never from an arbitrary Host header in production.

### Connect bundle.social networks (every signed-in user)
1. A server action makes sure the user has a bundle.social team (`SocialTenant`), creates a portal link (`logoUrl`, `language`, `redirectUrl` back to `/integracoes?conectado=bundle`, short expiry) and redirects.
2. On return, the page action lists the team's accounts and upserts one `SocialAccount` per network.

### Publish (now or scheduled)
1. The dialog (library asset detail and the content final video) offers the user's CONNECTED accounts whose network accepts the media, the text with a per-network counter, the AI label switch (on), "Agora" or "Agendar" (date and time, America/Sao_Paulo, at least 5 minutes ahead, at most 30 days), and the cost chip from `quotePost` for each account plus the total.
2. The server action recomputes the quote. If it differs from the approved total, nothing is created and the user sees "O preço mudou; confira o novo valor". Otherwise, in one transaction with the user row locked (same pattern as generation): balance check (unlimited e-mails skip it, spends still recorded), one `SocialPost` per account with `operationKey = <intent key>:<accountId>`, and a SPEND ledger entry per post for its estimate. A repeated intent key returns the existing posts and charges nothing.
3. "Agora": the action dispatches the new posts immediately (step 4) before returning. "Agendar": the dispatcher picks them up.
4. **Dispatch** (`dispatchDuePosts`): selects `SCHEDULED` posts with `scheduledAt <= now` and no `providerPostId`, then claims each with a compare-and-set `UPDATE ... SET status = 'PUBLISHING', claimed_at = now() WHERE id = $1 AND status = 'SCHEDULED'`. Only the winner calls the backend. Outcome:
   - `published`: PUBLISHED, url, `publishedAt`, `actualCostBrl = estimate`.
   - `scheduled` (bundle): stays SCHEDULED with `providerPostId`; the webhook or reconcile finishes it.
   - `failed` before anything was sent: FAILED, controlled error copy, REFUND of the estimate. `auth_expired` also marks the account EXPIRED.
   - `unknown`, or an exception after the request was sent: UNKNOWN, reservation kept, never resent; reconciled manually like `submission_unknown` steps.
   - A `PUBLISHING` row claimed more than 5 minutes ago becomes UNKNOWN.
5. bundle.social posts are created at the moment of scheduling (their scheduler holds them) rather than at the due time.

### X specifics
- Before a call, refresh when the access token expires within 2 minutes. Refresh tokens are single-use and rotate, so the refresh happens inside a transaction that locks the account row and stores the new pair before anything else. `invalid_grant` marks the account EXPIRED.
- Media is uploaded at dispatch time (X media ids expire in 24 hours): images through the simple upload, video through `initialize`, `append` (5 MB chunks), `finalize`, and status polling until `succeeded`, within the function's time budget. Bytes come from private storage (`readReference`) or the asset URL.
- One medium per post in v1 (one image or one video). Text limit 280 (weighted counting is approximated: characters outside the Basic Multilingual Plane count as 2).
- `made_with_ai: true` when the AI label is on.
- Disconnect revokes at `/2/oauth2/revoke` (best effort), clears the tokens, sets DISCONNECTED, and cancels that account's SCHEDULED posts with a refund.

### bundle.social specifics
- Media is passed by URL through `providerMediaUrl` (signed, one hour) or uploaded through their upload endpoint, whichever their API requires for the network.
- `POST` webhook at `/api/integrations/bundle/webhook`, signature checked with `BUNDLE_WEBHOOK_SECRET`. Events are applied only as forward transitions and deduplicated by post status, so a repeated delivery changes nothing.
- Opening `/integracoes` reconciles the user's SCHEDULED bundle posts that are past due (status read through the API), so local development works without a public webhook.
- Cancel deletes the scheduled post at bundle.social and refunds.

### Scheduling trigger
- `GET /api/cron/social` runs `dispatchDuePosts`, protected by `CRON_SECRET` (Bearer, constant-time compare).
- Opening `/integracoes` also dispatches the signed-in user's due posts, so development and a missed tick still converge.
- The Vercel project is on Hobby (confirmed 2026-10-06): a per-minute Vercel Cron fails the deploy, so `vercel.json` gets no cron. An external scheduler calls the route every minute with the secret (cron-job.org free, or Upstash QStash with 1,000 free messages per day); the founders create that account when X goes live. Moving to Pro later only adds the `vercel.json` entry. Note that Vercel Hobby is for non-commercial use.

## Screens and copy (PT-BR)

- Navigation: "Integrações" in the main menu (desktop sidebar and mobile sheet).
- `/integracoes`, following `design/reference/` and the tokens:
  - "Redes sociais": one card per network in a responsive grid (one column at 390px). Card states: "Conectado como @handle" with "Reconectar" and "Desvincular" (confirmation dialog that says how many scheduled posts will be canceled and refunded); "Conectar"; "Reconecte sua conta" (EXPIRED); "Erro na conexão" (ERROR); "Em breve" (disabled, no button); owners see "Teste interno" only on a network whose audience is "owners" (none today).
  - "Publicações": the latest posts with network icon, account, text excerpt, media thumbnail, status badge (Agendado, Publicando, Publicado, Falhou, Cancelado, Em verificação), date and time, cost chip (`estimated` while scheduled, `actual` after), "Ver post" link, "Cancelar" on scheduled posts. Empty state that points to the library.
  - Truthful status: the page only claims "Conectado" for accounts with a stored, non-expired connection.
- Publish dialog: native `<dialog>` like the existing ones, 44px targets, full-height sheet at 390px.
- `/conexoes` (provider readiness) is untouched.

## Configuration

New variables in `.env.example`:
- `X_CLIENT_ID`, `X_CLIENT_SECRET`: X developer app, OAuth 2.0, Web App (confidential).
- `SOCIAL_TOKEN_KEY`: 32 random bytes, base64. Required whenever a real backend is used.
- `BUNDLE_API_KEY`, `BUNDLE_WEBHOOK_SECRET`: bundle.social organization API key and webhook secret.
- `CRON_SECRET`: protects `/api/cron/social`.

A backend counts as available only when its variables are present (or in mock mode); otherwise its card shows "Configuração pendente" to owners and "Em breve" to customers.

## Errors and safety

- Raw provider errors never reach the UI; each `FailureReason` has PT-BR copy.
- Tokens are sealed at rest, never sent to the client, never logged, and excluded from the account export.
- Every server action checks ownership of the account, post, content and asset it touches.
- Account deletion cascades to social accounts and posts; it must first revoke tokens at X (best effort) and must be refused while a post is PUBLISHING, like running steps.
- Money: server-side quote, reservation in the creation transaction, refund only on proven non-delivery, UNKNOWN kept for manual reconciliation. A real paid call above R$ 5 still needs a founder's OK (not reachable in v1: one X post costs at most about R$ 1.08).

## Testing

- Unit: `pricing` (URL detection, BRL conversion), `crypto` (round trip, tamper detection, wrong AAD), `networks` (audience rules), X adapter with a stubbed `fetch` (PKCE parameters, token exchange, refresh rotation, `invalid_grant`, image upload, chunked video upload with status polling, `made_with_ai`), bundle adapter with a stubbed `fetch` (portal link, post creation, webhook signature).
- Database (seeded user deleted in `afterAll`): create posts with reservation; a repeated intent charges once; a changed quote creates nothing; insufficient balance; two concurrent dispatchers publish once; failure refunds; unknown keeps the reservation; stale PUBLISHING becomes UNKNOWN; cancel refunds; disconnect cancels and refunds; ownership checks on every action; `/admin`-style auth check that every server action calls `requireUserId()` first.
- Routes: X callback with a bad state, a missing cookie, and an account owned by another user; cron route without or with a wrong secret.
- E2E (mock, desktop and 390px): the integrations page shows all cards; connect X; publish an image from the library now; schedule a video; cancel it; disconnect.
- A real post happens only with Felipe's explicit OK, on a test account, after the X app exists.

## Founders' setup (needed for real posts, not for building)

1. X developer app with OAuth 2.0 (Web App), callback URLs for `http://127.0.0.1:3000/api/integrations/x/callback` and the production domain, credits loaded with a spending limit; `X_CLIENT_ID` and `X_CLIENT_SECRET` in `.env.local` and Vercel.
2. bundle.social free account and organization API key; `BUNDLE_API_KEY` in `.env.local`.
3. Confirm the Vercel plan (Pro enables the per-minute cron).
4. Later, for own apps: a domain, the CNPJ and contact in the terms, a final privacy policy, then Meta Business Verification.
