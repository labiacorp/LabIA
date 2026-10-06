# Social Integrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Users connect X (and, for owners, the bundle.social networks) in a new "Integrações" area and publish or schedule finished media, with the R$ cost quoted before and recorded after, never twice.

**Architecture:** A core in `src/lib/social/` (accounts, posts, pricing, ledger, dispatch) talks to stateless backend adapters through one `Publisher` interface: `x` (official X API), `bundle` (bundle.social) and `mock` (active whenever `mockEnabled()`). The database is the only scheduler state; a cron route plus page-load dispatch publish due X posts, bundle.social schedules natively and reports by webhook.

**Tech Stack:** Next.js 16 App Router (Server Actions, route handlers), Prisma 7 on Postgres, Auth.js, Tailwind 4 with the LabIA tokens, Vitest, Playwright, `node:crypto`.

**Spec:** `docs/social-integrations-design.md` (read it before any task). Research: `docs/research/social-*.md`.

## Global Constraints

- Repo text (code, comments, commits, docs) in English; every UI string in Brazilian Portuguese.
- Read `CLAUDE.md` first. Commit with explicit paths, never `git add -A`. Commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Work on branch `felipe/integracoes-api-rede-social`. Never touch `main`.
- Never print or commit secrets. Tokens are sealed with `SOCIAL_TOKEN_KEY` and never reach the client, logs or the account export.
- Money: the server recomputes every quote; the reservation (SPEND, negative `deltaBrl`) is written in the transaction that creates the post, with the user row locked (`SELECT ... FROM users WHERE id = $1 FOR UPDATE`); REFUND only on proven non-delivery; UNKNOWN keeps the reservation and is never resent. Zero-cost posts write no ledger entry. `hasUnlimitedBalance` e-mails skip the balance check only.
- Prices: X US$ 0.015 per post, US$ 0.200 when the text contains a URL; every other network US$ 0. BRL = USD × `Number(process.env.USD_BRL_RATE) || 5.4`, rounded to 4 decimals.
- Mock: `mockEnabled()` from `src/lib/provider.ts` (`FAL_MOCK=1`, never in production) makes every backend the mock. Tests never reach a real network API.
- A client component never imports a server module (see CLAUDE.md gotcha); `networks.ts` and `pricing.ts` are import-free.
- Database tests seed their own user (`prisma.user.create` with `qa-<uuid>@labia.test`), delete it in `afterAll`, and are wrapped in `describe.skipIf(!process.env.DATABASE_URL)`.
- `Button asChild` breaks in server components: use `buttonVariants` on a `<Link>`. `CostChip` states `estimated`/`actual`/`free` need a numeric `value`.
- UI follows `design/reference/` and the tokens (`tailwind.config.ts`, `src/app/globals.css`, `src/components/ui`); 44px touch targets; check at 390px and desktop.
- Before the final merge: `npm run typecheck`, `npx vitest run`, `npm run build`, `npm run lint`.

## Review Focus

1. A user double-clicks "Publicar" or submits from two tabs: one post per account, one charge (same `intentId`). Pinned in Task 4.
2. Two dispatchers (cron tick and page load) see the same due post: exactly one backend call. Pinned in Task 4.
3. An X refresh token is single-use: two concurrent refreshes must not lose the connection; `invalid_grant` marks the account EXPIRED and the post FAILED with a refund. Pinned in Task 5 (adapter) and Task 4 (core).
4. The X callback receives a forged or replayed `state`, or the X account already belongs to another LabIA user: no account is created or reassigned. Pinned in Task 6.
5. A user acts on someone else's account, post or asset id (publish, cancel, disconnect): refused with no side effect. Pinned in Tasks 4, 6 and 8.

---

## File map

| Path | Responsibility |
|---|---|
| `prisma/schema.prisma`, `prisma/migrations/20261006120000_social_integrations/migration.sql` | Enums, `SocialAccount`, `SocialTenant`, `SocialPost`, `LedgerEntry.socialPostId` |
| `src/lib/social/networks.ts` | Import-free network catalog |
| `src/lib/social/pricing.ts` | Import-free quote |
| `src/lib/social/crypto.ts` | Token sealing (server) |
| `src/lib/social/publisher.ts` | Interface, shared types, `getPublisher`, `backendReady` |
| `src/lib/social/mock.ts` | Mock backend |
| `src/lib/social/accounts.ts` | Upsert/disconnect accounts, fresh-token access with locked refresh |
| `src/lib/social/media.ts` | Asset to `MediaRef` |
| `src/lib/social/posts.ts` | Create, dispatch, cancel, settle, reconcile |
| `src/lib/social/x.ts` | X adapter |
| `src/lib/social/bundle.ts` | bundle.social adapter |
| `src/app/api/integrations/[backend]/start/route.ts`, `.../callback/route.ts` | OAuth start/callback for redirect-based backends |
| `src/app/api/integrations/bundle/webhook/route.ts` | bundle.social webhook |
| `src/app/api/cron/social/route.ts` | Dispatcher trigger |
| `src/app/(app)/integracoes/page.tsx`, `actions.ts`, `network-card.tsx`, `post-list.tsx` | Integrations screen and its actions |
| `src/components/app/publish-dialog.tsx` | Publish dialog (client) |
| `src/components/app/app-navigation.tsx` | "Integrações" entry |
| `tests/integrations.spec.ts` | E2E (mock) |

---

### Task 1: Schema and migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261006120000_social_integrations/migration.sql`
- Modify: `.env.example`

