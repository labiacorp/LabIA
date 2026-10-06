# Scheduling infrastructure for LabIA social posting

Research date: 2026-10-06. Every number below was read from the cited official page on that date. "UNCONFIRMED" marks anything I could not verify on an official page, plus my own inferences and arithmetic.

## 0. Starting point (read from the repo, read-only)

- `vercel.json` has only a `buildCommand` (runs `prisma migrate deploy` on Production). There is no `crons` key and no `functions` key yet.
- `PROJECT_STATUS.md`, "How generation works": no worker. The page polls `/api/influencers/[id]/refresh`, which checks the provider once per running step. Submit state is `not_submitted -> submitting -> submitted | submission_unknown`. An ambiguous submit is never resent and is reconciled by hand. A `submitting` row older than 5 minutes becomes `submission_unknown`. Every intent has one `operationKey`.
- `PROJECT_STATUS.md`, "Environment": Neon "LabIA Prod" and "LabIA Dev", Vercel project `labia`, no domain yet, `LABIA_PUBLIC_URL` is set in Production.
- The only `maxDuration` in `src/` is 60 s on the asset download route. No `proxy.ts` or `middleware.ts` exists in the repo.
- UNCONFIRMED: which Vercel plan the project is on (Hobby or Pro). It is not in the repo. This decides most of section 1.
- UNCONFIRMED: the function region (default is `iad1`, per the Functions limits page).

---

## 1. Vercel Cron Jobs

Sources (fetched 2026-10-06):
- https://vercel.com/docs/cron-jobs (last_updated 2026-09-16)
- https://vercel.com/docs/cron-jobs/usage-and-pricing (2026-07-15)
- https://vercel.com/docs/cron-jobs/manage-cron-jobs (2026-08-11)

| | Cron jobs per project | Minimum interval | Timing precision |
|---|---|---|---|
| Hobby | 100 | once per day | per hour (±59 min) |
| Pro | 100 | once per minute | per minute |
| Enterprise | 100 | once per minute | per minute |

- **Hobby cannot run every minute.** An expression that fires more than once a day fails the deployment with "Hobby accounts are limited to daily cron jobs." A `0 1 * * *` job can fire anywhere between 1:00 and 1:59.
- **Hobby is non-commercial only.** Source: https://vercel.com/docs/limits/fair-use-guidelines and https://vercel.com/docs/plans/hobby (2026-09-14). "Any method of requesting or processing payment from visitors" counts as commercial. LabIA is pay-per-use, so it needs Pro regardless of cron.
- **Pro price.** $20/month platform fee, including 1 deploying seat and $20/month of usage credit. Extra seats are $20 each. Source: https://vercel.com/docs/plans/pro-plan (2026-09-15).
- **How it fires.** Vercel sends an HTTP GET to the production deployment URL at the configured `path`. The user agent is `vercel-cron/1.0`, and an `x-vercel-cron-schedule` header carries the expression. The timezone is always UTC.
- **Duration.** Cron invocations get the same limits as Vercel Functions (section 4). Vercel recommends splitting the work if it needs more time.
- **Delivery is best effort and at-least-once.**
  - "Occasional transient network errors can prevent a request from reaching your function", and no log is created for a missed run.
  - Cron "can also occasionally invoke the same scheduled run more than once."
  - Vercel does not retry a failed cron.
  - Vercel's own advice: use locks (against concurrent runs) plus idempotent, reconciliation-based processing.
  - A job that outruns its interval can overlap with the next tick.
- **Securing.**
  - Set a `CRON_SECRET` env var, at least 16 random characters.
  - Vercel sends it as `Authorization: Bearer <CRON_SECRET>`.
  - The docs example compares with `!==`. Prefer `crypto.timingSafeEqual` on equal-length buffers.
  - The route must reject the call when `CRON_SECRET` is unset.
- **Local testing.** `vercel dev` and `next dev` do not run crons. Call the route by hand with the header. Crons run only on the production deployment, so Preview and the Neon "LabIA Dev" DB never tick.
- **Redirects.** Cron does not follow 3xx redirects. A path that returns 404 is still "executed", so check the logs.
- **Cost, my arithmetic, UNCONFIRMED against real traces.**
  - Assumptions: one tick per minute is 43,200 ticks a month, 100 ms active CPU and 0.3 s wall time per empty tick, 2 GB memory, `iad1` rates.
  - Invocations: 43,200 × $0.60/M = $0.03.
  - Active CPU: 1.2 h × $0.128 = $0.15.
  - Memory: 7.2 GB-h × $0.0106 = $0.08.
  - Total is about $0.26/month, covered by the $20 credit.
  - Rates come from https://vercel.com/docs/functions/usage-and-pricing (2026-06-16). `gru1` (São Paulo) is $0.221/h and $0.0183/GB-h, which is still under $1/month.

