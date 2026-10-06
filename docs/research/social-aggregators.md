# Unified social posting APIs (aggregators): build-vs-buy research for LabIA "Integracoes"

Research date: 2026-10-06. Every page below was fetched on 2026-10-06 unless a different date is stated next to it. Prices are USD per month, list price, monthly billing, excluding tax, excluding X API pass-through fees (those are handled separately in section 4). Anything I could not confirm on an official page is marked UNCONFIRMED. Vendor marketing pages are self-interested; where a number comes from a vendor's own comparison page I say so.

Nothing in this report was tested with a real account or API key. It is document and pricing-page research only.

---

## 0. TL;DR

1. Nobody on the market offers a true "sandbox that behaves like production but never posts publicly" for multi-tenant publishing, with one possible exception (Postproxy claims it; I could not read its doc page). Plan on: our own mock adapter (same idea as `FAL_MOCK=1`) + draft/validate endpoints + private test accounts.
2. The "aggregator pays X for me" assumption is only partly true. Zernio, bundle.social and Upload-Post host the X app. Ayrshare, Outstand and Postproxy require us to register our own X developer app (BYO keys) and pay X directly. In every case X's pay-per-use fee ($0.015 per post, $0.200 per post containing a URL) is ours to pay or is baked into the vendor price. This is a constant in every build-vs-buy option.
3. For LabIA's shape (many tenants, 2-3 accounts each, only ~30 posts per user per month) the billing unit matters more than the headline price. Per-profile or per-account pricing (Ayrshare, Zernio, Upload-Post, Publora, Postproxy) grows with the number of users even if they never post. Per-post pricing (bundle.social, Outstand, Post for Me) grows with actual usage and is 4x to 20x cheaper at 500 users.
4. Ranked recommendation (details in section 6):
   - 1st: bundle.social (cheapest fit for the billing model, real multi-tenant primitives, hosted portal link with logo and language, X managed with pass-through).
   - 2nd: Zernio (formerly Late; best docs and multi-tenant guide, X managed, dry-run validation; linear per-account cost).
   - 3rd: Outstand (flat $129 for 50k deliveries, resale explicitly permitted, bring-your-own-OAuth-app path for later; X is BYO, no SLA).
   - Runners-up worth a spike: Upload-Post (explicit white-label terms, Portuguese connect page), Postproxy (claims sandbox, but founded 2026), Ayrshare (most mature, but 3x to 6x the price and X is BYO).
5. Lock-in: the code is cheap to make swappable, the user connections are not. OAuth tokens live in the vendor. Switching vendor means every end user must reconnect every account. Pick the vendor before reaching hundreds of users, and keep a thin internal `Publisher` interface so the only cost is the reconnect campaign.

### Master comparison (details and sources in sections 3 to 5)

Scenario costs are monthly USD, list price, excluding X pass-through. (a) = 9 accounts / 60 posts, (b) = 50 users / 100 accounts / 1,500 posts, (c) = 500 users / 1,500 accounts / 15,000 posts.

| Provider | X, LinkedIn, Instagram, TikTok, Threads, YouTube | (a) | (b) | (c) | Multi-tenant | White-label connect | Hosts X app (we skip our own) | Test mode |
|---|---|---|---|---|---|---|---|---|
| bundle.social | all Y (TikTok needs privacy fields) | $100 | $100 | $400 | Yes (org > teams) | Partial (portal logo + language; consent shows bundle) | Yes, prepaid pass-through | No (draft only) |
| Zernio (ex-Late) | all Y (TikTok public-only via Business lane, else inbox draft) | $42 | $318 | $1,718 | Yes (profiles, scoped keys) | Partial (headless mode; consent shows Zernio) | Yes, exact pass-through | Partial (dry-run validate, draft, webhook test) |
| Outstand | all Y (TikTok default inbox draft) | $19 | $129 | $129 | Partial (flat accounts, we map users) | Yes via BYOK (own OAuth apps, own approvals) | No (BYO X) | No |
| Upload-Post | all Y (TikTok direct or draft, capped) | $24 | $105 | $713 | Yes (profiles) | Yes (hosted page with `pt`, plus Connect API) | Yes (cost handling UNCONFIRMED) | No (CLI dry-run only) |
| Postproxy | all Y | $33 | $109 | $599 to $699 | Yes (profile groups) | Unclear | No (BYO X) | Claimed on all plans (UNCONFIRMED) |
| Ayrshare | all Y | $299 | $779 | $2,624 (likely Enterprise quote) | Yes (Business, Launch up to 10) | Yes (hosted page logo/CSS; widget with Max Pack) | No (BYO X, brand shows on X consent) | Staging server (Max Pack), live accounts |
| Post for Me | all Y | $10 | $25 | $150 | Partial (projects + external IDs) | Yes (white-label project with own credentials) | Yes in Quickstart project (vendor claim) | UNCONFIRMED |
| Publora | all Y | $42 | about $154 (workspace pricing UNCONFIRMED) | about $1,540 (same) | On request (Workspace API) | UNCONFIRMED | UNCONFIRMED | Token test only |
| Postiz Cloud | all Y | $39 | $99 (single org, 100 create-post requests/hour) | not feasible | No (not for resale) | No | n/a | No |
| Mixpost (self-host, Pro $299 one-time) | all Y | $299 one-time | $299 one-time | $299 to $1,199 one-time | Yes | Yes (self-hosted) | No (we do all app reviews) | n/a |
| Buffer | own-account API only | $45 | n/a | n/a | No | No | n/a | No |
| Blotato | dashboard-connected only | $29 | n/a | n/a | No | No | n/a | No |

---

## 1. Scenarios and assumptions used for costing

LabIA tenancy model: user -> personas -> social accounts. For aggregators that group accounts per "profile" (one account per network per profile), I treat one persona as one profile.

| | Tenant units (profiles / teams / groups) | Connected accounts | Publications per month |
|---|---|---|---|
| (a) 2 founders, 3 personas, ~3 accounts each | 3 | 9 | 60 |
| (b) 50 users, 2 accounts each, 30 posts/user | 50 (1 persona per user) | 100 | 1,500 |
| (c) 500 users, 3 accounts each, 30 posts/user | 500 (1 persona per user) | 1,500 | 15,000 |

"Publication" = one post delivered to one account. Where a vendor bills per delivery, a post fanned out to all of a user's accounts multiplies the count; I show that sensitivity in section 5.

Sensitivity: if each user has several personas, tenant units multiply (profile-priced vendors get more expensive; post-priced vendors do not change).

---

## 2. Findings that change the decision (read first)