**Interfaces:**
- Produces: Prisma models `SocialAccount`, `SocialTenant`, `SocialPost`; enums `SocialNetwork { X INSTAGRAM TIKTOK LINKEDIN THREADS YOUTUBE FACEBOOK BLUESKY }`, `SocialAccountStatus { CONNECTED EXPIRED ERROR DISCONNECTED }`, `SocialPostStatus { SCHEDULED PUBLISHING PUBLISHED FAILED CANCELED UNKNOWN }`; `LedgerEntry.socialPostId`. Field list exactly as in the spec "Data model" section, snake_case columns via `@map` like the rest of the schema, tables `social_accounts`, `social_tenants`, `social_posts`. Back-relations on `User` (`socialAccounts`, `socialTenants`, `socialPosts`), `Influencer` (`socialAccounts`), `Content` (`socialPosts`), `Asset` (`socialPosts`).

- [ ] **Step 1:** Add the enums and models to `schema.prisma`, matching the file's existing style (it is hand-aligned; do not run `prisma format`).
- [ ] **Step 2:** Hand-write `migration.sql` (CLAUDE.md gotcha: `migrate dev` refuses non-interactive shells). Include enums, tables, the unique `(backend, provider_account_id)` and `(user_id, backend)`, unique `operation_key`, indexes `(status, scheduled_at)`, `(user_id, created_at)`, `(user_id, network)`, foreign keys with the spec's cascade/set-null rules, and `ALTER TABLE ledger_entries ADD COLUMN social_post_id TEXT` with an `ON DELETE SET NULL` foreign key.
- [ ] **Step 3:** Run `npx prisma migrate deploy` then `npx prisma generate`. Expected: "1 migration applied" and a regenerated client. If the local database at `127.0.0.1:55432` is not running, start it first with `node .handoff/full-preview-db.mjs` in the background (it applies migrations on start).
- [ ] **Step 4:** Run `npm run typecheck`. Expected: pass.
- [ ] **Step 5:** Add to `.env.example` under a new `# Social integrations` block, each with a one-line comment: `X_CLIENT_ID=`, `X_CLIENT_SECRET=`, `SOCIAL_TOKEN_KEY=` (32 random bytes, base64: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`), `BUNDLE_API_KEY=`, `BUNDLE_WEBHOOK_SECRET=`, `CRON_SECRET=`.
- [ ] **Step 6:** Commit `prisma/schema.prisma prisma/migrations/20261006120000_social_integrations/migration.sql .env.example` with message `feat: social accounts and posts schema`.

---

### Task 2: Catalog, pricing and token sealing

**Files:**
- Create: `src/lib/social/networks.ts`, `src/lib/social/pricing.ts`, `src/lib/social/crypto.ts`
- Test: `src/lib/social/networks.test.ts`, `src/lib/social/pricing.test.ts`, `src/lib/social/crypto.test.ts`

**Interfaces:**
- Produces:
  - `type NetworkId = "X" | "INSTAGRAM" | "TIKTOK" | "LINKEDIN" | "THREADS" | "YOUTUBE" | "FACEBOOK" | "BLUESKY"` (string union mirroring the Prisma enum; no Prisma import).
  - `type NetworkInfo = { id: NetworkId; label: string; backend: "x" | "bundle" | null; audience: "all" | "owners" | "soon"; maxText: number; media: ("IMAGE" | "VIDEO")[]; note?: string }` and `NETWORKS: NetworkInfo[]` in display order X, Instagram, TikTok, LinkedIn, Threads, YouTube, Facebook, Bluesky. Values: X `x`/`all`/280/IMAGE+VIDEO; INSTAGRAM, TIKTOK, LINKEDIN, THREADS, YOUTUBE, FACEBOOK `bundle`/`owners`; BLUESKY `null`/`soon`/300. maxText: Instagram 2200, TikTok 2200, LinkedIn 3000, Threads 500, YouTube 5000, Facebook 5000. YouTube and TikTok accept VIDEO only; the others IMAGE+VIDEO. LinkedIn `note: "Somente páginas de empresa"`.
  - `networkVisible(network: NetworkInfo, isOwner: boolean): "active" | "soon"` (owners see `owners` networks active; everyone else sees them as soon).
  - `textLength(network: NetworkId, text: string): number`: for X, code points outside the Basic Multilingual Plane count 2; elsewhere code points.
  - `PRICES = { X: { postUsd: 0.015, postWithUrlUsd: 0.2, source: "https://docs.x.com/x-api/getting-started/pricing", seen: "2026-10-06" } }`.
  - `hasUrl(text: string): boolean` and `quotePost(network: NetworkId, text: string, usdBrlRate: number): { usd: number; brl: number }`.
  - `sealToken(plain: string, aad: string): string` and `openToken(sealed: string, aad: string): string` (throw `Error("Token unavailable")` on any failure, never echo input).

- [ ] **Step 1: Write the failing tests**

```ts
// pricing.test.ts
it("charges the X link price for anything URL-like", () => {
  for (const t of ["veja https://a.co", "labia.app", "www.x.com", "http://x"]) expect(hasUrl(t)).toBe(true);
  for (const t of ["sem link", "e.g. isto", "R$ 5.40", "fim."]) expect(hasUrl(t)).toBe(false);
  expect(quotePost("X", "olá", 5.4)).toEqual({ usd: 0.015, brl: 0.081 });
  expect(quotePost("X", "veja labia.app", 5.4)).toEqual({ usd: 0.2, brl: 1.08 });
  expect(quotePost("INSTAGRAM", "veja labia.app", 5.4)).toEqual({ usd: 0, brl: 0 });
});
// networks.test.ts
it("shows aggregator networks only to owners", () => {
  const ig = NETWORKS.find((n) => n.id === "INSTAGRAM")!;
  expect(networkVisible(ig, true)).toBe("active");
  expect(networkVisible(ig, false)).toBe("soon");
  expect(networkVisible(NETWORKS.find((n) => n.id === "BLUESKY")!, true)).toBe("soon");
  expect(textLength("X", "😀a")).toBe(3);
});
// crypto.test.ts (stub SOCIAL_TOKEN_KEY with a fixed 32-byte base64 value)
it("round-trips and rejects tampering or the wrong row", () => {
  const sealed = sealToken("secret-token", "acc_1");
  expect(sealed.startsWith("v1:")).toBe(true);
  expect(sealed).not.toContain("secret-token");
  expect(openToken(sealed, "acc_1")).toBe("secret-token");
  expect(() => openToken(sealed, "acc_2")).toThrow("Token unavailable");
  expect(() => openToken(sealed.slice(0, -2) + "AA", "acc_1")).toThrow("Token unavailable");
});
it("refuses to seal without a 32-byte key", () => { vi.stubEnv("SOCIAL_TOKEN_KEY", ""); expect(() => sealToken("x", "a")).toThrow(); });
```

- [ ] **Step 2:** Run `npx vitest run src/lib/social`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement the three modules. `hasUrl`: a scheme (`https?://`), `www.`, or a bare `label.tld` where tld is 2+ letters and not followed by a digit (so `R$ 5.40` and `e.g.` stay false). `crypto.ts`: AES-256-GCM, random 12-byte IV, AAD = the given string, format `v1:<iv b64url>:<tag b64url>:<ciphertext b64url>`, key from `Buffer.from(process.env.SOCIAL_TOKEN_KEY, "base64")` which must be 32 bytes.
- [ ] **Step 4:** Run `npx vitest run src/lib/social`. Expected: PASS.
- [ ] **Step 5:** Commit the six files: `feat: social network catalog, pricing and token sealing`.

---

### Task 3: Publisher interface and mock backend

**Files:**
- Create: `src/lib/social/publisher.ts`, `src/lib/social/mock.ts`
- Test: `src/lib/social/mock.test.ts`

**Interfaces:**
- Consumes: `NetworkId` (Task 2).
- Produces (in `publisher.ts`):

```ts
export type Backend = "x" | "bundle" | "mock";
export type TokenSet = { accessToken: string; refreshToken: string | null; expiresAt: Date | null; scopes?: string };
export type ConnectedAccount = { network: NetworkId; providerAccountId: string; handle: string; displayName?: string; avatarUrl?: string; tokens: TokenSet | null };
export type AccountRef = { id: string; network: NetworkId; providerAccountId: string; handle: string; accessToken: string | null }; // accessToken already opened and fresh
export type MediaRef = { kind: "IMAGE" | "VIDEO"; contentType: string; fileName: string; publicUrl: string; read(): Promise<Uint8Array> };
export type FailureReason = "auth_expired" | "media_rejected" | "text_rejected" | "rate_limited" | "platform_error";
export type PublishOutcome =
  | { state: "published"; providerPostId: string; url: string | null }
  | { state: "scheduled"; providerPostId: string }
  | { state: "failed"; reason: FailureReason }
  | { state: "unknown" };
export type PublishInput = { account: AccountRef; text: string; media: MediaRef | null; aiLabel: boolean; scheduledAt: Date | null; operationKey: string };
export interface Publisher {
  backend: Backend;
  startConnect(input: { userId: string; redirectUri: string }): Promise<{ url: string; secret: string | null }>;
  finishConnect(input: { userId: string; redirectUri: string; params: URLSearchParams; secret: string | null }): Promise<ConnectedAccount[]>;
  refresh?(refreshToken: string): Promise<TokenSet>;
  publish(input: PublishInput): Promise<PublishOutcome>;
  status(input: { account: AccountRef; providerPostId: string }): Promise<PublishOutcome>;
  cancel?(input: { account: AccountRef; providerPostId: string }): Promise<void>;
  disconnect(input: { account: AccountRef }): Promise<void>;
}
export class AuthExpiredError extends Error {}
export function getPublisher(backend: Backend): Publisher;      // mockEnabled() → mock for every backend
export function connectBackend(backend: "x" | "bundle"): Backend; // "mock" when mockEnabled(), else the argument
export function backendReady(backend: "x" | "bundle"): boolean;  // mock, or required env vars present (x: X_CLIENT_ID, X_CLIENT_SECRET, SOCIAL_TOKEN_KEY; bundle: BUNDLE_API_KEY)
```

`getPublisher` lazily imports `./x` and `./bundle` (Tasks 5 and 9); until those exist it throws `Error("Backend unavailable")` for them.

- `MockPublisher` (in `mock.ts`): `startConnect` returns `url = redirectUri + "?code=mock&state=" + <random state>` and `secret = <same state>`; `finishConnect` checks `params.get("state") === secret` (else throws) and returns one account `{ network: "X", providerAccountId: "mock-" + userId, handle: "labia_teste", tokens: { accessToken: "mock-access", refreshToken: "mock-refresh", expiresAt: now + 2h } }`; `publish`: text containing `[mock-fail]` → `failed/platform_error`, `[mock-unknown]` → `unknown`, `scheduledAt` set and in the future → `scheduled` with id `mock-sched-<operationKey>`, else `published` with id `mock-<operationKey>` and url `https://example.com/mock/<id>`; `status` of a `mock-sched-` id → `published`; `refresh` returns a new pair; `cancel` and `disconnect` resolve.

- [ ] **Step 1:** Write `mock.test.ts` asserting each behavior listed above, including `finishConnect` throwing on a state mismatch, and `getPublisher("x")` returning the mock when `FAL_MOCK=1` (`vi.stubEnv`).
- [ ] **Step 2:** Run `npx vitest run src/lib/social/mock.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `publisher.ts` and `mock.ts`.
- [ ] **Step 4:** Run the test. Expected: PASS.
- [ ] **Step 5:** Commit `feat: publisher interface and mock backend`.

---

### Task 4: Core — accounts, media, posts, dispatch, cron route

**Files:**
- Create: `src/lib/social/accounts.ts`, `src/lib/social/media.ts`, `src/lib/social/posts.ts`, `src/app/api/cron/social/route.ts`
- Test: `src/lib/social/posts.test.ts` (database), `src/app/api/cron/social/route.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3; `prisma` (`@/lib/prisma`), `hasUnlimitedBalance` (`@/lib/ledger`), `readReference` (`@/lib/reference-storage`), `providerMediaUrl` (`@/lib/media-access`).
- Produces:
  - `accounts.ts`: `saveConnectedAccounts(userId: string, backend: Backend, accounts: ConnectedAccount[], influencerId?: string | null): Promise<string[]>` (upsert by `(backend, providerAccountId)`; throws `SocialError("Esta conta já está conectada a outro usuário da LabIA.")` if the row belongs to another user; seals tokens with the row id as AAD; sets CONNECTED); `accountRef(accountId: string): Promise<AccountRef>` (opens tokens; when `tokenExpiresAt` is within 2 minutes and the backend has `refresh`, refreshes inside a transaction that locks the account row `FOR UPDATE`, re-reads it, refreshes only if still stale, and stores the new pair before returning; `AuthExpiredError` from `refresh` sets EXPIRED and is rethrown); `disconnectAccount(userId: string, accountId: string): Promise<{ canceled: number }>` (owned only; calls `cancelPost` for each SCHEDULED post, best-effort `publisher.disconnect`, clears tokens, DISCONNECTED).
  - `media.ts`: `assetMedia(userId: string, assetId: string): Promise<MediaRef>` (owned asset; kind IMAGE or VIDEO; `read` uses `readReference(storageKey)` or `fetch(url)`; `publicUrl` from `providerMediaUrl`).
  - `posts.ts`: `class SocialError extends Error {}`;
    `quoteAccounts(accounts: { network: NetworkId }[], text: string): { totalBrl: number; items: { network: NetworkId; brl: number }[] }`;
    `createPosts(input: { userId: string; intentId: string; accountIds: string[]; assetId: string | null; contentId: string | null; text: string; aiLabel: boolean; scheduledAt: Date | null; expectedBrl: number }): Promise<{ postIds: string[] }>`;
    `dispatchDuePosts(opts?: { userId?: string; now?: Date; limit?: number }): Promise<{ published: number; scheduled: number; failed: number; unknown: number }>`;
    `cancelPost(userId: string, postId: string): Promise<void>`;
    `applyOutcome(postId: string, outcome: PublishOutcome): Promise<void>` (forward-only: never moves PUBLISHED, FAILED, CANCELED or UNKNOWN backwards);
    `reconcileScheduled(userId: string): Promise<void>` (SCHEDULED posts with `providerPostId` and `scheduledAt <= now`: `status` then `applyOutcome`);
    `FAILURE_COPY: Record<FailureReason, string>` in PT-BR (e.g. `auth_expired: "A conexão expirou. Reconecte a conta e tente de novo."`).
  - `route.ts`: `GET` with `Authorization: Bearer <CRON_SECRET>` (constant-time compare; 401 otherwise; 503 when `CRON_SECRET` is unset) returns `dispatchDuePosts()` as JSON.

Rules `createPosts` must enforce (spec "Publish" steps 1–2): text non-empty and within `textLength` of every chosen network; at least one account; every account owned, CONNECTED and accepting the asset kind; asset owned (or none); `scheduledAt` null or between now + 5 min and now + 30 days; server quote equal to `expectedBrl` (± 0.0001) else `SocialError("O preço mudou; confira o novo valor.")`; one transaction with the user row locked; if any post with `operationKey` `${intentId}:${accountId}` exists, return the existing ids and charge nothing; balance check with the same message format as generation (`Saldo insuficiente: você tem R$ X e precisa de R$ Y.`); a SPEND entry `-brl` with `socialPostId` per post whose cost > 0 and note `Reserva: publicação <network>`. When `scheduledAt` is null, store `now` and call `dispatchDuePosts({ userId })` after the transaction. bundle-backend posts with a future `scheduledAt` are also dispatched immediately (the backend schedules them; the outcome is `scheduled`).

Dispatch rules (spec "Dispatch" step 4): first mark `PUBLISHING` rows with `claimedAt` older than 5 minutes as UNKNOWN; select due posts (`SCHEDULED`, `providerPostId` null, and `scheduledAt <= now` or account backend `bundle`), claim each with `updateMany({ where: { id, status: "SCHEDULED", providerPostId: null }, data: { status: "PUBLISHING", claimedAt: now } })` and continue only when `count === 1`; build `AccountRef` (an `AuthExpiredError` here is a `failed/auth_expired` before sending) and `MediaRef`; call `publish`; settle: `published` → PUBLISHED, `url`, `publishedAt`, `actualCostBrl = estimatedCostBrl`; `scheduled` → back to SCHEDULED with `providerPostId`; `failed` → FAILED, `error = FAILURE_COPY[reason]`, REFUND `+estimate` when > 0 (note `Estorno: publicação não enviada`), and `auth_expired` also sets the account EXPIRED; `unknown` or a thrown error after `publish` was called → UNKNOWN, `error = "Não confirmamos se a publicação saiu. A equipe vai verificar."`.

- [ ] **Step 1: Write the failing database tests** in `posts.test.ts` (`FAL_MOCK=1`, `USD_BRL_RATE=5.4`; seed a user with a TOPUP, an IMAGE asset with a `/mock/` url and a CONNECTED mock X account via `saveConnectedAccounts`). One `it` per line:
  - "reserves the X price and publishes now": `createPosts` with `expectedBrl: 0.081` → post PUBLISHED with url, `actualCostBrl` 0.081, ledger sum −0.081 for that post.
  - "a repeated intent creates and charges once": the same `intentId` twice, sequentially and with `Promise.all` → one post, one SPEND.
  - "a changed quote creates nothing": `expectedBrl: 0.0` with a URL in the text → throws "O preço mudou", zero posts.
  - "insufficient balance is refused": user without TOPUP → throws matching `/Saldo insuficiente/`, zero posts.
  - "foreign accounts and assets are refused": another seeded user's account id or asset id → throws, zero posts, zero ledger rows.
  - "scheduling window": `scheduledAt` now + 1 min and now + 31 days → throw; now + 10 min → SCHEDULED and not dispatched.
  - "two dispatchers publish once": a due SCHEDULED post, `Promise.all([dispatchDuePosts(), dispatchDuePosts()])` → total `published` across both results is 1 (spy on the mock `publish`: called once).
  - "failure refunds": text with `[mock-fail]` → FAILED, ledger sum for the post 0.
  - "unknown keeps the reservation": text with `[mock-unknown]` → UNKNOWN, ledger sum −0.081, a second dispatch does not call `publish`.
  - "stale publishing becomes unknown": set a post to PUBLISHING with `claimedAt` 6 minutes ago → after dispatch it is UNKNOWN.
  - "cancel refunds; foreign cancel is refused": cancel own SCHEDULED → CANCELED and refunded; another user's id → throws, unchanged.
  - "disconnect cancels scheduled posts": `disconnectAccount` → account DISCONNECTED, tokens null, its SCHEDULED post CANCELED and refunded.
  - "an expired refresh marks the account expired": account with `tokenExpiresAt` in the past and a mock `refresh` that throws `AuthExpiredError` (spy) → post FAILED with the `auth_expired` copy and refunded, account EXPIRED.
  - "applyOutcome is forward-only": PUBLISHED post + `{ state: "failed" }` → still PUBLISHED.
  - "the same X account cannot join two users": `saveConnectedAccounts` for user B with user A's `providerAccountId` → throws the PT-BR message, row unchanged.
- [ ] **Step 2:** `route.test.ts`: no header → 401; wrong secret → 401; unset `CRON_SECRET` → 503; right secret → 200 with the four counters (mock `dispatchDuePosts`).
- [ ] **Step 3:** Run `npx vitest run src/lib/social/posts.test.ts src/app/api/cron`. Expected: FAIL.
- [ ] **Step 4:** Implement `accounts.ts`, `media.ts`, `posts.ts`, `route.ts`.
- [ ] **Step 5:** Run the same command. Expected: PASS. (Local DB tests need `node .handoff/full-preview-db.mjs` running; see the memory note in CLAUDE context. A failure that also happens on `origin/dev` is not yours: compare before fixing.)
- [ ] **Step 6:** Commit `feat: social posts core with reservation, idempotent dispatch and cron route`.

---

### Task 5: X adapter

**Files:**
- Create: `src/lib/social/x.ts`
- Test: `src/lib/social/x.test.ts`

**Interfaces:**
- Consumes: `Publisher`, `TokenSet`, `ConnectedAccount`, `PublishInput`, `PublishOutcome`, `AuthExpiredError` (Task 3).
- Produces: `class XPublisher implements Publisher` (`backend: "x"`), exported and returned by `getPublisher("x")` when not mocked.

Endpoints and values (from `docs/research/social-apis-x-linkedin-threads.md` §1): authorize `https://x.com/i/oauth2/authorize`; token `https://api.x.com/2/oauth2/token` (form body, `Authorization: Basic base64(X_CLIENT_ID:X_CLIENT_SECRET)`); revoke `https://api.x.com/2/oauth2/revoke`; me `GET https://api.x.com/2/users/me?user.fields=profile_image_url`; post `POST https://api.x.com/2/tweets` with `{ text, media?: { media_ids: [id] }, made_with_ai?: true }`; image upload `POST https://api.x.com/2/media/upload` (multipart `media`, `media_category=tweet_image`); video upload `POST /2/media/upload/initialize` (`{ media_type, total_bytes, media_category: "tweet_video" }`), `POST /2/media/upload/{id}/append` (multipart, `segment_index` from 0, 5 MB chunks), `POST /2/media/upload/{id}/finalize`, then `GET /2/media/upload?command=STATUS&media_id={id}` honoring `check_after_secs` until `succeeded`; the post does not exist yet, so a `failed` state is `failed/media_rejected` and waiting more than 120 s is `failed/platform_error`. Scopes `tweet.read tweet.write users.read media.write offline.access`. PKCE S256 with a 64-byte verifier; `secret` = JSON `{ state, verifier }`.

Error mapping: token endpoint `400 invalid_grant` → `AuthExpiredError`; post `401` → `failed/auth_expired`; `403` or `400` from `/2/tweets` → `failed/text_rejected`; `429` → `failed/rate_limited`; media `failed` state → `failed/media_rejected`; a network error or timeout during `POST /2/tweets` (after the request may have been sent) or any 5xx from it → `unknown`; errors before `/2/tweets` → `failed/platform_error`. Every fetch has `AbortSignal.timeout(20_000)`; error messages never include tokens or response bodies.

- [ ] **Step 1: Write the failing tests** with a stubbed global `fetch` that records calls:
  - "builds a PKCE authorize URL": `startConnect` URL has `response_type=code`, the client id, the redirect URI, the five scopes, `code_challenge_method=S256`, and a `state` equal to `JSON.parse(secret).state`.
  - "exchanges the code and reads the profile": `finishConnect` with matching state → one account `{ network: "X", providerAccountId: "123", handle: "felipe" }` with tokens and `expiresAt` ≈ now + `expires_in`; state mismatch → throws before any fetch.
  - "refresh rotates and maps invalid_grant": new pair returned; `400 {error:"invalid_grant"}` → `AuthExpiredError`.
  - "posts text with the AI flag": body `{ text: "oi", made_with_ai: true }`, outcome `published` with url `https://x.com/felipe/status/<id>`.
  - "uploads an image then posts": simple upload called with `media_category=tweet_image`, then `media.media_ids`.
  - "uploads a 12 MB video in 3 chunks and waits for processing": initialize, append × 3 with `segment_index` 0..2, finalize, STATUS `in_progress` then `succeeded`, then the post (fake timers for `check_after_secs`).
  - "maps errors": 401 → `failed/auth_expired`; 429 → `failed/rate_limited`; 503 on `/2/tweets` → `unknown`; `fetch` rejecting on `/2/tweets` → `unknown`.
- [ ] **Step 2:** Run `npx vitest run src/lib/social/x.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement `x.ts`; wire it into `getPublisher`.
- [ ] **Step 4:** Run the test. Expected: PASS.
- [ ] **Step 5:** Commit `feat: X publishing adapter`.

---

### Task 6: OAuth routes

**Files:**
- Create: `src/app/api/integrations/[backend]/start/route.ts`, `src/app/api/integrations/[backend]/callback/route.ts`
- Test: `src/app/api/integrations/[backend]/callback/route.test.ts`

**Interfaces:**
- Consumes: `getPublisher`, `connectBackend`, `backendReady` (Task 3), `saveConnectedAccounts` (Task 4), `sealToken`/`openToken` (Task 2), `requireUserId`, `ownerSession`/role check pattern from `src/lib/owner.ts`, `networkVisible`.
- Produces: `GET /api/integrations/{x|bundle}/start?influencerId=` and `GET /api/integrations/{x|bundle}/callback`.

Rules: unknown `backend` → 404; not signed in → redirect `/login`; `bundle` requires an owner (role OWNER and `ownerSession`) else 404; `!backendReady` → redirect `/integracoes?erro=config`. Start: `redirectUri = <origin>/api/integrations/<backend>/callback` where origin is `LABIA_PUBLIC_URL` in production and `request.nextUrl.origin` otherwise; store `sealToken(JSON.stringify({ userId, secret, influencerId }), "oauth:" + backend)` in an httpOnly, `sameSite: "lax"`, `secure` in production, 10-minute cookie `labia_social_<backend>` scoped to `/api/integrations/<backend>`; redirect to the publisher URL. Callback: missing cookie, unreadable cookie, a different signed-in user, `error` param, or any `finishConnect` failure → delete the cookie and redirect `/integracoes?erro=<backend>`; a `SocialError` from `saveConnectedAccounts` → `/integracoes?erro=ocupada`; success → delete the cookie and redirect `/integracoes?conectado=<backend>`. The influencer id is used only if it belongs to the user.

- [ ] **Step 1:** Write `route.test.ts` (mock `@/lib/session`, `@/lib/social/accounts`, use the real mock publisher with `FAL_MOCK=1` and a stubbed `SOCIAL_TOKEN_KEY`): forged `state` → redirect `?erro=x`, `saveConnectedAccounts` not called; missing cookie → `?erro=x`; cookie sealed for another user id → `?erro=x`; `SocialError` → `?erro=ocupada`; happy path → `?conectado=x` and `saveConnectedAccounts` called with the mock account; `bundle` for a non-owner → 404.
- [ ] **Step 2:** Run `npx vitest run src/app/api/integrations`. Expected: FAIL.
- [ ] **Step 3:** Implement both routes.
- [ ] **Step 4:** Run the test. Expected: PASS.
- [ ] **Step 5:** Commit `feat: OAuth connect routes for social backends`.

---

### Task 7: Integrations screen and navigation

**Files:**
- Create: `src/app/(app)/integracoes/page.tsx`, `src/app/(app)/integracoes/actions.ts`, `src/app/(app)/integracoes/network-card.tsx`, `src/app/(app)/integracoes/post-list.tsx`
- Modify: `src/components/app/app-navigation.tsx` (add `{ href: "/integracoes", label: "Integrações", icon: Share2 }` after Biblioteca)
- Test: `src/app/(app)/integracoes/actions.test.ts`

**Interfaces:**
- Consumes: `NETWORKS`, `networkVisible` (Task 2), `backendReady` (Task 3), `disconnectAccount`, `cancelPost`, `dispatchDuePosts`, `reconcileScheduled`, `FAILURE_COPY` (Task 4).
- Produces: server actions `disconnectAction(accountId: string): Promise<{ error: string } | { canceled: number }>` and `cancelPostAction(postId: string): Promise<{ error: string } | { ok: true }>`, each starting with `await requireUserId()` and calling `revalidatePath("/integracoes")`.

Page (server component): `requireUserId()`; owner flag as in `src/lib/owner.ts` (role OWNER and `ownerSession`); best-effort `await dispatchDuePosts({ userId })` and `await reconcileScheduled(userId)` wrapped in try/catch (the page must render even if a backend is down); loads the user's non-DISCONNECTED accounts and latest 50 posts with account and asset. Layout and copy (spec "Screens and copy"): `PageHeading` "Integrações" / "Conecte suas redes e publique o que você produziu na LabIA."; a success or error `Alert` from `?conectado=` / `?erro=` (`x`: "Não foi possível conectar o X. Tente de novo.", `ocupada`: "Esta conta já está conectada a outro usuário da LabIA.", `config`: "Esta integração ainda não está configurada."); section "Redes sociais" with one `NetworkCard` per `NETWORKS` entry (grid 1/2/3 columns); section "Publicações" with `PostList`. Use the Claude Design reference screen "8 · Conexões" (`design/reference/`) for card anatomy, the Otto screenshots in the spec conversation for the X card (logo tile, status pill top-right, account line, outline "Reconectar" and text "Desvincular").

`NetworkCard` (client, for the confirm dialog): states active+connected ("Conectado como @handle", pill "Conectado", "Reconectar" link to `/api/integrations/<backend>/start`, "Desvincular" opening a native confirm `<dialog>` that states how many scheduled posts will be canceled and refunded), active+EXPIRED (pill "Expirada", primary "Reconectar"), active+ERROR (pill "Erro"), active+none (primary "Conectar"), active but `!backendReady` (owners: "Configuração pendente"), soon ("Em breve", no button), owner-only networks show a "Teste interno" tag. Network logos as inline SVG or `lucide-react` icons in a token-colored tile; no new dependency.

`PostList`: per post the network, @handle, text excerpt (2 lines), media thumbnail, status badge (SCHEDULED "Agendado", PUBLISHING "Publicando", PUBLISHED "Publicado", FAILED "Falhou", CANCELED "Cancelado", UNKNOWN "Em verificação"), `scheduledAt`/`publishedAt` in `pt-BR` and `America/Sao_Paulo`, `CostChip` (`estimated` while SCHEDULED/PUBLISHING/UNKNOWN, `actual` after PUBLISHED, `free` when 0, refunded failures show `actual` 0), "Ver post" for PUBLISHED with url, "Cancelar" for SCHEDULED, the controlled `error`. Empty state (`EmptyState`) "Nenhuma publicação ainda" linking to `/biblioteca`.

- [ ] **Step 1:** Write `actions.test.ts` (pattern of `src/app/(app)/modelos/actions.test.ts`): both actions call `requireUserId` before anything; pass the session user id to `disconnectAccount`/`cancelPost`; a thrown `SocialError` returns `{ error }` with its message; any other error returns `{ error: "Não foi possível concluir. Tente de novo." }`.
- [ ] **Step 2:** Run `npx vitest run "src/app/(app)/integracoes"`. Expected: FAIL.
- [ ] **Step 3:** Implement the page, actions, card, list and nav entry.
- [ ] **Step 4:** Run the test (PASS) and `npm run typecheck` (PASS).
- [ ] **Step 5:** Browser check in mock mode (dev server `labia-dev` via `preview_start`, sign in at `http://127.0.0.1:3000` as `preview@labia.test`): `/integracoes` at 390px and 1280px, verify by DOM/text (not screenshots) that all eight cards render with the right states, connect X through the mock flow ends with "Conectado como @labia_teste", no horizontal overflow (`document.documentElement.scrollWidth <= innerWidth`).
- [ ] **Step 6:** Commit `feat: Integrações screen with network cards and publications`.

---

### Task 8: Publish dialog and entry points

**Files:**
- Create: `src/components/app/publish-dialog.tsx`, `src/app/(app)/integracoes/publish-actions.ts`
- Modify: `src/app/(app)/biblioteca/library-view.tsx` (button "Publicar" next to `DownloadAsset` in the detail dialog), `src/app/(app)/i/[id]/c/[contentId]/review-form.tsx` (button "Publicar" for the final video asset)
- Test: `src/app/(app)/integracoes/publish-actions.test.ts`

**Interfaces:**
- Consumes: `NETWORKS`, `textLength`, `quotePost` (Task 2, client-safe), `createPosts`, `SocialError`, `quoteAccounts` (Task 4).
- Produces:
  - `getPublishTargets(assetId: string): Promise<{ accounts: { id: string; network: NetworkId; handle: string }[]; assetKind: "IMAGE" | "VIDEO"; usdBrlRate: number } | { error: string }>` (owned asset; CONNECTED accounts whose network is visible to this user and accepts the kind).
  - `publishAction(input: { intentId: string; assetId: string; contentId: string | null; accountIds: string[]; text: string; aiLabel: boolean; scheduledAt: string | null; expectedBrl: number }): Promise<{ ok: true; count: number } | { error: string }>` (`scheduledAt` is an ISO string built on the client from a `datetime-local` value interpreted in `America/Sao_Paulo`).
  - `<PublishButton assetId contentId? />`: a ghost `lg` button that opens `<PublishDialog>`.

Dialog: native `<dialog>` with the `studio-dialog` classes; loads targets on open; account checkboxes (none checked by default; if there are none, a link "Conectar uma rede" to `/integracoes`); textarea with a counter per selected network (`textLength` vs `maxText`, red when over); switch "Marcar como conteúdo gerado por IA" on by default with helper "As redes pedem esse aviso em conteúdo realista feito com IA."; radio "Publicar agora" / "Agendar" with `datetime-local` (min now + 5 min, max now + 30 days); a hint when the X price includes a link ("Posts com link no X custam mais: ~R$ 1,08"); `CostChip` per account and the total; confirm button "Publicar" / "Agendar publicação" disabled while invalid or pending; one `intentId = crypto.randomUUID()` per dialog opening, reused on retries; success message "Publicação enviada." / "Publicação agendada." with a link to `/integracoes`; errors from the action shown inline. Full-height sheet at 390px, 44px targets.

- [ ] **Step 1:** Write `publish-actions.test.ts`: both actions call `requireUserId` first; `publishAction` passes the session user id, parses `scheduledAt` to a `Date`, maps `SocialError` to `{ error }` and unknown errors to the generic copy; `getPublishTargets` filters out accounts whose network does not accept the asset kind and owner-only networks for non-owners.
- [ ] **Step 2:** Run `npx vitest run "src/app/(app)/integracoes/publish-actions.test.ts"`. Expected: FAIL.
- [ ] **Step 3:** Implement the actions, dialog and the two entry points.
- [ ] **Step 4:** Run the test (PASS) and `npm run typecheck` (PASS).
- [ ] **Step 5:** Browser check in mock mode at 390px and desktop: from `/biblioteca` publish an image now to the mock X account → appears as "Publicado" with "Ver post" on `/integracoes`; schedule another for +10 min → "Agendado" with an estimated cost; cancel it → "Cancelado". Verify by DOM text and the database (`social_posts` rows, `ledger_entries` sum), not screenshots.
- [ ] **Step 6:** Commit `feat: publish dialog from the library and the final video`.

---

### Task 9: bundle.social adapter and webhook (owners only)

**Files:**
- Create: `src/lib/social/bundle.ts`, `src/app/api/integrations/bundle/webhook/route.ts`
- Test: `src/lib/social/bundle.test.ts`, `src/app/api/integrations/bundle/webhook/route.test.ts`

**Interfaces:**
- Consumes: Task 3 types, `prisma` (for `SocialTenant`), `applyOutcome` (Task 4).
- Produces: `class BundlePublisher implements Publisher` (`backend: "bundle"`), wired into `getPublisher("bundle")`; `verifyBundleSignature(rawBody: string, header: string | null): boolean`; webhook `POST` handler.

- [ ] **Step 1:** Read bundle.social's API docs (`https://info.bundle.social/llms.txt`, `llms-full.txt`, `api-reference/webhooks.md`, `api-reference/connect-social-accounts/hosted-flow.md`) and write the exact endpoints, auth header, request/response shapes and signature scheme you will use as a comment block at the top of `bundle.ts`, with the date read. Map: team per user (`SocialTenant`, created on first `startConnect`); `startConnect` → `create-portal-link` with `logoUrl` `${origin}/icon.png` if it exists, `language` `pt` if supported else `en`, `redirectUrl` = the callback URI, short expiry; `finishConnect` → list the team's social accounts and return one `ConnectedAccount` per supported network with `tokens: null`; `publish` → upload media from `media.publicUrl` if their API needs an upload id, then create the post for that account's network with `postDate` (`scheduledAt ?? now`) and status SCHEDULED, setting their AI-disclosure field when one exists for the network; outcome `scheduled` with their post id (or `published` if they report it immediately); `status` → read the post and map POSTED → `published` (with the permalink if returned), ERROR → `failed/platform_error`, otherwise `scheduled`; `cancel` → delete the post; `disconnect` → disconnect the account at bundle.social. Map 401/403 to `failed/auth_expired`, 429 to `failed/rate_limited`, network errors on the create call to `unknown`.
- [ ] **Step 2:** Write `bundle.test.ts` with a stubbed `fetch` against the shapes from Step 1: tenant created once and reused; portal link request carries the redirect and language; account listing maps networks; publish sends the right body and returns `scheduled`; status mapping for POSTED/ERROR/pending; error mapping. Write `route.test.ts`: bad signature → 401 and `applyOutcome` not called; valid POSTED event → `applyOutcome(postId, { state: "published", ... })` for the post whose `providerPostId` matches; unknown post id → 200 and nothing applied; a repeated delivery → still one transition.
- [ ] **Step 3:** Run `npx vitest run src/lib/social/bundle.test.ts src/app/api/integrations/bundle`. Expected: FAIL.
- [ ] **Step 4:** Implement the adapter and the webhook (read the raw body with `await request.text()` before parsing).
- [ ] **Step 5:** Run the tests. Expected: PASS.
- [ ] **Step 6:** Commit `feat: bundle.social adapter and webhook for owner testing`.

---

### Task 10: End-to-end, status and handoff

**Files:**
- Create: `tests/integrations.spec.ts`
- Modify: `PROJECT_STATUS.md`, `src/lib/... account export` only if it would include social tokens (check `src/app/(app)/conta` export code: it must select no token columns), account deletion path (`src/app/(app)/conta/seguranca` delete action: refuse while a post is PUBLISHING with "Aguarde a publicação em andamento terminar."; best-effort `disconnectAccount` for each X account before the cascade)
- Create (gitignored): `.handoff/report.md`

**Interfaces:**
- Consumes: everything above; `tests/helpers.ts` (`seedUser`, `signInDev`, `deleteUsers`, `runPrefix`, `sql`).

- [ ] **Step 1:** Write `tests/integrations.spec.ts` (runs under `npm run test:e2e`, which starts its own `next dev` on 3100 with `FAL_MOCK=1`): seed a user with a TOPUP ledger row and an IMAGE asset (`sql`), sign in, open `/integracoes` → eight network cards, Instagram shows "Em breve" for a non-owner; connect X → "Conectado como @labia_teste"; open `/biblioteca`, open the asset, "Publicar", choose the X account, type text, confirm → back on `/integracoes` the post is "Publicado"; schedule another → "Agendado"; cancel → "Cancelado"; disconnect X → card back to "Conectar". Delete the seeded users in `afterAll`. Both projects (desktop and 390px) from `playwright.config.ts`.
- [ ] **Step 2:** Add the export/deletion guards with a unit or database test each (export contains no `accessToken`/`refreshToken`; deletion refused while a post is PUBLISHING).
- [ ] **Step 3:** Run `npm run typecheck`, `npm run lint`, `npx vitest run`, `npm run build`, `npm run test:e2e -- tests/integrations.spec.ts`. Expected: all pass (database failures that also fail on `origin/dev` are reported, not fixed).
- [ ] **Step 4:** Update `PROJECT_STATUS.md`: screens list gains `/integracoes`; a "Social integrations" section (what works, mock-only verification, owner-only bundle, Hobby means an external scheduler calls `/api/cron/social`, founders' setup list from the spec); remove "auto-posting" from "Not now"; env list.
- [ ] **Step 5:** Commit `tests/integrations.spec.ts PROJECT_STATUS.md` and the guard files: `feat: e2e for integrations; status update`.
- [ ] **Step 6:** Write `.handoff/report.md` (commits, what was verified and how, what was not, decisions, money spent R$ 0, open questions, next step: founders create the X app and bundle.social key, then a first real post on a test account with Felipe's OK).