---

## 2. Third-party schedulers

### 2.1 Upstash QStash

Sources (fetched 2026-10-06):
- https://upstash.com/pricing/qstash
- https://upstash.com/docs/qstash/overall/pricing
- https://upstash.com/docs/qstash/features/delay
- https://upstash.com/docs/qstash/features/retry
- https://upstash.com/docs/qstash/howto/signature
- https://upstash.com/docs/qstash/features/deduplication
- https://upstash.com/docs/qstash/quickstarts/vercel-nextjs

| | Free | Pay-as-you-go | Fixed 1M / 10M |
|---|---|---|---|
| Price | $0 | $1 per 100K messages | $180/mo / $420/mo |
| Messages | 1,000/day | unlimited per day | 1M/day / 10M/day |
| Max delay | 7 days | 1 year | custom |
| Max message size | 1 MB | 10 MB | 50 MB |
| Active schedules | 10 | 1,000 | n/a |
| Max parallelism | 10 | not stated | not stated |
| Max HTTP response duration | 15 min | UNCONFIRMED | UNCONFIRMED |
| DLQ and log retention | 3 days | DLQ 7 days | not stated |

- **Fit for "call this URL at time T".** Very good. Publish with `Upstash-Not-Before: <unix seconds>` (SDK `notBefore`) or a relative `Upstash-Delay`. Each delivery attempt counts as a message, so retries are billed.
- **Retries.** Default is 3 retries on any non-2xx, with backoff `min(86400, e^(2.5n))` seconds. `Upstash-Retries` and `Upstash-Retry-Delay` tune it. Answering HTTP 489 with `Upstash-NonRetryable-Error: true` stops retrying.
- **Signatures.** QStash sends a JWT in the `Upstash-Signature` header. Verify with `Receiver` using `QSTASH_CURRENT_SIGNING_KEY` and `QSTASH_NEXT_SIGNING_KEY` (two keys give zero-downtime rotation). The Next.js quickstart has a `verifySignatureAppRouter(handler)` wrapper. It also needs `QSTASH_TOKEN` to publish.
- **Dedup is only a 10-minute window** (`Upstash-Deduplication-Id` or content-based). It does not replace our own idempotency in Postgres.
- **Integration.** The callback is a plain Route Handler on our own domain. QStash must reach a public URL. Under Vercel "Standard Protection" production domains are open and generated deployment URLs are protected (https://vercel.com/docs/deployment-protection, 2026-09-15). Target the production domain (`LABIA_PUBLIC_URL`), not `VERCEL_URL`. If the project uses "All Deployments" protection, the Protection Bypass for Automation header is needed.
- **Cost at LabIA scale.** 1,000 posts/month is about $0.01 on pay-as-you-go. The free tier's 7-day max delay is too short if users schedule more than a week ahead, so use pay-as-you-go.
- **Weak point.** The schedule lives outside our DB. Edit or cancel needs the stored message id (QStash supports cancel by id, UNCONFIRMED on the exact API call). The DB and QStash can drift.

### 2.2 Inngest

Sources (fetched 2026-10-06):
- https://www.inngest.com/pricing
- https://www.inngest.com/docs/usage-limits/inngest
- https://www.inngest.com/docs/guides/delayed-functions
- https://www.inngest.com/docs/guides/handling-idempotency
- https://www.inngest.com/docs/deploy/vercel

| | Free (Hobby) | Pro |
|---|---|---|
| Price | $0 | $99/mo |
| Executions | 50k/month | 1M included, then tiered $0.000050 down to $0.000015 each |
| Concurrent steps | 5 | 100 included, then $25 per 25 |
| Max sleep and run length | 30 days | 90 days |
| Event size | 256 KiB | 3 MiB |

- A step execution counts as an execution, and a 5-step function is billed as 6 executions. Max 1,000 steps per function, 4 MiB step output. Step timeout is up to 2 h, "subject to the function host's shorter timeout."
- Delayed start: set `ts` (unix ms) on the event, or `step.sleepUntil(...)` inside a function.
- Idempotency: event-id dedup and function-level CEL idempotency are both limited to 24 h. The docs say plainly that this is not enough for external side effects ("a request can succeed before Inngest records the step result"). They recommend sending a stable operation key to the downstream API.
- Vercel integration: `serve()` at `/api/inngest`, env `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY`. Each step is its own HTTP call into our app, so set `maxDuration` on that route.
- Fit: very good for "schedule, upload, poll, retry" with durable state. Free tier covers roughly 7–10k posts a month at about 5–7 executions each (my arithmetic). Costs: a new vendor, a second source of truth for the schedule, and per-step billing if we poll in a loop. Needs the Pro plan ($99/mo) once past 30-day schedules or 5 concurrent steps.

### 2.3 Trigger.dev (v3/v4)

Sources (fetched 2026-10-06):
- https://www.trigger.dev/pricing
- https://trigger.dev/docs/limits
- https://trigger.dev/docs/triggering
- https://trigger.dev/docs/wait-until
- https://trigger.dev/docs/config/extensions/prismaExtension

| | Free | Hobby | Pro |
|---|---|---|---|
| Price | $0 + $5 credit | $10/mo + $10 credit | $50/mo + $50 credit |
| Concurrent runs (prod) | 20 | 50 | 200+ |
| Log retention | 1 day | 7 days | 30 days |

- Compute is billed per second (Micro 0.25 vCPU is $0.0000169/s, Small 1x is $0.0000338/s). Each run adds $0.000025. Waits longer than 5 s are checkpointed and cost no compute.
- Trigger options: `delay: "1h"` or a `Date`, with no stated maximum delay. `idempotencyKey` with a default TTL of 30 days. API rate limit is 1,500 requests/minute.
- The limits page says "All runs have an enforced maximum TTL of 14 days." The page says this caps queueing time, not scheduling distance. UNCONFIRMED how it interacts with a `delay` of more than 14 days.
- Tasks are deployed to Trigger.dev Cloud, separately from Vercel. They run on Trigger infra with `TRIGGER_SECRET_KEY`. From a Server Action, import the task type-only.
- Fit: strongest for long video upload plus polling, because there is no function timeout. Costs: a second deploy pipeline and the DB secrets copied into Trigger's environment. The Prisma extension's "modern mode" supports Prisma 7 (beta or later) but needs adapters (`@prisma/adapter-pg` is the example) and a manual `prisma generate`. UNCONFIRMED: `@prisma/adapter-neon` as used by LabIA.
- Cost estimate, my arithmetic: a 2-minute Micro run is about $0.002, so 1,000 posts cost about $2, inside the $5 free credit.

### 2.4 Vercel Queues and Vercel Workflows (new, native to Vercel)

Sources (fetched 2026-10-06):
- https://vercel.com/docs/queues (2026-09-03)
- https://vercel.com/docs/queues/pricing (2026-08-12)
- https://vercel.com/docs/queues/concepts (2026-09-10)
- https://vercel.com/docs/workflows (2026-09-04)
- https://vercel.com/docs/workflows/pricing (2026-09-16)
- https://vercel.com/docs/workflows/concepts (2026-09-10)
- https://vercel.com/kb/guide/how-to-run-background-jobs-in-nextjs-on-vercel
- https://workflow-sdk.dev/docs/api-reference/workflow/sleep
- https://workflow-sdk.dev/docs/foundations/errors-and-retries
- https://workflow-sdk.dev/docs/foundations/versioning

**Vercel Queues**
- Status: the docs page says Beta, available on all plans, with config key `experimentalTriggers` of type `queue/v2beta`. The KB guide says "Generally Available". The two sources conflict. Treat it as Beta.
- Limits: delay before visible is up to 7 days (capped at the TTL). Message retention is 60 s to 7 days, default 24 h. Max message size is 100 MB. Visibility timeout is up to 60 min.
- Price: per operation, 4 KiB chunks. Hobby includes the first 1,000,000 operations. The Pro rate is "regional" and not shown on the page. UNCONFIRMED.
- Delivery: at-least-once. An idempotency key dedups publishes for `min(retention, 24h)`. Retries use a configured delay for the first 32 attempts and forced backoff after that. There is no built-in dead-letter queue. Consumer routes are private (no public URL), so no signature check is needed.
- Retry billing: a delivery that times out is billed for the function's full `maxDuration`.
- **Deployment pinning.** Topics are partitioned by deployment ID, and in push mode messages go back to the deployment that published them. A post scheduled 5 days out runs the code that existed when it was scheduled. Bug fixes will not apply to it. If that deployment is deleted, it never runs. Default retention is 1 year for Production on Pro, but only the last 3 Production deployments on Hobby (30 days) from https://vercel.com/docs/deployment-retention (2026-09-16).

**Vercel Workflows**
- Open-source Workflow SDK (`npm i workflow`, `withWorkflow` in `next.config`, `start()` from a route). The KB guide labels it Generally Available. The SDK's own pages mention a `5.0.0-beta.x` line for multi-region. UNCONFIRMED which SDK line is production-stable on Next 16.
- `await sleep(new Date(...))` suspends until an absolute time with no compute used. Maximum sleep and maximum run duration are "No limit."
- Steps (`'use step'`) retry up to 3 times by default (4 attempts). `FatalError` skips retries, `RetryableError({retryAfter})` customizes them. The docs say step side effects must be idempotent, because a lost response does not prove the write failed.
- Price: Hobby includes 50,000 events/month and 1 GB written. On-demand is $0.02 per 1K events, $0.50/GB written, $0.50/GB-month retained (Pro only). Retention after completion is 1 day on Hobby, 7 days on Pro. Function compute is billed at normal rates. It runs on Queues underneath.
- Estimate, my arithmetic: a step is 3 events, so a post of about 5–7 steps is about 20 events. 1,000 posts is about 20k events, or $0.40 on-demand (UNCONFIRMED).
- Same pinning behavior: "Workflows keep running on the deployment they were created on." A run on a deleted deployment "never completes or fails on its own." Upgrading means cancelling and restarting on the latest deployment.

### 2.5 Fit summary for "call this endpoint at time T with retries"

| Option | Schedule truth lives in | Runs latest code at T | New vendor | Edit/cancel | Cost at ~1–3K posts/mo |
|---|---|---|---|---|---|
| Vercel Cron + DB table | our DB | yes | no | trivial (UPDATE) | about $0.3 on top of Pro $20 |
| QStash delayed message | QStash (id stored in DB) | yes (hits current prod URL) | yes | cancel by id | about $0.01–0.03 |
| Inngest | Inngest | no (the code serving `/api/inngest` at that moment) | yes | `cancelOn` / API | free tier |
| Trigger.dev | Trigger | no (deployed task version) | yes | API | free credit |
| Vercel Queues (Beta) | Vercel | no (pinned deployment) | no | harder | cents |
| Vercel Workflows | Vercel | no (pinned deployment) | no | cancel run | cents |

Note on Inngest: UNCONFIRMED whether it runs the latest code or a pinned one. The docs I read describe a `serve()` endpoint that Inngest calls, which suggests the code live at that URL, but I did not find an explicit statement.

---

## 3. Postgres-native options on Neon

Sources (fetched 2026-10-06):
- https://neon.com/docs/extensions/pg_cron
- https://neon.com/docs/extensions/pg-extensions
- https://neon.com/docs/compute/functions/triggers/schedule
- https://neon.com/docs/compute/functions/triggers/overview
- https://neon.com/blog/your-neon-functions-can-now-run-on-a-schedule (2026-09-21)
- https://neon.com/docs/connect/connection-pooling
- https://www.postgresql.org/docs/current/sql-select.html

- **pg_cron exists on Neon (v1.6) but is the wrong tool.**
  - "Jobs only run when the compute is active, so pg_cron is best suited for computes with scale-to-zero disabled." That means paying for an always-on compute.
  - `cron.schedule_in_database()` is not supported, so it runs in one database only.
  - Intervals of 1–59 seconds are allowed.
  - It runs SQL only. `pg_net`, `http` (pgsql-http) and `pg_background` are not in Neon's supported-extension table, so it cannot call an HTTP API.
  - Neon's own docs say scheduled Function Triggers "are usually the better choice."
  - Verdict: usable at most for housekeeping SQL (for example expiring leases), never for publishing.
- **Neon scheduled Function Triggers.**
  - Cron expression in UTC, "down to every minute". Only recurring schedules, no one-off timestamps. It fires even when the compute is scaled to zero.
  - The 2026-09-21 blog post says GA. The docs pages do not state a status, timeout, retry policy, or price. UNCONFIRMED on all of those.
  - Verdict: it would only replace Vercel Cron as the ticker, adds a new platform, and has unknown limits. Not recommended.
- **"Due jobs" table with `FOR UPDATE SKIP LOCKED`.**
  - Postgres docs: skipping locked rows "is not suitable for general purpose work, but can be used to avoid lock contention with multiple consumers accessing a queue-like table."
  - Neon pooled connections use PgBouncer in transaction mode. Session-level advisory locks, `SET`, and `LISTEN/NOTIFY` are not supported there. Use a row-level lease instead.
  - Do not hold a transaction open across the publish call. If the function dies mid-transaction, the lock vanishes and the row looks due again, which can double-publish. Claim in one short committed statement, then do the external call outside any transaction.
  - Sketch (run with `prisma.$queryRaw`):

```sql
-- claim: one atomic statement, committed immediately
UPDATE scheduled_posts p
   SET status = 'publishing', attempts = attempts + 1,
       lease_until = now() + interval '10 minutes'
 WHERE p.id IN (
   SELECT id FROM scheduled_posts
    WHERE status = 'scheduled' AND scheduled_at <= now()
    ORDER BY scheduled_at
    LIMIT 5
    FOR UPDATE SKIP LOCKED)
RETURNING p.*;
```

---

## 4. Vercel function limits for "upload a video and wait"

Sources (fetched 2026-10-06):
- https://vercel.com/docs/functions/limitations (2026-08-24)
- https://vercel.com/docs/functions/configuring-functions/duration (2026-08-24)
- https://vercel.com/docs/functions/usage-and-pricing (2026-06-16)
- https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package (2026-09-03)
- https://nextjs.org/docs/app/api-reference/functions/after (Next 16.3.8 docs)
- https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions

| Limit (Fluid compute, on by default) | Hobby | Pro / Enterprise |
|---|---|---|
| Max duration, default | 300 s | 300 s |
| Max duration, maximum | 300 s | 800 s (GA); 1800 s (Beta, per-function config, `nodejs20.x`/`22.x`/`24.x`) |
| Memory / CPU | 2 GB / 1 vCPU | default 2 GB / 1 vCPU, up to 4 GB / 2 vCPU |
| Request or response body of a function | 4.5 MB | 4.5 MB |
| Bundle size | 250 MB uncompressed | 250 MB |
| Concurrency | auto-scales to 30,000 | 30,000 (Enterprise 100,000+) |

- Set it per route in the App Router: `export const maxDuration = 300;`. The 1800 s extended value requires a per-function setting and is Beta. Secure Compute and Static IPs cap at 800 s.
- On timeout the invocation returns a 504 (`FUNCTION_INVOCATION_TIMEOUT`) and in-flight `waitUntil` promises are cancelled.
- Billing: Active CPU is not billed while the code waits on I/O, but Provisioned Memory continues. Waiting in a function is cheap but not free.
- **The 4.5 MB limit applies to the function's own request and response body.** The docs do not address outbound requests the function makes. My reading is that a 5–30 MB upload that the function sends outward is not covered, since the video would come from Blob and go to the provider. UNCONFIRMED by an explicit statement. The user's browser must still upload videos straight to Vercel Blob. LabIA already does this for imports (4 MiB cap today, per `PROJECT_STATUS.md`).
- **Prefer URL-pull over streaming through the function** when the provider supports it (signed Blob URL). Otherwise stream from Blob with `fetch(blobUrl)` straight into the provider request. UNCONFIRMED per provider; I did not research individual social APIs.
- **`after()` / `waitUntil`.**
  - `after()` is stable since Next 15.1.0. It works in Server Components, Server Functions (Server Actions), Route Handlers and Proxy.
  - It runs for "the platform's default or configured max duration of your route." Vercel implements it with `waitUntil`, and the promises share the function's timeout.
  - It runs even if the response errored. In Route Handlers and Server Actions you can read `cookies()` and `headers()` inside it; in Server Components you cannot.
  - Fit: good for "publish now" (return the response, publish in the background). Not good for a post due in 3 days. It has no durability if the instance dies. Use it only after the DB state has been written.
- Our own polling today runs from the browser. For scheduled posts nobody has the page open, so a server-side ticker is required.

---

## 5. Storing OAuth tokens in Postgres (Node `crypto`)

Sources (fetched 2026-10-06):
- https://nodejs.org/api/crypto.html (createCipheriv, GCM)
- https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
- NIST SP 800-38D §8.3 (2^32 limit for random 96-bit IVs): confirmed only through secondary summaries in a web search, UNCONFIRMED against the primary document.

**Design**
- Algorithm AES-256-GCM, 32-byte key, fresh random 12-byte IV for every encryption, 16-byte auth tag.
- **Bind to the row with AAD** (`accountId:column`). A ciphertext copied to another row then fails to decrypt.
- **Keys live in an env var, data lives in Neon.** OWASP: "Encryption keys should be stored in a separate location from encrypted data." Vercel env vars (Production only, never Preview) plus Neon satisfy this at this scale. KMS or envelope encryption is the next step if the threat model grows.
- **Key rotation.**
  - The stored string carries a key id (`v2.<iv>.<tag>.<ct>`).
  - `TOKEN_KEYS` holds all active keys; `TOKEN_KEY_ID` names the current one.
  - Rotation: add the new key and switch `TOKEN_KEY_ID`. New writes use it, old rows still decrypt. Re-encrypt lazily on read (`needsRotation`) or with a script. Drop the old key only when `SELECT count(*) WHERE token_enc NOT LIKE 'v2.%'` is 0.
  - OWASP: the rotation code and process must exist before a compromise.
- **Refresh-token races.** Many providers invalidate the old refresh token on use. Two concurrent refreshes can burn it. Serialize per account: take a row lock on the account around the refresh, or use a compare-and-set on a `token_version` column. Write the new refresh token and expiry in the same statement.
- **Never log:** access or refresh tokens, `Authorization` headers, OAuth `code`, `state` or PKCE verifier, full request or response bodies of token endpoints, `fetch`/axios error objects (they carry request headers), or Prisma query logs with parameters on token tables. Do not put tokens in URLs (paths and queries reach Vercel logs). Do not return them from Server Actions or pass them to client components. Log only account id, provider, expiry time and error class.
- Decrypt at the point of use (inside the publish worker), keep plaintext in a local variable, never cache it.

**Sketch (about 22 lines)**

```ts
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
// TOKEN_KEYS='{"1":"<base64 of 32 bytes>","2":"<base64 of 32 bytes>"}'  TOKEN_KEY_ID=2
const keys = (): Record<string, Buffer> => Object.fromEntries(
  Object.entries(JSON.parse(process.env.TOKEN_KEYS!)).map(([k, v]) => [k, Buffer.from(v as string, "base64")]));

export function seal(plain: string, aad: string): string {
  const kid = process.env.TOKEN_KEY_ID!;
  const iv = randomBytes(12);                              // new random 96-bit IV every time
  const c = createCipheriv("aes-256-gcm", keys()[kid], iv); // throws if the key is not 32 bytes
  c.setAAD(Buffer.from(aad));                              // e.g. `${accountId}:refresh_token`
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  const b64 = (b: Buffer) => b.toString("base64url");
  return [`v${kid}`, b64(iv), b64(c.getAuthTag()), b64(ct)].join(".");   // read the tag after final()
}

export function open(sealed: string, aad: string) {
  const [v, iv, tag, ct] = sealed.split(".");
  const d = createDecipheriv("aes-256-gcm", keys()[v.slice(1)], Buffer.from(iv, "base64url"));
  d.setAAD(Buffer.from(aad));
  d.setAuthTag(Buffer.from(tag, "base64url"));             // before final(); throws on tamper, wrong key or wrong AAD
  const plain = Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
  return { plain, needsRotation: v.slice(1) !== process.env.TOKEN_KEY_ID };
}
```

Node note: from v26 a GCM tag other than 128 bits must be declared with `authTagLength` on the decipher. The default 16-byte tag is fine. Also validate in a test that every key is exactly 32 bytes.

---

## 6. Recommendation

### 6.1 One data model for both strategies

A single `scheduled_posts` table with a `scheduler` column (`self` or `aggregator`) keeps one state machine and one UI.

Columns:
- `id`, `user_id`, `social_account_id`, `content_id`
- `scheduled_at timestamptz` (UTC; store the user's IANA zone separately for display)
- `status`: `scheduled | publishing | processing | published | failed | needs_review | missed | cancelled`
- `submit_state`: `not_submitted | submitting | submitted | submission_unknown` (the same pattern LabIA already uses for fal)
- `operation_key UNIQUE`
- `lease_until`, `attempts`, `next_check_at`
- `provider_ref` (container, upload or post id), `provider_post_id`
- `last_error` (a code, never the raw payload)

Indexes: a partial index on `(scheduled_at) WHERE status = 'scheduled'` and one on `(next_check_at) WHERE status = 'processing'`.

### 6.2 (a) We schedule ourselves: Vercel Cron + due-jobs table. Recommended.

Why, in order:
1. The DB is the only source of truth. Edit, cancel, reschedule and "what is due" are plain SQL, and cannot drift from an external scheduler.
2. It always runs the latest production code. Queues and Workflows pin to the deploying version, and a scheduled post would run old code.
3. No new vendor, no new secret, one deploy pipeline. It follows the repo rule "prefer deleting or reusing to adding."
4. A missed or duplicated tick (Vercel documents both) is harmless, because each tick re-reads what is due. That is exactly the reconciliation design Vercel recommends.
5. Minute precision is enough for social posting.

Requirements and costs:
- **Pro plan** ($20/month, includes $20 credit). Hobby cannot run per-minute crons and is non-commercial only. If the project is on Hobby today, it must upgrade before this ships.
- `vercel.json`: `"crons": [{ "path": "/api/cron/publish-due", "schedule": "* * * * *" }]`.
- Set `CRON_SECRET` and check it with a constant-time compare. Exclude `/api/cron/*` (and later `/api/webhooks/*`) from any auth or rewrite logic. The repo has no proxy file, only the `/` landing rewrite in `next.config.ts`.
- Add a mock provider (like `FAL_MOCK`) because Preview and Dev never get cron ticks. Test by calling the route by hand.

Tick handler flow:
1. **Claim** up to N due rows with the lease statement from section 3. Also pick up `publishing` rows whose lease expired and whose `submit_state` is still `not_submitted` (safe to restart).
2. **Prepare (idempotent, retryable freely):** refresh the OAuth token, upload the video or create the provider container, and persist `provider_ref`. Nothing public has happened yet, so a crash here simply restarts.
3. **Processing:** do not sit in a loop for minutes. Set `status = 'processing'` and `next_check_at = now() + 30s`. Later ticks poll. This mirrors the existing `/refresh` polling and survives function death. If a provider needs a final "publish" call after processing, that is the next step.
4. **The one unsafe call (the public publish).** Do the compare-and-set first, then send:

```sql
UPDATE scheduled_posts
   SET submit_state = 'submitting', submit_started_at = now()
 WHERE id = $1 AND status IN ('publishing','processing')
   AND submit_state = 'not_submitted' AND lease_until > now()
RETURNING id;      -- 0 rows => do NOT send
```

   Send with the provider's idempotency token if it has one (use `operation_key`), under an `AbortSignal.timeout` shorter than the remaining deadline (`getDeadline()` from `@vercel/functions`). Then record the outcome:
   - definitive 2xx with a post id: `submitted`, `published`
   - definitive 4xx that proves nothing was created: `failed` with a code
   - anything else (timeout, connection reset after bytes were sent, 5xx, the function killed): `submission_unknown`

5. **Sweeps each tick:**
   - `submitting` rows older than 5 minutes become `submission_unknown` (the same rule LabIA uses for fal).
   - Rows more than a set lateness past `scheduled_at` (suggest 6 hours; product decision) become `missed` and ask the user, instead of posting stale content at an odd time.

Other points:
- **Overlap safety.** Tick N+1 may start while tick N runs. The lease and the compare-and-set make that safe. Use `maxDuration` 300 (or up to 800 on Pro) and `getDeadline()` to stop claiming new work near the deadline.
- **Throughput.** At tens to low thousands of posts per month there will be at most a few per tick. Process up to about 3 concurrently with `Promise.allSettled`. If it grows, make the tick only claim and fan out to per-post invocations.
- **When to graduate.** Move to Inngest, Trigger.dev or Vercel Workflows if posts reach many thousands per day, you need sub-minute precision, or one publish needs more than 800 s. Of those, Trigger.dev suits long uploads best, and Inngest or Workflows suit multi-step orchestration. All of them still need the operation key and the ambiguity rule below.
- **Optional hybrid.** QStash delayed messages can reduce latency, with cron as the sweeper. It adds complexity for little gain at this scale, so skip it for now.
- **Hobby-only fallback, not for production.** A QStash Schedule every 2 minutes (720 messages/day, under the 1,000/day free cap) could ping the endpoint. Hobby's commercial-use restriction still applies.

### 6.3 (b) The aggregator schedules, we track status

Flow: we create the post at the aggregator with `scheduleDate`. We then only receive webhooks and run a light reconciliation.

State machine: `draft -> submitting -> scheduled_remote (provider_post_id) -> published | failed | cancelled`.

Rules:
1. **The create call is the ambiguous one.** A timeout after sending can still have created the post.
   - Send our `operation_key` as the aggregator's idempotency key or reference field if it has one. Ayrshare's docs I found do not show an `idempotencyKey`, so check each vendor. UNCONFIRMED per vendor.
   - Without one, put the key in a field the API echoes back, and on `submission_unknown` look the post up by it (list or search) before any resend.
   - If it can neither be looked up nor deduplicated, do not auto-retry. Show the user "could not confirm" with explicit actions.
2. **Webhooks are at-least-once and can be lost.**
   - Ayrshare (https://www.ayrshare.com/docs/apis/webhooks/overview, fetched 2026-10-06): retries on 429, 408, 425, 5xx and timeouts for up to 9 attempts; the same `hookId` on retries but a new one for a fresh notification of the same event; HMAC-SHA256 over the body in `X-Authorization-Content-SHA256` plus `X-Authorization-Timestamp`; respond 200 within 15 s; keep dedup claims for at least 24 h. Other aggregators vary (Publora, PostEverywhere also sign with HMAC), so confirm per vendor.
   - Handler: read the raw body (`await req.text()`), verify the HMAC with `timingSafeEqual`, reject stale timestamps, then `INSERT INTO webhook_events (provider, event_key) ... ON CONFLICT DO NOTHING`. The key is `hookId` plus one derived from the payload. Answer 200 quickly and apply the change after.
   - Apply transitions monotonically: `UPDATE ... SET status = 'published' WHERE id = $1 AND status IN ('scheduled_remote','submission_unknown')`. A terminal state is never overwritten, so out-of-order events cannot regress it.
3. **Reconciliation cron.** Every 5–15 minutes on Pro, poll the aggregator for posts past `scheduled_at + grace` without a terminal status. Also expose a "refresh" action when the user opens the page, like the existing `/refresh` route.
4. **Edit and cancel go through the aggregator API**, and only while the remote status allows it (Ayrshare requires `pending` to update, per its docs). Record the remote status in our row before and after.
5. The aggregator's own OAuth tokens or profile keys go through the same encryption as in section 5.

### 6.4 "Never publish twice" invariants (both strategies)

1. `UNIQUE(operation_key)`: a double-click or retried Server Action creates one row. The server recomputes everything, as it already does for money-moving actions.
2. Every state change is a compare-and-set (`UPDATE ... WHERE status = expected RETURNING`). If 0 rows are returned, someone else already moved the row, so stop.
3. The lease says who is working. It is not proof of uniqueness. The `submit_state = 'submitting'` compare-and-set is what decides who may send, and it must succeed before the publish call.
4. Only the final public publish is unsafe to repeat. Upload, container creation and token refresh can be retried freely. Keep the unsafe call as small and as late as possible.
5. Use the provider's idempotency token when one exists. Where a provider's container or upload handle is single-use, that helps but is UNCONFIRMED per provider.
6. **Ambiguous result (timeout after sending, killed function, 5xx after bytes sent):** mark `submission_unknown` and never resend automatically.
   - First try an automatic lookup: provider-side search by our reference, or compare recent posts on the account by `provider_ref` or media id.
   - Found: mark `published`. Not found after a safe waiting window: mark `needs_review`.
   - `needs_review` is a human decision, exactly like the existing fal reconciliation (an owner action in `/admin` or a script), or a user choice in the UI with the duplicate risk stated: "Já publicou" or "Tentar de novo".
7. Terminal states are immutable. Webhooks and sweeps only move rows forward.
8. Everything the user will see for failures is a controlled code mapped to PT-BR copy, never the raw provider error (the same rule the repo already applies to provider errors).

### 6.5 Decision

- Build (a) first: Vercel Cron every minute plus the `scheduled_posts` table, on the Pro plan. Estimated about $0.3/month of compute over the $20 platform fee.
- If an aggregator is chosen, build (b) behind the same table and adapter interface. The cron is then only the reconciler.
- Revisit Inngest, Trigger.dev or Vercel Workflows only when a trigger from "When to graduate" is hit.

### 6.6 Open items to resolve before building

- Confirm the Vercel plan and the function region.
- Confirm the Deployment Protection scope on the project (needed for QStash or aggregator webhooks).
- Per provider (Instagram, TikTok, YouTube, or the chosen aggregator): idempotency token support, lookup-by-reference, video upload method (URL pull or chunked), and processing-poll limits. I did not research individual social APIs.
- Product decision: lateness cutoff for `missed` posts.
- Decide whether `TOKEN_KEYS` goes in Production only (recommended) and who rotates it.