### 2.1 Late (getlate.dev) is now Zernio (zernio.com)
- Confirmed rebrand. Brand, domain (getlate.dev -> zernio.com), docs (docs.zernio.com), Node SDK (`@getlatedev/node` -> `@zernio/node`), Python SDK and env var were renamed. API endpoints, keys, webhooks and pricing were stated to be unchanged; old SDKs work for at least 6 months. Source: https://zernio.com/rebrand (the page does not show a date; the rebrand date is UNCONFIRMED, an independent review dated 2026-08-01 already uses the Zernio name).
- Company: Zernio Software SL, Girona/Palamos, Spain; 9-person bootstrapped team per https://zernio.com/about; Terms last updated 2026-10-06 at https://zernio.com/tos.
- Pricing-history risk: search results on AppSumo / Trustpilot / a Late feedback board report that the early AppSumo lifetime-deal customers were moved to a new pricing model that was "roughly tenfold" more expensive for some. I could not open the primary threads, so treat the size as UNCONFIRMED; the direction (a pricing model change after the rebrand that upset early customers) is corroborated by several search hits. Today's pricing is simple and public (section 5).
- No vendor from your list has shut down. Nobody was dropped for shutdown. Buffer is dropped for a different reason (section 7).

### 2.2 X (Twitter) API is now pay-per-use, and aggregators split two ways
- X's own docs (https://docs.x.com/x-api/getting-started/pricing, seen 2026-10-06): credit-based pay-per-use, no subscription tiers listed. Post create $0.015; post create containing a URL $0.200; post read $0.005 per resource; user read $0.010; DM create $0.015.
- Third-party summaries (https://bundle.social/blog/x-api-pricing-2026-costs-limits dated 2026-07-27): subscription tiers replaced by pay-per-use in February 2026. The date and size of the "post with URL" price increase (search snippets of opentweet.io and blotato.com blogs say it jumped from $0.01 to $0.20 on 2026-04-20) is UNCONFIRMED on an official X page; X's docs only show the current $0.200 figure.
- Who hosts the X app (so no BYO app needed from us):
  - Zernio: yes, "passed through at X's exact rates, zero markup" (https://docs.zernio.com/pricing.mdx). A card on file is required before `GET /v1/connect/twitter` works (HTTP 402 otherwise).
  - bundle.social: yes, prepaid credit balance, pass-through at cost, billing live from 2026-08-16 (https://bundle.social/pricing.md).
  - Upload-Post: yes, they manage the app; they strip URLs from X posts by default to keep X's $0.015 tier, and sell an "X Links" add-on ($19/month, 50 link-posts) (https://docs.upload-post.com/guides/x-links-addon). Whether X cost is inside the plan price or billed separately is UNCONFIRMED (docs imply it is absorbed, with per-plan daily X caps of 10 to 30).
  - Post for Me: "Quickstart project" uses their credentials; a comparison page says X cost is included in the subscription (vendor claim, UNCONFIRMED how link posts are handled).
- Who requires BYO X keys (we create the X developer app and fund X credits):
  - Ayrshare: "Starting March 31, 2026, all X/Twitter operations require your own API credentials". One X app for the whole account, reused for all sub-profiles; the X app name appears on the consent screen, so it is white-label for X (https://www.ayrshare.com/docs/dashboard/connect-social-accounts/x-twitter-byo-keys.md). Ayrshare calls this "a platform-wide change mandated by X", which Zernio/bundle/Upload-Post's behavior contradicts; the true policy is UNCONFIRMED. Treat "aggregator-hosted X app" as something that could disappear and keep our X credentials configurable.
  - Outstand: X, Google Business, Vimeo and Reddit need customer-owned credentials (https://www.outstand.so/llms.txt, updated 2026-10-05).
  - Postproxy: "X (Twitter) - bring your own keys" (https://postproxy.dev/guides/twitter-byo-keys/).
- Practical reading: creating one X developer app and loading credits is a ~10 minute task (Ayrshare's own estimate); it is not the Meta/TikTok/LinkedIn approval gauntlet. BYO X is a mild cost, not a blocker.

### 2.3 TikTok direct posting is capped per aggregator app
- TikTok limits how many distinct creators can direct-post through one developer app per 24 hours. This is shared across all customers of that aggregator. Seen in: Upload-Post (`reached_active_user_cap`, automatic fallback to inbox draft since June 2026, https://docs.upload-post.com/guides/reached-active-user-cap-error), Outstand (`DIRECT_POST` counts against the cap, default is inbox draft `MEDIA_UPLOAD`), Zernio (new connections go through TikTok's Business app lane that is exempt, but video from that lane can only be public; non-public needs an inbox draft).
- Implication for AI influencer personas: reliable fully automatic TikTok publishing is the weakest part of every aggregator. Design the UX to accept "draft in TikTok inbox, finish in app" as a valid outcome.

### 2.4 AI-generated content labeling
- Zernio exposes TikTok `video_made_with_ai` and YouTube AI disclosure flags (https://docs.zernio.com/platforms/tiktok.mdx). Upload-Post exposes a cross-platform `is_ai_generated` flag mapped to TikTok `is_aigc`, Instagram `is_ai_generated`, YouTube `containsSyntheticMedia`, X `made_with_ai` (https://docs.upload-post.com/guides/ai-content-labeling). Not verified for the others.
- ToS: Upload-Post (https://www.upload-post.com/terms-of-use section 3.3) puts labeling responsibility on the publisher and references EU AI Act Art. 50(4). bundle.social bans AI media used "to deceive, defraud, impersonate" (https://bundle.social/terms). Ayrshare, Zernio, Post for Me ToS have no AI-specific clause I could find. LabIA must carry its own "this persona is AI" disclosure policy regardless of vendor.

---

## 3. Networks supported for publishing, by provider

Legend: Y = documented as supported for publishing; Y* = supported with a caveat; ? = UNCONFIRMED; - = not supported.
All "video" cells assume 9:16 MP4 of 5 to 30 s, which is within every limit I found (e.g. Instagram Reels max 90 s and 300 MB per Zernio docs; TikTok 3 s to 10 min and 4 GB).

| Provider | X | LinkedIn profile | LinkedIn company page | Instagram (Reels, image, carousel) | TikTok | Threads | YouTube (Shorts) | Facebook | Bluesky |
|---|---|---|---|---|---|---|---|---|---|
| Ayrshare | Y (BYO X keys) | Y | Y | Y (needs Business or Creator account) | Y* (direct post) | Y | Y | Y | Y |
| Zernio (ex-Late) | Y (text, image, video, threads, polls) | Y | Y (org pages, multi-org) | Y (Reels, carousel up to 10, Stories) | Y* (video + 35-photo carousels; public-only on Business-app lane; inbox drafts) | Y | Y | Y | Y (app password, not OAuth) |
| Upload-Post | Y | Y | Y | Y | Y* (direct or draft; cap fallback) | Y | Y | Y | Y |
| bundle.social | Y | Y | Y ("LinkedIn Company API" page) | Y | Y* (privacy and interaction fields required) | Y | Y | Y | Y |
| Outstand | Y (BYO) | Y | Y | Y | Y* (default = inbox draft; direct post optional, capped) | Y | Y | Y | Y |
| Post for Me | Y | Y | ? | Y | Y | Y | Y | Y | Y |
| Publora | Y | Y | ? | Y | Y | Y | Y | Y | Y |
| Postproxy | Y (BYO) | Y | Y (`organization_id`) | Y (post, reel, story) | Y | Y | Y | Y | Y |
| Buffer (public API) | Own-account API only; documented ops are text and image posts; no end-user channel connect | - | - | - | - | - | - | - | - |
| Blotato | via dashboard-connected accounts only | | | | | | | | |
| Unipile | X "coming soon" | Y (reverse-engineered) | ? | Y (reverse-engineered) | - | - | - | - | - |

Sources: Ayrshare https://www.ayrshare.com/docs/apis/post/social-networks/overview.md; Zernio https://docs.zernio.com/platforms.mdx and per-platform pages; Upload-Post https://www.upload-post.com/llms-full.txt; bundle https://bundle.social/llms.txt; Outstand https://www.outstand.so/llms.txt; Post for Me https://www.postforme.dev/llms.txt; Publora https://publora.com/llms.txt; Postproxy https://postproxy.dev/llms.txt; Buffer https://developers.buffer.com/guides/getting-started.md; Unipile https://www.unipile.com/pricing-api/.

---

## 4. Multi-tenant, white-label, scheduling, test mode: comparison

### 4.1 Multi-tenant model and connect flow

| Provider | Tenant primitive | How an end user connects | Consent screen branding / own OAuth apps | Uses vendor's already-approved Meta/TikTok/LinkedIn apps? |
|---|---|---|---|---|
| Ayrshare (Business plan and up for sub-profiles) | "User Profile" per customer; one profile can hold any number of networks (one account per network) | Link session URL (`POST /api/profiles/link-sessions`, 5 min default, up to 48 h with Max Pack) to a hosted page with your logo, colors, custom CSS. Embedded widget needs Max Pack ($300/month). Hosted page cannot be iframed. | Network consent shows Ayrshare's app. Only X is BYO (your X app name shows). No BYO for Meta/TikTok found. | Yes, except X |
| Zernio | "Profile" per customer (profiles free; accounts metered); scoped API keys per profile; webhook endpoints can be scoped to profiles | `GET /v1/connect/{platform}?profileId=` returns `authUrl`; Zernio hosts selection screens (Facebook Page, LinkedIn org, Pinterest board) or `headless=true` to draw our own | Consent shows Zernio's app. Its docs mention "BYOK" (own X API credentials) for X, but no BYO-app option for other networks. Own-brand OAuth apps: UNCONFIRMED (enterprise?) | Yes, including X |
| Upload-Post | "Profile" per user (one account per platform); white-label from Professional plan | Hosted `access_url` JWT page (48 h) with logo, title, texts, language incl. `pt`; or Connect API (`POST /api/uploadposts/oauth/{platform}/start`) to build our own page on our domain | Consent shows Upload-Post's app (callback via app.upload-post.com). No BYO found | Yes |
| bundle.social | Organization (billing) -> Team ("social set", one account per network) per customer; unlimited teams on paid plans | `POST /api/v1/social-account/create-portal-link` (logoUrl, language, redirectUrl, expiresIn) or custom UI flow via connect endpoint | Consent shows bundle.social's app; Enterprise mentions "white-label setup" (details UNCONFIRMED) | Yes ("already-reviewed integration") |
| Outstand | No tenant object; connected accounts are flat and we map them to our users | `get_auth_url` OAuth URL; webhook `account.connected` | Managed keys = Outstand brand. BYOK opt-in on any network: our own OAuth app so our brand appears (then we need our own app approvals) | Yes on 8 networks (managed keys); X/GBP/Vimeo/Reddit BYO |
| Post for Me | Project; "external ID" mapping | Generate auth URL, redirect back with `accountIds`; webhook `social.account.created` (no webhook for failed/cancelled auth) | Two modes: "Quickstart project" uses their credentials (no approvals), "White Label project" uses our credentials (needs our own platform approvals) | Quickstart: yes |
| Publora | "Workspace" with "managed users"; not enabled by default, must email support | `POST /workspace/users/:id/connection-url` (default 90-day expiry) | White-label mentioned in the guide index; details UNCONFIRMED | Yes (own apps), X handling UNCONFIRMED |
| Postproxy | "Profile group" per brand/customer; group-scoped API keys | `POST /api/profile_groups/:id/initialize_connection` returns OAuth URL | BYO only for X and Telegram. White-label: UNCONFIRMED | Yes, except X |
| Postiz Cloud | Customer "groups" inside one org; OAuth apps exist for Postiz users to authorize third-party apps | `GET /social/{integration}` returns OAuth URL | Postiz's apps. Not designed for reselling to end users | Yes (cloud) |
| Postiz / Mixpost self-hosted | Org/workspaces | Own hosted flow | We register every developer app ourselves | No: we do all app reviews |
| Buffer | None for publishing on behalf of non-Buffer users; OAuth lets users connect their own Buffer account | User needs a Buffer account and pays Buffer ($5/channel Essentials) | n/a | n/a |
| Blotato | None | Accounts are connected in Blotato's dashboard only | n/a | n/a |

### 4.2 Scheduling, webhooks, media

| Provider | Scheduling | Cancel / edit | Status callbacks | Post URL / IDs | Media |
|---|---|---|---|---|---|
| Ayrshare | `scheduleDate` ISO 8601 UTC; `validateScheduled` pre-checks media | Update scheduled post metadata, delete | Webhooks (Launch plan and up): scheduled, social, batch events | Ayrshare post `id` + per-network `postUrl`; `idempotencyKey` | `mediaUrls` public URLs; sizes UNCONFIRMED |
| Zernio | `scheduledFor` + IANA `timezone`, stored as UTC; `publishNow`; draft; per-profile queue slots | Update in draft/scheduled/failed/partial/cancelled; delete any non-published; unpublish on 10 networks; edit published text on 10 | `post.scheduled`, `post.platform.published`, `post.published`, `post.partial`, `post.failed`, `post.cancelled`; account.connected/disconnected; up to 50 endpoints per team, signed, retried, profile-scoped | `platformPostUrl` per platform; idempotency keys | Presigned upload up to 5 GB, or public URL; IG video 300 MB; TikTok 4 GB |
| Upload-Post | `scheduled_date` ISO 8601 with timezone, max 365 days ahead; queue slots | Manage scheduled posts endpoints; retry failed; unpublish; edit published | Webhooks with `whsec` secret; status polling (cached 2 to 5 s) | History/status endpoints; `Idempotency-Key` header | multipart or `video_url`; sync uploads switch to async after 59 s |
| bundle.social | `postDate` ISO UTC with `status: SCHEDULED` or `DRAFT`; up to monthly quota | Retry failed manually up to 6 times; delete | Single event `post.published` with `data.status` = `POSTED` or `ERROR`; 5 webhooks per org; signatures, retries, auto-disable | per-post object with errors | multipart, from-URL, large upload init (>90 MB); media kept 14 days after last use |
| Outstand | `scheduledAt` ISO 8601, dispatch accuracy about +/- 30 s | `update_post`, `delete_post`, `delete_remote_post` | `post.published`, `post.error`, `account.connected`; poll `GET /v1/posts/{id}` | per-platform status | signed upload URL then public URL; retention window (details UNCONFIRMED) |
| Post for Me | Scheduled + draft (vendor page) | UNCONFIRMED | Webhooks documented for accounts; post events UNCONFIRMED | UNCONFIRMED | Media processed per platform (vendor claim) |
| Publora | Schedule horizon and concurrent-queue limits per plan (Starter: 3 scheduled, 7 days ahead) | update-post, delete-post | Webhooks (Pro and up) | `post-logs` | `get-upload-url`; Starter 50 MB video, Pro 250 MB |
| Postproxy | Drafts, scheduling, recurring queues with jitter | `PATCH /api/posts/:id`, publish draft, delete on platform (6 networks) | HMAC webhooks: `platform_post.published`, `platform_post.failed`, `..._waiting_for_retry` | per-platform statuses; `idempotency_key` | URL, multipart, base64 |

### 4.3 Test mode (needed: test without posting publicly)

| Provider | What exists | Verdict |
|---|---|---|
| Postproxy | "Sandbox mode included on all plans: develop and test without real social accounts" (https://postproxy.dev/llms.txt). I could not open the sandbox doc page, so behavior is UNCONFIRMED. | Best claim; verify in a spike |
| Zernio | No sandbox ("no validateOnly or dry-run" on create), but `POST /v1/validate/post` dry-runs the whole validation pipeline without publishing, `draft` status, `webhook.test`, bulk upload `dryRun`. Webhook endpoints can be scoped to a "staging" profile so test accounts never hit production. | Good partial |
| Ayrshare | Staging server is a Max Pack feature ($300/month), but it uses live social accounts and "is for internal use" (search result summary of the Max Pack docs; page not directly fetchable). `randomPost`/`randomMediaUrl` helpers and `validateScheduled` exist. | No real sandbox |
| Upload-Post | CLI `--dry-run` only prints the request. Free plan (10 uploads/month, no TikTok) with real accounts. | No sandbox |
| bundle.social | `DRAFT` status; free plan (20 posts/month, 3 teams). No sandbox found. | No sandbox |
| Outstand | Drafts are not billed. No sandbox found. | No sandbox |
| Post for Me, Publora | Publora has `test-connection` (checks the token). Nothing else found. | UNCONFIRMED |
| Schedulala (not multi-tenant) | `sk_test_` keys: full flow runs, no posts published (https://schedulala.com/developers/docs/sandbox). Useful as a design reference only. | n/a |

Recommended test strategy regardless of vendor: (1) our own `MockPublisher` returning realistic ids/urls/webhook events, used by Vitest and Playwright (mirrors `FAL_MOCK=1`); (2) vendor `validate`/`draft` endpoints in staging; (3) a small set of dedicated test accounts with the least-visible setting (TikTok `SELF_ONLY` or inbox draft, YouTube private, LinkedIn restricted visibility); (4) a contract test per adapter that records fixtures from the real vendor once.

### 4.4 Rate limits, reliability, company risk

| Provider | API rate limits | Status / uptime evidence (seen 2026-10-06) | Company, age, funding |
|---|---|---|---|
| Ayrshare | Launch: "expanded" (numbers UNCONFIRMED); Ayrshare no longer imposes its own X limits | status.ayrshare.com: API 100% over 90 days; vendor claims 99.99% and 30M calls/day (posts/day claims differ across its own pages: 20K on the About page, 50K on Pricing) | Founded 2020; joined saas.group Oct 2025; 10,000+ teams (vendor) |
| Zernio | 60 / 600 / 1,200 req/min by account count; 25 posts/hour per account; daily caps IG 100, FB 100, Threads 250, X 50, TikTok 15 | zernio-status.com: API 100% (90 days), token-refresh scheduler 98.15%; incidents Oct 5 (IG scheduled posts after reconnect) and Sep 27-30 (Google Business images); vendor says 99.7%+ and 2M posts delivered | 9 people, bootstrapped, Spain; Trustpilot 4.8 / 199 reviews (page summary) |
| Upload-Post | Headers present, values UNCONFIRMED; hard daily caps per account (IG 50, TikTok 15, LinkedIn 150, YouTube 10, FB 25, Threads 50, X 10 to 30 by plan) | Status page loads dynamically; uptime UNCONFIRMED | Founded Jan 2025; "60,000+ users" is self-reported; small team (UNCONFIRMED) |
| bundle.social | 100 req/s, 500 per 10 s, 2,000 per min; daily publish caps per account (Pro: TikTok 10, X 15, LinkedIn 18, IG 50, Threads 200) | api.bundle.social 99.79%; incident 2026-08-31 "elevated API errors and delayed publishing" for 4+ h | BUNDLE SP. Z O.O., Warsaw; Trustpilot 4.7 (24 reviews), G2 4.9 (16) per vendor llms.txt |
| Outstand | Dynamic, based on traffic and accounts | Vendor claims 99.92%; no independent page checked; no uptime SLA on any self-serve plan | 500+ orgs, 12.8M posts/month (vendor); SOC 2 in progress |
| Post for Me | UNCONFIRMED (doc page exists) | Status page referenced; not fetched | Day Moon Development; open source on GitHub; ToS "no uptime guarantee" |
| Publora | UNCONFIRMED | Not checked | Creative Content Crafts; small |
| Postproxy | UNCONFIRMED | Not checked | Founded 2026, Berlin; EU hosting; SOC 2 Type II in progress (vendor) |
| Postiz Cloud | create-post: 100 requests/hour on cloud (global per instance; per-key behavior UNCONFIRMED) | n/a | Open source AGPL-3.0, 36.7k GitHub stars, last push 2026-10-06 |

---

## 5. Pricing and the three scenarios

Billing unit definitions are the key to reading this table. All figures monthly list price in USD, excluding X pass-through and taxes.

| Provider | Billing unit | Plans (seen 2026-10-06) | (a) 9 accts, 3 tenants, 60 pubs | (b) 100 accts, 50 tenants, 1,500 pubs | (c) 1,500 accts, 500 tenants, 15,000 pubs | Multi-tenant allowed from |
|---|---|---|---|---|---|---|
| Ayrshare | Social profile (one customer; multiple networks = 1 profile); billed on the peak daily profile count of the month | Premium $149 (1 profile), Launch $299 (up to 10), Business $599 base incl. 30 profiles then $8.99 (31-100), $3.49 (101-500), $2.49 (500+); annual about 17% less; Enterprise from 300 profiles; Max Pack +$300 | $299 (Launch) | $778.80 (annual $658.80) | $2,624.30 (annual $2,254.30); but the plan table says Business tops out at 300 profiles, so (c) is probably an Enterprise quote (UNCONFIRMED) | Launch (up to 10 profiles) |
| Zernio | Connected account (profiles free); graduated: 1-2 free, 3-10 $6, 11-100 $3, 101+ $1; prorated daily | Single usage-based plan; Enterprise custom beyond 2,000 accounts | $42 | $318 | $1,718 | Any (profiles unlimited, free) |
| Upload-Post | Profile (one account per platform); white-label from Professional | Free $0 (2 profiles, 10 uploads/month, no TikTok); Basic $24 (5 profiles); Professional $50 (25); Advanced $147 (75); Business $438 (225, +$1 per extra profile); add-ons +profiles; annual about 40% less; X Links add-on $19 | $24 (Basic) | $105 (Professional + 25-profile add-on $55); if every account is its own profile (100): $212 | $713 (Business + 275 extra at $1); if 1,500 profiles: $1,713 | Professional ($50) |
| bundle.social | Posts created per organization per month; accounts and teams unlimited | Free $0 (20 posts, 3 teams); Pro $100 (10,000 posts, analytics); Business $400 (100,000 posts); Enterprise custom; yearly Pro $90, Business $360 | $100 (Pro; Free allows only 20 posts) | $100 | $400 | Pro (Free capped at 3 teams) |
| Outstand | Post delivered to one connected account | PAYG $19 incl. 3,000, then $0.007 (to 10,000), $0.005 above; Business $129 incl. 50,000 then $0.005, resale explicitly permitted; PAYG needs written permission to resell | $19 | $129 (Business, because reselling; $19 PAYG if permission is granted in writing) | $129 | Business for reselling |
| Post for Me | Successful posts per month (per delivery assumed; UNCONFIRMED) | $10 (1,000), $25 (2,500), $50 (5,000), $75 (10,000), $150 (20,000), $300 (40,000), $500 (100,000), $1,000 (200,000); unlimited accounts, over-limit is not auto-charged | $10 | $25 | $150 | ToS silent on resale (UNCONFIRMED); contact support |
| Publora | Connected account, graduated: 1-5 $5.99, 6-20 $2.99, 21+ $0.99 (yearly -33%) | Starter free (3 accounts, 15 posts, no X); Pro per account; Agency custom (isolated workspaces) | $41.91 | about $154 (list), but Workspace/B2B access must be enabled by support and pricing for it is UNCONFIRMED | about $1,540 (same caveat) | Workspace API on request |
| Postproxy | Profile group (brand/customer) for SaaS; profile for "Agentic" | Free 10 posts; Agentic $17 (5 profiles, then $4 to $1); Business $49 (20 groups, then $2, $1.75, $1.50, $1.25); Enterprise $399 for 300 groups on the pricing page but $699 for 500 groups in llms.txt (conflict, UNCONFIRMED) | $33 (Agentic, 9 profiles) or $49 | $109 (Business) | $599 (Enterprise per pricing page: $399 + 200 x $1) to $699 (llms.txt) or $734 (Business) | Business ($49) |
| Postiz Cloud | Channels | Standard $29 (5), Team $39 (10), Pro $49 (30), Ultimate $99 (100); posts unlimited; API on all plans | $39 | $99 (Ultimate; single org, 100 create-post requests/hour, not built for resale) | Not feasible on list plans | Not intended |
| Postiz self-hosted | Free (AGPL-3.0) + infra | We register all Meta/TikTok/X/LinkedIn apps ourselves | $0 + infra | $0 + infra | $0 + infra | Yes, but no app-review shortcut |
| Mixpost self-hosted | One-time license: Lite free, Pro $299 (multi-tenant, white-label basic, API, 1 domain, 1 year of updates), Enterprise $1,199 | Laravel/PHP app; we register all developer apps | $299 one-time | $299 one-time | $299 one-time to $1,199 | Pro |
| Buffer | Per channel: Free (3 channels, 3,000 API requests/month), Essentials $5/channel, Team $10/channel | API only touches the key owner's Buffer account (or users who log into Buffer via OAuth) | $45 (9 channels, own account only) | Not applicable | Not applicable | No |
| Blotato | Plans $29 (20 accounts), $97 (40), $499 (agency) | Accounts connected only in the dashboard; API not in free trial | $29 | Not applicable | Not applicable | No |
| Unipile | Linked account: from EUR 49 (up to 10), then about EUR 5 down to EUR 3 per account by tier | Reverse-engineered LinkedIn/Instagram access | about EUR 49 | about EUR 400 (tier math UNCONFIRMED) | about EUR 4,500+ (UNCONFIRMED) | Hosted white-label auth |

Sources: Ayrshare https://www.ayrshare.com/pricing/ ; Zernio https://docs.zernio.com/pricing.mdx ; Upload-Post https://docs.upload-post.com/resources/pricing-and-limits and https://www.upload-post.com/llms-full.txt ; bundle.social https://bundle.social/pricing.md (page dated 2026-07-30) ; Outstand https://www.outstand.so/pricing.md (page dated 2026-10-05) ; Post for Me https://www.postforme.dev/pricing (tier prices read from the page's structured data) ; Publora https://publora.com/pricing.md ; Postproxy https://postproxy.dev/pricing and https://postproxy.dev/llms.txt ; Postiz https://postiz.com/pricing ; Mixpost https://mixpost.app/pricing ; Buffer https://buffer.com/pricing and https://developers.buffer.com/guides/getting-started.md ; Blotato https://www.blotato.com/pricing ; Unipile https://www.unipile.com/pricing-api/.

### 5.1 Cost per active user per month (cost of goods for LabIA)

| Provider | (b) 50 users | (c) 500 users |
|---|---|---|
| Post for Me | $0.50 | $0.30 |
| Outstand (Business) | $2.58 | $0.26 |
| bundle.social | $2.00 | $0.80 |
| Postproxy | $2.18 | about $1.20 to $1.40 |
| Upload-Post | $2.10 | $1.43 |
| Zernio | $6.36 | $3.44 |
| Ayrshare | $15.58 | $5.25 |

Zernio crosses bundle.social's flat $100 at about 28 connected accounts and its $400 at about 182 accounts. Zernio and Ayrshare also bill idle users: an account that is connected but never posts still costs money. Zernio prorates by the day, so disconnecting idle accounts is a lever; Ayrshare bills the peak daily profile count of the month.

### 5.2 Sensitivities

- Fan-out (every one of a user's 30 posts goes to every one of their accounts, 2 in (b) and 3 in (c)): deliveries become 3,000 in (b) and 45,000 in (c). Outstand stays at $129. Post for Me becomes $50 in (b) and $500 in (c). bundle.social stays $100 in (b) and $400 in (c) even if it counts per network (counting rule is UNCONFIRMED: pricing.md says "posts created", the SaaS marketing page says "no per-post counting").
- X pass-through, assuming one third of publications go to X with no URL in the text: (a) 20 posts = $0.30; (b) 500 posts = $7.50; (c) 5,000 posts = $75. If every X post carries a link: x13.3, so $4, $100, $1,000. Same cost whether we integrate X directly or through a vendor that passes it through.
- Reads on X (analytics) are billed at $0.005 per resource and are opt-in at Zernio and capped at 5 refreshes per post and account per 24 h at bundle.social. Avoid X analytics polling.
- Currency: all vendors above bill in USD (Postproxy shows EUR for Unipile). BRL invoicing was not found for any vendor (UNCONFIRMED). Paying with a USD card is accepted by those with Stripe checkout. IOF and card FX cost are LabIA-side costs I did not research.

---

## 6. Ranked recommendation (top 3) with reasons and risks

### 1. bundle.social
Why:
- Billing unit (posts per organization) matches a pay-per-use product: $100 flat up to 10,000 posts and $400 up to 100,000, unlimited connected accounts and unlimited teams. Per-user cost falls from $2.00 (50 users) to $0.80 (500 users).
- Data model maps almost 1:1 to LabIA: organization = LabIA, team ("social set", one account per network) = persona, which is exactly our Influencers model. `create-portal-link` gives a hosted connect page with `logoUrl`, `language`, `redirectUrl`, `expiresIn`; a custom-UI flow also exists. `copy social accounts` between teams reuses an authorization without a new OAuth.
- Hosts the X app with pass-through at cost via prepaid credits, and uses its own reviewed Meta/TikTok/LinkedIn apps ("already-reviewed integration").
- Public OpenAPI + Swagger, TypeScript SDK, CLI, MCP server, free plan to experiment, status page.
Risks:
- No sandbox found; only `DRAFT`.
- Webhooks are thin: a single `post.published` event (success or failure in `data.status`), max 5 webhooks per organization, 7-day webhook-event retention.
- Monthly quota counting for multi-network posts is UNCONFIRMED; plan jump is $100 to $400 at 10,000 posts.
- 99.79% API uptime and a 4-hour incident on 2026-08-31 on its own status page; company size and funding not disclosed (UNCONFIRMED); Trustpilot has only 24 reviews.
- Daily per-account caps are tight on Pro (LinkedIn 18, X 15, TikTok 10); fine for personas, check against any "burst" feature.
- Consent screens show bundle.social, not LabIA. Enterprise "white-label setup" is UNCONFIRMED.
- Post media is kept only 14 days after last use (scheduled posts keep it until terminal), so do not treat it as storage.

### 2. Zernio (formerly Late)
Why:
- Best-documented multi-tenant story ("Build a Platform": profile per customer, `account.connected` webhook, account health endpoint, scoped API keys, per-profile queues, per-profile webhook routing, idempotency keys). Dry-run validation endpoint, `draft`, `post.*` webhooks incl. `post.failed` with `errorCategory`, `platformPostUrl`.
- Hosts the X app with exact pass-through; TikTok Business-app lane for public direct posts; Instagram Login (no Facebook Page needed); LinkedIn org pages; YouTube Shorts; Threads; Bluesky.
- Cheapest of the strong options at (a) ($42) and decent at (b) ($318); self-serve at any scale with no contract.
Risks:
- Per-account billing makes idle users a recurring cost and scales linearly: $1,718 at (c). Mitigation: disconnect idle accounts (daily proration), or negotiate Enterprise.
- 9-person bootstrapped company; documented pricing-model change after the Late-to-Zernio transition upset lifetime-deal customers (size UNCONFIRMED); ToS is short, allows termination "for any reason", and has no explicit resale or white-label permission (it is silent, UNCONFIRMED if multi-tenant resale is tolerated; the docs actively describe it).
- Consent screens show Zernio's apps; our own branded OAuth apps are UNCONFIRMED.
- TikTok visibility: Business-app lane publishes video as public only; anything else must be an inbox draft.
- 98.15% on its token-refresh scheduler over 90 days and a 2026-10-05 Instagram scheduled-post incident (own status page).

### 3. Outstand
Why:
- Cheapest at scale: Business $129/month includes 50,000 deliveries, unlimited accounts, resale explicitly permitted, plus a 30-minute integration-planning call. Vendor's own pricing file was updated 2026-10-05.
- Only vendor besides Post for Me that offers a clean path to our own OAuth apps later (BYOK on any network "so your brand appears on the OAuth consent screen"), without changing API.
- Large doc set (REST + MCP, OpenAPI), `post.published` / `post.error` webhooks, unbilled drafts.
Risks:
- X requires BYOK (we register an X app and fund X credits ourselves).
- No tenant object (we keep the user-to-account map ourselves; fine but no per-tenant scoped keys or webhook routing).
- "No uptime SLA" on self-serve, SOC 2 "in progress", reliability numbers are vendor-reported only (not independently checked).
- TikTok default is inbox draft; direct post counts against the shared TikTok cap.
- Billing is per delivery (one post to three accounts = 3), including failed deliveries ("publish outcome does not change the count").

### Runners-up (not top 3, but worth knowing)
- Upload-Post: ToS explicitly permits building a product on top and letting customers connect through white-label features; hosted page supports `pt`; Connect API lets us own the whole page; X managed. Mid-priced for our shape ($105 at (b), $713 at (c)). Concerns: TikTok active-user cap history (fixed by new connections since mid-2026 per its docs), vendor-claimed stats, status page not readable, no sandbox.
- Postproxy: only vendor claiming sandbox mode on every plan; profile-group pricing is cheap at (b) ($109); official APIs only; EU hosting. Concerns: founded 2026, pricing page and llms.txt disagree on Enterprise ($399/300 groups vs $699/500 groups), X is BYO, docs I could not confirm for white-label.
- Ayrshare: most mature (since 2020, 10,000+ teams, owned by saas.group since Oct 2025), hosted linking page with logo/CSS, widgets with Max Pack, Launch plan webhooks. But $299 at (a), $779 at (b), about $2.6k at (c) and probably an Enterprise quote there; X is BYO; the staging server uses live accounts; ToS has broad indemnity for content submitted by our end users and lets them change fees at end of billing period.
- Post for Me: cheapest ($10 / $25 / $150) and open source (GitHub DayMoonDevelopment/post-for-me, NestJS + Supabase), so there is a real self-host escape hatch; "White Label project" supports our own credentials. Concerns: ToS silent on resale, docs I could not read in depth (webhook/scheduling details UNCONFIRMED), small team.

---

## 7. Evaluated and not recommended for this use case

| Provider | Reason (with source) |
|---|---|
| Buffer | The public GraphQL API only acts on the key owner's own Buffer account (https://developers.buffer.com/guides/getting-started.md). OAuth lets third parties act for users who have Buffer accounts, so each end user would need and pay for Buffer. API documents text and image posts. Third-party API access was revoked in 2019 (https://postproxy.dev/blog/what-happened-to-buffer-api-alternatives-for-developers/, 2026-02-25). Not an embed-able aggregator. |
| Blotato | Accounts are connected only inside Blotato's dashboard (https://help.blotato.com/llms-full.txt); no end-user connect API. Creator tool with an API, credit-metered. |
| Postiz (cloud) | Built for end users of Postiz. Public API create-post limit of 100 requests/hour on cloud; channel-capped plans ($99 for 100 channels). OAuth apps are for Postiz users, not white-label resale. |
| Postiz / Mixpost (self-hosted) | Free or cheap licenses (Postiz AGPL-3.0; Mixpost Pro $299 one-time, Laravel/PHP) but we would register all Meta, TikTok, LinkedIn and X apps ourselves, which defeats the reason to buy. Keep as a long-term escape hatch only. |
| Unipile | Messaging-centric; LinkedIn/Instagram are "reverse engineering" not official APIs (https://www.unipile.com/pricing-api/). Ban risk on brand accounts and no TikTok/Threads/YouTube posting. |
| Hootsuite, Sprout | Enterprise-gated developer access (search summary dated July 2026; I did not read official pages). Publishing API reportedly lacks TikTok, YouTube and Bluesky (UNCONFIRMED). Not evaluated further. |
| Schedulala | Creator scheduler with API and `sk_test_` sandbox keys but 2 to 5 workspaces per plan; not designed for hundreds of tenants. |
| Data365 | Mentioned in the brief; appears to be data/scraping-oriented rather than a publishing API; not evaluated (UNCONFIRMED). |

---

## 8. Build (official APIs) versus buy: what each path buys us

| Concern | Direct integration with each official API | Aggregator |
|---|---|---|
| Meta app review and business verification | Ours to pass before any customer can connect an Instagram/Facebook/Threads account | Vendor's already-approved apps (all top picks) |
| TikTok audit | Ours; unaudited apps are restricted on direct posting (Outstand publishes a Direct Post audit guide for BYOK users) | Vendor's app, but shared per-day creator cap (section 2.3) |
| LinkedIn pages | Partner approval needed (per your brief) | Vendor-held |
| YouTube audit | Ours | Vendor-held; Upload-Post documents shared YouTube quota limits |
| X | We pay X directly ($0.015 per post, $0.200 with URL) | Same cost, hosted app (Zernio, bundle.social, Upload-Post) or BYO app (Ayrshare, Outstand, Postproxy) |
| Consent screen branding | Ours | Vendor's app name unless BYOK (Outstand, Post for Me white-label, Ayrshare for X) |
| Token refresh, retries, media transcoding rules, per-network quirks | Ours, forever | Vendor's |
| Cost | Engineering time plus X pass-through | $100 to $1,700 per month at the scales above, plus X |

Hybrid worth considering: use an aggregator for Meta, TikTok, LinkedIn, YouTube (the approvals), but keep X (and Bluesky, trivially) behind our own `XPublisher` implementation. Three of the vendors already force BYO X keys, and X access rules have changed twice in 2026, so X credentials should be a configuration choice in our code, not an assumption in the vendor.

---

## 9. Lock-in and how to keep it low

What is cheap to keep portable (do it from day one):
- A thin internal interface. Suggested shape: `Publisher { createTenant(userId|personaId), getConnectUrl(tenant, network, redirect), listAccounts(tenant), publish({accountIds, text, mediaUrl, scheduledAt?, aiDisclosure}), cancel(id), getStatus(id) }` plus a normalized internal event set: `publish.succeeded`, `publish.failed` (with category: auth_expired, content, rate_limit, platform), `account.connected`, `account.disconnected`. Each vendor's webhook gets an adapter that maps to these.
- Our own tables: `SocialAccount(id, personaId, network, handle, provider, providerAccountId, status)`, `ScheduledPost(id, ..., provider, providerPostId, platformPostUrl, status)`. Store `platformPostUrl` and the platform's own post id on success, not only the vendor id.
- Media in our storage (Vercel Blob or R2) with stable public URLs; vendors take URLs (Zernio, Ayrshare, Upload-Post, Outstand) or can fetch from URL (bundle.social). Do not use vendor media libraries as the source of truth (bundle.social deletes media 14 days after last use).
- Scheduling: simplest to keep vendor-native scheduling (their retries and status) but consider our own scheduler calling "publish now" if vendor semantics diverge. Vendor schedulers differ on timezone (Zernio IANA zone, bundle/Outstand/Ayrshare UTC), cancel/edit rights and failure retry, so store schedules in our DB as UTC and the user's IANA zone.
- Cost display: LabIA's "cost shown before and after every generation" principle should extend to publishing: vendor fees are monthly, not per call, so show X pass-through ($0.015 or $0.200) and keep the subscription out of per-post cost.

What is not portable:
- OAuth tokens and the connection itself. No vendor offers a token export that I could find (UNCONFIRMED; Outstand says credentials stay "customer-owned and portable" only for BYOK apps). A vendor switch means a reconnect campaign for every account. Even with BYOK, tokens issued to a different app require re-consent.
- Vendor scheduled posts (must be re-created) and vendor post history (we should mirror in our DB).
- Behavior of limits (daily caps, TikTok lane, media transforms) differs per vendor.

Estimated switching effort (my estimate, not a vendor figure): about 2 to 4 days of engineering per adapter if the interface exists; the expensive part is user re-linking. Run two adapters in parallel during a migration (new connections go to the new vendor, old keep working), and email users to reconnect when convenient.

Hedges ranked by strength: (1) Own the OAuth apps (BYOK on Outstand, white-label project on Post for Me), which also brands the consent screen but requires our own Meta/TikTok/LinkedIn approvals; (2) Open source fallback (Post for Me, Postiz) for a worst-case vendor failure; (3) Keep X and Bluesky in-house.

---

## 10. UNCONFIRMED items and a 2-day spike checklist

UNCONFIRMED (could not verify on an official page on 2026-10-06):
- Date of the Late-to-Zernio rebrand; magnitude of the post-rebrand price change for lifetime-deal users.
- Whether X really forces BYO keys for all third parties (Ayrshare, Outstand, Postproxy say yes; Zernio, bundle.social, Upload-Post host X today).
- bundle.social: how a multi-network post counts toward the 10,000/100,000 monthly post quota; failure retry behavior beyond 6 manual retries; white-label of consent screens; Portuguese support in the portal `language` field.
- Zernio: own-brand OAuth apps; Portuguese in hosted selection screens; explicit permission to resell.
- Post for Me: per-delivery or per-post counting; webhook and scheduling specifics; resale permission.
- Publora: price of Workspace/B2B access; whether the managed-user model is billed per account; white-label details.
- Postproxy: sandbox behavior; white-label; the $399 versus $699 Enterprise conflict.
- Upload-Post: rate-limit numbers; how X cost is billed beyond the link add-on; status history.
- Ayrshare: exact API rate limits per plan; whether Business can exceed 300 profiles without Enterprise.
- Outstand: independent uptime; token portability; media retention.
- Any vendor: BRL billing and payment methods other than USD cards.

Spike (suggest 2 days, free tiers or trials, no public posts):
1. Implement `Publisher` + `MockPublisher`; adapters for bundle.social and Zernio.
2. For each: create a tenant, generate a connect link, connect a private test X and LinkedIn account (and a TikTok account in draft mode), publish a 9:16 MP4 and an image, schedule one for +10 minutes, cancel one, receive webhooks, force a failure (revoked token) and check the normalized event.
3. Check: count of X cost lines on the bill, consent screen text, PT-BR support, time from click to connected, webhook latency, error messages for TikTok caps and Instagram aspect ratio.
4. Decide: choose bundle.social if quota counting is per post and the hosted portal is acceptable; choose Zernio if webhook detail and dry-run validation matter more than per-account cost; fall back to Outstand if cost at scale dominates and an X BYO app is acceptable.

---

## 11. Source index (all seen 2026-10-06 unless dated otherwise)

- Ayrshare: https://www.ayrshare.com/pricing/ ; https://www.ayrshare.com/docs/apis/profiles/social-linking-overview.md ; https://www.ayrshare.com/docs/multiple-users/business-plan-overview.md ; https://www.ayrshare.com/docs/dashboard/connect-social-accounts/x-twitter-byo-keys.md ; https://www.ayrshare.com/docs/apis/post/social-networks/x-twitter.md ; https://www.ayrshare.com/docs/apis/post/post.md ; https://www.ayrshare.com/docs/additional/maxpack.md ; https://www.ayrshare.com/terms.md ; https://www.ayrshare.com/about-ayrshare.md (last modified 2026-10-02) ; https://status.ayrshare.com/
- Zernio: https://zernio.com/pricing ; https://docs.zernio.com/pricing.mdx ; https://docs.zernio.com/multi-tenant.mdx ; https://docs.zernio.com/guides/rate-limits.mdx ; https://docs.zernio.com/guides/post-lifecycle.mdx ; https://docs.zernio.com/guides/media-uploads.mdx ; https://docs.zernio.com/webhooks.mdx ; https://docs.zernio.com/platforms/tiktok.mdx ; https://docs.zernio.com/platforms/twitter.mdx ; https://docs.zernio.com/platforms/instagram.mdx ; https://docs.zernio.com/llms.txt ; https://zernio.com/rebrand ; https://zernio.com/about ; https://zernio.com/tos (updated 2026-10-06) ; https://zernio-status.com/ ; https://ryandoser.com/zernio-review/ (2026-08-01, updated 2026-09-30; author runs competitor Blotato) ; https://www.trustpilot.com/review/zernio.com
- Upload-Post: https://www.upload-post.com/llms-full.txt ; https://docs.upload-post.com/llm.txt ; https://docs.upload-post.com/resources/pricing-and-limits ; https://docs.upload-post.com/guides/user-profile-integration ; https://docs.upload-post.com/api/connect-api ; https://docs.upload-post.com/guides/reached-active-user-cap-error ; https://docs.upload-post.com/guides/x-links-addon ; https://docs.upload-post.com/guides/ai-content-labeling ; https://www.upload-post.com/terms-of-use
- bundle.social: https://bundle.social/pricing ; https://bundle.social/pricing.md (2026-07-30) ; https://bundle.social/llms.txt ; https://bundle.social/llms-full.txt ; https://info.bundle.social/llms.txt ; https://info.bundle.social/api-reference/webhooks.md ; https://info.bundle.social/api-reference/connect-social-accounts/hosted-flow.md ; https://bundle.social/meta-app-review-rejected ; https://bundle.social/terms ; https://bundlesocial.betteruptime.com/ ; https://bundle.social/blog/x-api-pricing-2026-costs-limits (2026-07-27)
- Outstand: https://www.outstand.so/llms.txt ; https://www.outstand.so/pricing.md (both dated 2026-10-05) ; https://www.outstand.so/docs/llms-full.txt
- Post for Me: https://www.postforme.dev/pricing ; https://www.postforme.dev/integrations/x ; https://www.postforme.dev/compare/zernio ; https://www.postforme.dev/resources/handling-account-connection-redirects-and-webhooks ; https://www.postforme.dev/terms (effective 2026-03-03) ; https://github.com/DayMoonDevelopment/post-for-me
- Publora: https://publora.com/pricing.md ; https://publora.com/llms.txt ; https://docs.publora.com/raw/guides/workspace ; https://docs.publora.com/raw/platforms/tiktok
- Postproxy: https://postproxy.dev/pricing ; https://postproxy.dev/llms.txt ; https://postproxy.dev/guides/twitter-byo-keys/ ; https://postproxy.dev/blog/what-happened-to-buffer-api-alternatives-for-developers/ (2026-02-25)
- Postiz: https://postiz.com/pricing ; https://docs.postiz.com/public-api/introduction.md ; https://docs.postiz.com/general/settings/developers.md ; https://api.github.com/repos/gitroomhq/postiz-app
- Mixpost: https://mixpost.app/pricing
- Buffer: https://developers.buffer.com/guides/getting-started.md ; https://developers.buffer.com/guides/authentication.md ; https://buffer.com/pricing
- Blotato: https://www.blotato.com/pricing ; https://help.blotato.com/llms-full.txt
- Unipile: https://www.unipile.com/pricing-api/
- Schedulala: https://schedulala.com/developers/docs/sandbox ; https://schedulala.com/pricing
- X API pricing: https://docs.x.com/x-api/getting-started/pricing
- Hootsuite (search summary only): web search on 2026-10-06
