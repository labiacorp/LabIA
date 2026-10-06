# Social publishing APIs for LabIA "Integrações": X, LinkedIn, Threads (+ Bluesky)

Research date: **2026-10-06**. Every number below was read from an official page on that date unless marked otherwise.
Conventions:
- **[OFFICIAL]** = read on the vendor's own docs/pricing page. **[SECONDARY]** = third-party blog/news, used only where the vendor does not say.
- **UNCONFIRMED** = I could not confirm it in an official source; treat as an open question.
- "Seen" dates are 2026-10-06 unless stated. When a page prints its own "last updated" date I give it.
- FX used for R$ figures: **R$ 5.2226 / US$** (USD/BRL commercial, 2026-09-28, [SECONDARY] https://renovainvest.com.br/dolar-hoje/). It is illustrative only; the product must price from a live rate plus a buffer. Brazilian IOF/card fees on US$ credit purchases are NOT included (UNCONFIRMED rate; verify with finance).

---

## 0. Executive summary

| | X | LinkedIn (personal profile) | LinkedIn (Company Page) | Threads | Bluesky |
|---|---|---|---|---|---|
| Review before launch | None documented | None (open permission) | **Yes**: Community Management API, legal entity, dev tier then standard tier | **Yes**: Meta App Review + published app (+ business verification, see §3) | None |
| Direct API cost | **US$ 0.015/post, US$ 0.20 if the post contains a URL** (pay-per-use credits) | Free (no fee published) | Free (no fee published) | Free (no fee published) | Free |
| Native scheduling | No | No | No | No | No |
| Token life | 2 h access; refresh ~6 months, single-use rotation | 60 days, **no refresh for ordinary apps** (user re-consents) | same | 60 days, refreshable server-side | short access; refresh up to 180 d (confidential client) |
| Biggest risk | Cost per post + link surcharge; AI-persona/bot rules | LinkedIn real-identity rule vs AI personas | Approval timeline (unpublished, est. 1-4+ weeks) | App Review + business verification delay; public media URLs | Low |

Key takeaways:
1. **X is the only one that costs money per post** and the only one where LabIA (not the end user) pays a metered bill. Plain post (text + image or video, no URL) = US$ 0.015 (about R$ 0.078). A post containing any URL = US$ 0.20 (about R$ 1.04), 13.3x more.
2. **No platform supports native scheduling.** LabIA must build its own scheduler and upload media at dispatch time (X media ids expire in 24 h; Threads containers expire in 24 h).
3. **Launch blockers:** Threads (Meta App Review + published app) and LinkedIn Company Pages (Community Management API approval). X, Bluesky and LinkedIn personal profiles can ship without any platform review.
4. **AI personas vs platform rules:** LinkedIn's User Agreement forbids a profile "for anyone other than yourself" (so no AI-persona personal profiles on LinkedIn). X requires an "Automated" label for fully automated accounts and offers a `made_with_ai` flag. See each section.

---

## 1. X (Twitter) API v2

### 1.1 Capabilities
| Content | Supported? | Notes (all [OFFICIAL]) |
|---|---|---|
| Text | Yes | 280 weighted chars for default accounts (emoji and CJK weigh 2). https://docs.x.com/ (character-counting page, in llms-full.txt) |
| Image | Yes | up to **4 photos** per post; JPG/PNG/GIF/WEBP, 5 MB each (`tweet_image`) |
| Video | Yes | **1 video per post**, chunked upload; default accounts up to 20 min / 8 GB, Premium up to 125 min / 16 GB (irrelevant for 5-30 s clips) |
| Carousel | No native carousel | A post holds up to 4 images OR 1 GIF OR 1 video. Multi-image (max 4) is the closest thing |
| Alt text | Yes, but billed separately | `POST /2/media/metadata` costs US$ 0.005 per request |
| AI disclosure | Yes | `made_with_ai: true` in `POST /2/tweets` body ("Disclose that the tweet contains AI-generated media") |
| Quote-posts | **Enterprise only** | "not available on self-serve (pay-per-use) tiers" |
| Programmatic replies | Restricted | since 2026-02-23 only if the original author "summoned" the replier (@mention or quote) |

**Posting endpoint:** `POST https://api.x.com/2/tweets`, JSON body, `Authorization: Bearer <user access token>`. Required scopes in the OpenAPI spec: `tweet.read tweet.write users.read`. Returns `201`.

**Media upload (v2, changed 2026-09-01):**
1. `POST /2/media/upload/initialize` with JSON `{media_type:"video/mp4", total_bytes, media_category:"tweet_video"}` returns `media_id` and `expires_after_secs: 86400`.
2. `POST /2/media/upload/{id}/append` multipart, `segment_index` from 0, each chunk **<= 5 MB** (server max 8 MB).
3. `POST /2/media/upload/{id}/finalize` returns `processing_info` when async processing is needed.
4. Poll `GET /2/media/upload?command=STATUS&media_id=...` using `check_after_secs`; states `pending -> in_progress -> succeeded | failed`.
5. `POST /2/tweets` with `media.media_ids`.
The old command-style `POST /2/media/upload?command=INIT|APPEND|FINALIZE` is documented as the **previous protocol**; do not build on it. Scope needed for upload: `media.write`. Images can use the simple `POST /2/media/upload` (images only).
Note: upload and post are validated separately; a finalized upload can still be rejected at post time (403 "not allowed to post a video longer than N minutes").

**Video spec (best-practices page):** H.264 High Profile, 30 or 60 fps, **AAC-LC** (HE-AAC not supported), mono/stereo, yuv420p, progressive, **no open GOP**, aspect ratio between 1:3 and 3:1, 1:1 pixel aspect, frame rate <= 60. Recommended portrait 720x1280. The page is internally inconsistent: it lists a "minimum video bitrate 5,000 kbps" in the recommended list but 2048K for 720x1280 in the table, and "dimensions 32x32 to 1280x1024" while saying subscribers can upload 1080p. For LabIA: export **720x1280 H.264 High, 30 fps, AAC-LC 128 kbps, yuv420p** and expect it to pass.

### 1.2 Auth & tokens
- OAuth 2.0 Authorization Code + PKCE. Authorize at `https://x.com/i/oauth2/authorize`; token at `https://api.x.com/2/oauth2/token`; revoke at `/2/oauth2/revoke`.
- Scopes for LabIA: `tweet.read tweet.write users.read media.write offline.access` (all in the official scope table).
- **Access token: 2 hours.** `offline.access` is required to get a refresh token.
- **Refresh token: "valid for about 6 months and single-use; each refresh returns a new one"** (stated in the OAuth 1.0a to 2.0 token-exchange page, 2026-09-21 change). Consequence: **serialize refreshes per user** (a lock) and persist the new refresh token atomically, otherwise a race invalidates the connection.
- Client type: choose "Web App" (confidential client; Basic auth with client id/secret on the token endpoint). Native/SPA are public clients.
- Users can revoke at https://x.com/settings/connected_apps.
- Rate limits are per user for OAuth user tokens, per app for bearer tokens.

### 1.3 Review / approval & timeline
- Sign-up is: console.x.com, accept Developer Agreement, "provide basic information about how you'll use the API", create app. **No manual review or waiting period is described** in the official getting-access page. (Whether X silently reviews some use cases: UNCONFIRMED.)
- No app-review gate for end users is documented: any X user can OAuth your app once the developer app has OAuth 2.0 enabled.
- **Policy gate for AI:** the Developer Guidelines require **prior approval from X for AI-generated *replies***. It does not say that for original AI-generated posts. Original AI-generated posts are allowed; "Automated account posts scheduled content" is listed as allowed.
- Automation rules (docs.x.com/developer-guidelines): fully automated accounts must (1) enable the **"Automated" profile label**, (2) say in the bio that it is a bot and who operates it, (3) be linked to a human-managed account, (4) honor opt-outs, (5) use only the official API. "Deceptive Bots: impersonating humans, hiding bot identity" is listed as a violation. "App posts identical content across multiple accounts" is listed as spam. Multi-account use is allowed only if "non-duplicative".
  - Implication for LabIA: AI influencer personas that post with a human reviewing/approving each post are ordinary scheduled posting. Personas that post fully autonomously are "automated accounts" and need the label, bio disclosure and a linked human account. Never post the same content to several personas.
  - X also announced in March 2026 that revenue-sharing creators must label AI-generated armed-conflict videos or lose payouts ([SECONDARY] engadget.com "X to require AI labels on armed conflict videos from paid creators"). That is narrower than a general rule, but using `made_with_ai: true` on all AI media is a cheap, safe default.

### 1.4 Limits
| Limit | Value | Source |
|---|---|---|
| `POST /2/tweets` | **100 / 15 min per user; 10,000 / 24 h per app** | https://docs.x.com/x-api/fundamentals/rate-limits |
| `POST /2/media/upload/initialize|append|finalize` | 1,875 / 15 min per user; 180,000 / 24 h per app | same |
| `POST /2/media/upload` (simple) | 500 / 15 min per user; 50,000 / 24 h per app | same |
| `GET /2/media/upload` (status) | 1,000 / 15 min per user; 100,000 / 24 h per app | same |
| Per-user per-day post cap | **UNCONFIRMED** (no daily per-user figure in the rate-limit table; older X-app limits of ~2,400/day not found in these docs) | |
| Pay-per-use read cap | 3 million post reads / monthly cycle | pricing page |

LabIA at 100 users x 30 posts/month is about 100 posts/day, far below the 10,000/24 h app cap (the cap would bind at roughly 330 users each posting 30/day).

### 1.5 Cost (pay-per-use, credit-based)
**What exists in 2026:** X launched **pay-per-use on 2026-02-06**. The official pricing page now lists **no Free/Basic/Pro tiers**, only pay-per-use plus an Enterprise referral. The Feb 6 changelog said "Basic and Pro plans remain available, and existing subscribers can opt in"; [SECONDARY] sources say legacy Basic moved to pay-per-use "from June 2026" and legacy Pro "from September 2026" at end of billing cycle (https://www.upload-post.com/x-api-pricing/, "checked 28 September 2026"), and that new developers cannot sign up for Basic/Pro (https://postproxy.dev/blog/x-api-pricing-2026/, published 2026-03-12). Enterprise pricing is not public (UNCONFIRMED).

**Price list [OFFICIAL]** https://docs.x.com/x-api/getting-started/pricing (no "last updated" on the page; the changelog entry "Apr 16, 2026" says writes changed effective **2026-04-20**):

| Action | Unit cost |
|---|---|
| **Post: Create** | **US$ 0.015 / request** |
| **Post: Create (with URL)** | **US$ 0.200 / request** |
| Post: Create (summoned reply) | US$ 0.010 |
| Media Metadata (alt text) | US$ 0.005 |
| Content: Manage | US$ 0.005 (meaning not defined; whether DELETE /2/tweets maps here: UNCONFIRMED) |
| Post read | US$ 0.005 / resource |
| Owned reads (your own data) | US$ 0.001 / resource (since 2026-04-20) |
| Media upload (init/append/finalize/status) | **not listed on the rate card** (SECONDARY upload-post.com reads the same: "no line of their own"); treat as unbilled but UNCONFIRMED |

Pre-2026-04-20 the prices were US$ 0.01 / post (plain and URL) per the announcement ([SECONDARY] https://x.com/XDevelopers/status/2044919377544261979 via search snippet; the devcommunity announcement returned HTTP 403 to me). Prices are "subject to change" per the page: **do not hardcode, read them from config and re-check monthly.**

**How billing works [OFFICIAL]:** buy credits up front in console.x.com; auto-recharge (amount + trigger threshold, max **one top-up per 5 minutes**, paused at zero/negative balance); optional **spending limit per billing cycle** (requests are blocked when reached); balance "can go slightly negative", then requests are blocked until topped up. Dedup (24 h UTC) applies to reads, not to post creation. Whether failed/403 post requests are charged: UNCONFIRMED.
**Incentives [OFFICIAL]** https://docs.x.com/x-api/getting-started/free-credits (changelog 2026-10-02): one-time US$ 20 for saving first eligible card + match of first auto-recharge up to US$ 50, **expire after 3 months**, "currently rolling out". xAI credits: 0% below US$ 200 cumulative spend per cycle, 10% at US$ 200, 15% at US$ 500, 20% at US$ 1,000.

**Worked examples (X)** (FX R$ 5.2226):

| Scenario | Calc | US$ | R$ |
|---|---|---|---|
| 1 post, media, no URL | 1 x 0.015 | 0.015 | 0.078 |
| 1 post containing a URL | 1 x 0.20 | 0.20 | 1.04 |
| **1 user x 30 posts/month, no URLs** | 30 x 0.015 | **0.45** | **2.35** |
| 1 user x 30, alt text on every media | 30 x (0.015+0.005) | 0.60 | 3.13 |
| 1 user x 30, every post has a URL | 30 x 0.20 | 6.00 | 31.34 |
| **100 users x 30 posts/month (3,000), no URLs** | 3,000 x 0.015 | **45.00** | **235.02** |
| 100 users x 30, alt text on every media | 3,000 x 0.020 | 60.00 | 313.36 |
| 100 users x 30, 10% of posts have a URL | 2,700 x 0.015 + 300 x 0.20 | 100.50 | 524.87 |
| 100 users x 30, all with URL | 3,000 x 0.20 | 600.00 | 3,133.56 |

Cost-quote design: price is deterministic per post (0.015 vs 0.20). The risk is **URL detection**: the docs do not define what counts as "with URL" (bare domains like `labia.app`, link cards, shortened links): UNCONFIRMED. Safest product behavior: detect anything URL-like in the caption client-side and server-side, show the higher price, and offer "remove link". The first US$ 70 of incentives roughly covers 1.5 months of the 100-user scenario but expires in 3 months.

### 1.6 Native scheduling
**No.** `CreatePostsRequest` in the OpenAPI spec (v2.169) has no schedule/publish-at field (fields: text, media, poll, reply, reply_settings, quote_tweet_id, community_id, made_with_ai, paid_partnership, nullcast, geo, etc.). Third parties (Typefully) schedule on their own servers and call `POST /2/tweets` at the time. The only scheduling APIs in the docs are the whitelisted **Livestream Scheduling API** (broadcasts), which is irrelevant.

### 1.7 Gotchas
- **Link surcharge (13.3x)**: any URL in caption.
- Refresh tokens are single-use; concurrent refreshes will break a connection (use a per-connection lock).
- Media ids expire 24 h after init: **upload at dispatch time**, not when the user schedules.
- Post-time video rules follow the *posting user's* Premium status, not your API plan (not a problem at 5-30 s).
- Following, Likes, Quote-Posts were removed from self-serve tiers (2026-04-20): do not plan features on them.
- Credits can hit zero: a prepaid float is a production dependency. Set auto-recharge amount high enough that one top-up outlasts 5 minutes of peak load (docs warn about this explicitly), and a spending limit as a kill switch.
- `paid_partnership` flag exists (2026-06-03) if personas do sponsored content.
- Doc inconsistency on video dimensions/bitrate (see 1.1).

### 1.8 Sources (all seen 2026-10-06)
- Pricing: https://docs.x.com/x-api/getting-started/pricing (raw: append .md; no page date)
- Free credits: https://docs.x.com/x-api/getting-started/free-credits
- Changelog (newest entry 2026-10-02): https://docs.x.com/changelog
- Rate limits: https://docs.x.com/x-api/fundamentals/rate-limits
- Create Post / OpenAPI v2.169: https://docs.x.com/x-api/posts/create-post
- Media: https://docs.x.com/x-api/media/introduction , https://docs.x.com/x-api/media/quickstart/media-upload-chunked , https://docs.x.com/x-api/media/quickstart/best-practices
- OAuth: https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code , https://docs.x.com/resources/fundamentals/authentication/oauth-2-0/user-access-token , token-exchange page https://docs.x.com/fundamentals/authentication/oauth-2-0/oauth-1-0a-token-exchange
- Getting access: https://docs.x.com/x-api/getting-started/getting-access
- Guidelines / automation: https://docs.x.com/developer-guidelines
- Not fetchable (HTTP 403): help.x.com automation page, devcommunity pricing announcement.
- Secondary: https://www.upload-post.com/x-api-pricing/ (checked 2026-09-28), https://postproxy.dev/blog/x-api-pricing-2026/ (2026-03-12), engadget (AI labels).

---

## 2. LinkedIn

Two very different products: **(A) personal profile via "Share on LinkedIn"** and **(B) Company Pages via Community Management API**.

### 2.1 Capabilities
| Content | Posts API `POST https://api.linkedin.com/rest/posts` | Notes |
|---|---|---|
| Text | Yes | |
| Single image | Yes | Images API: JPG/PNG/GIF, < 36,152,320 pixels, GIF <= 250 frames |
| Multi-image ("carousel-ish") | Yes, organic `MultiImage` | min **2**, max **20** images |
| Video | Yes | Videos API: MP4, **3 s to 30 min**, 75 KB to 500 MB (page also says initialize allows up to 5 GB; inconsistent); optional captions (SRT, English only) and custom thumbnail |
| Document carousel (PDF/PPT/DOC) | Yes | Documents API, <= 100 MB / 300 pages |
| Organic "Carousel" content type | **No** (sponsored only) | Posts API content-type table |
| Article / link | Yes | no URL scraping: you must supply title, description and a thumbnail image URN |
| Poll | Yes | |

All versioned calls require headers `Linkedin-Version: YYYYMM` and `X-Restli-Protocol-Version: 2.0.0`. Post creation returns `201` with the new id in the `x-restli-id` header. Only `lifecycleState: PUBLISHED` is accepted at creation.

**Upload flows [OFFICIAL]**
- Image: `POST /rest/images?action=initializeUpload` (owner = person or organization URN) returns `uploadUrl` + `urn:li:image:...`; upload binary; then reference in `content.media.id`. `SYNCHRONOUS_UPLOAD` is not supported.
- Video: `POST /rest/videos?action=initializeUpload` with `fileSizeBytes`; response gives `uploadInstructions` split in **4 MB parts** (0-4194303, ...) with an `uploadUrl` each; `PUT` each part with `Content-Type: application/octet-stream` and **save each `ETag`**; `POST /rest/videos?action=finalizeUpload` with `uploadToken` + ordered `uploadedPartIds`; poll `GET /rest/videos/{urn}` until `status: AVAILABLE` (other states `WAITING_UPLOAD`, `PROCESSING`, `PROCESSING_FAILED`); then `POST /rest/posts`. Upload URLs typically expire ~30 days.
- Caution: the "Share on LinkedIn" page (self-serve product page, updated 2023-12-14) still documents the legacy `ugcPosts` + `assets?action=registerUpload`. The Posts/Videos/Images pages state the Posts API **replaces ugcPosts** and the Videos/Images APIs replace the Assets API. Build on `/rest/*`.

### 2.2 Auth & tokens
- OAuth 2.0 Authorization Code (3-legged). Scopes: `w_member_social` (post as the authenticated member), `w_organization_social` + `r_organization_social` (Pages), `rw_organization_admin` (find the member's admin Pages, Community Management API), plus `openid profile email` from "Sign in with LinkedIn using OpenID Connect" for identity.
- **Access token: 60 days** ("Currently, all access tokens are issued with a 60-day lifespan", `expires_in: 5184000`). Page last updated 2025-11-17.
- **Refresh:** "Programmatic refresh tokens are available for a limited set of partners" (auth page) and "for all approved Marketing Developer Platform (MDP) partners" (refresh page, last updated 2025-05-31). When enabled: refresh token TTL **365 days, fixed** (does not extend on use); each refresh yields a new 60-day access token; after ~year the member must re-authorize. LinkedIn may revoke any token at any time.
  - Whether a Community Management API app gets programmatic refresh by default: **UNCONFIRMED** (MDP was succeeded by Community Management; ask LinkedIn / check Developer Portal Tools page).
  - For everyone else: the "seamless refresh" is re-running the authorization flow; the consent screen is skipped only if the member is still logged into linkedin.com and the current token has not expired. This needs a browser redirect, not a server job. **Plan a "reconnect LinkedIn" banner at ~day 45-50 and email/notification, and treat expiry as a normal state.**
- If you request different scopes than previously granted, earlier tokens are invalidated. Changing the app's scopes forces all users to re-authenticate.

### 2.3 Review / approval & timeline
**(A) Personal profile: self-serve, no review.** https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access (last updated 2025-06-26): "Open Permissions are the only permissions that are available to all developers without special approval", and the table lists **Share on LinkedIn -> `w_member_social`**, "added via self-service through the LinkedIn Developer Portal, under the Products tab". Prerequisite from the Community Management migration guide: "Company Page Verification is one of the prerequisites for a developer application applying for access to a product" (a LinkedIn Page of LabIA must be associated with the app and verified by a Page admin; exact UI step for the open Share product: UNCONFIRMED).
- Policy constraint [OFFICIAL] LinkedIn User Agreement (effective **2025-11-03**): s2.1 "only have one LinkedIn account, which must be in your real name"; s8.2(1) forbids creating a Member profile "for anyone other than yourself" and a false identity; s8.2(13) forbids bots/unauthorized automated methods to access the Services. **An AI-persona personal profile is not permitted. Posting through the official API to a real person's own profile is.** Also (Restricted Uses page, 2025-08-29): "No Headless or Fake Accounts: Do not create fake profiles to manage ad accounts or use individual profiles to manage multiple customers' accounts."

**(B) Company Pages: Community Management API, vetted, two tiers.** https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review (last updated 2026-02-11):
- "Only available to **registered legal organizations for commercial use cases only**." Needed: verified **business email** (personal addresses fail), legal name, registered address, website, privacy policy, a **super admin of the associated LinkedIn Page verifies the app**, no LinkedIn/Microsoft marks in the app name.
- **Development tier** (default on approval): reviewed for approved use case, verified email/org/website/domain, Page-verified app. Limits: **500 API calls per app per 24 h, 100 per member per 24 h; no BATCH_GET; social-action webhooks disabled**. Must finish and upgrade **within 12 months** or access is removed.
- **Standard tier**: separate request; needs the integration fully built, test credentials, valid privacy policy, compliance with terms/data-storage rules, and a **screencast under 5 min** showing the OAuth flow, posting to a Page via your app, and display of engagement data. "No restrictions" (rate limits become endpoint-specific, unpublished).
- **If rejected you cannot re-apply with the same app**; create a new app and start over. LinkedIn may decline an upgrade even if criteria are met.
- **Timeline: LinkedIn publishes none.** [SECONDARY] estimates: 1-4 weeks for development tier, longer if inconsistent (https://singhamandeep.com/linkedin-community-management-api-access/, 2026; https://www.outstand.so/blog/linkedin-api-pricing, verified Sept 2026). UNCONFIRMED officially. Budget **4-8 weeks end to end for standard tier** as a planning assumption (my estimate, not a vendor statement).
- Approved use cases include Page Management ("create and manage company posts"), Executive Management and Employee Advocacy (member-profile posting).
- Data rules (Restricted Uses, 2025-08-29): member social activity data may be stored at most **48 h**, most profile data 24 h; no exporting member data to customers; no social-feed display; no ad/sales/recruiting use.
- Versioning: monthly versions, each supported at least 12 months. **Marketing version 202510 sunsets on 2026-10-15 (9 days from today).** Current latest is 202609. Pin a recent `Linkedin-Version` and schedule a yearly bump (versioning page last updated 2026-09-16).

### 2.4 Limits
| Limit | Value | Source |
|---|---|---|
| Share on LinkedIn (personal) daily request limits | **Member: 150 requests/day; Application: 100,000 requests/day** (UTC day) | "Share on LinkedIn" page (updated 2023-12-14; it documents ugcPosts, so applicability to `/rest/posts` is UNCONFIRMED) |
| General rule | "Standard rate limits are not published in documentation"; look up per-endpoint in Developer Portal > app > Analytics after one test call; limits reset at 00:00 UTC; app and member scopes; alert at 75% | https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits (updated 2025-08-20) |
| Community Management **Development** tier | 500/app/day, 100/member/day (all APIs) | Community Management overview (updated 2026-05-15) |
| Call cost of one post | text: 1 call; image: 2-3 calls (init, upload, post); 30 s video (~15-25 MB): init + ~4-6 part uploads + finalize + status poll(s) + post = roughly **8-12 calls** (my count from the documented flow) | |

At 150 member calls/day a person can publish roughly 12-15 video posts/day; at 500 calls/app/day in Development tier the **whole app** can publish only ~40-60 video posts/day: fine for testing, not for 100 users.
Post length/commentary limit: UNCONFIRMED in what I read (the API returns `FIELD_LENGTH_TOO_LONG`; the LinkedIn UI limit is commonly cited as 3,000 chars).

### 2.5 Cost
No fee for Share on LinkedIn or Community Management API appears in any official page I read (UNCONFIRMED as a statement of "free"; [SECONDARY] https://www.outstand.so/blog/linkedin-api-pricing says self-serve and free). Costs are engineering time and review effort.
- 1 user x 30 posts/month: **US$ 0 / R$ 0**.
- 100 users x 30 posts/month: **US$ 0 / R$ 0** in API fees. Binding constraint is calls, not money: personal path 3,000 posts x ~3-12 calls = about 9,000-36,000 calls/month against a 100,000/day app cap (fine); Page path needs Standard tier.

### 2.6 Native scheduling
**No.** Posts API accepts `PUBLISHED` only at creation; no publish-at field in the post schema (post-api-schema page, updated 2026-04-30). `DRAFT`, `PUBLISH_REQUESTED`, `PUBLISH_FAILED` appear only as response states of the async publish. Scheduling is your job. LinkedIn's own UI scheduling is not exposed.

### 2.7 Gotchas
- 60-day tokens with no server-side refresh for ordinary apps: reconnect UX is mandatory.
- Real-identity rule: do **not** offer "connect a LinkedIn profile for an AI persona". Offer: the account owner's own profile (a human posting as themselves), or a **Company Page** that the persona's brand legitimately owns. Brand Pages are allowed; fake member profiles are not.
- Company Page connection requires the *end user* to hold ADMINISTRATOR, DIRECT_SPONSORED_CONTENT_POSTER or CONTENT_ADMIN on the Page.
- `r_member_social` (read your own posts/analytics) is a **closed permission** ("not accepting access requests"). Analytics for personal posts are not obtainable; plan UI accordingly.
- Dev-tier clock: 12 months to reach Standard or lose access.
- Rejection is terminal for that app; prepare the application carefully (legal entity, clean app name, privacy policy, screencast).
- Article posts need manual title/description/thumbnail; no link-preview scraping.
- `w_member_social` tokens are write-only for `GET /rest/images` in versioned calls; do not rely on reading assets back.
- Brazil: confirm that a Brazilian CNPJ qualifies as a "registered legal organization" (expected yes, not stated).

### 2.8 Sources (seen 2026-10-06; page dates in parentheses)
- Getting access / open permissions: https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access (2025-06-26)
- Share on LinkedIn: https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin (updated 2023-12-14)
- Posts API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api?view=li-lms-2026-09 (2026-05-13)
- Post schema: .../shares/post-api-schema?view=li-lms-2026-09 (2026-04-30)
- Images API: .../shares/images-api?view=li-lms-2026-09 (2026-06-24)
- Videos API: .../shares/videos-api?view=li-lms-2026-09 (2026-03-02)
- MultiImage: .../shares/multiimage-post-api?view=li-lms-2026-09 (2026-04-30); Documents: .../shares/documents-api (2026-06-24)
- Authorization code flow: https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow (2025-11-17)
- Programmatic refresh tokens: https://learn.microsoft.com/en-us/linkedin/shared/authentication/programmatic-refresh-tokens (2025-05-31)
- Rate limits: https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/rate-limits (2025-08-20)
- Community Management overview: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/community-management-overview?view=li-lms-2026-09 (2026-05-15)
- App review / vetting: https://learn.microsoft.com/en-us/linkedin/marketing/community-management-app-review (2026-02-11)
- Increasing access / tiers: https://learn.microsoft.com/en-us/linkedin/marketing/increasing-access?view=li-lms-2026-09 (2026-08-17)
- Migration guide: .../community-management/community-management-api-migration-guide?view=li-lms-2026-09 (2026-05-15)
- Versioning: https://learn.microsoft.com/en-us/linkedin/marketing/versioning?view=li-lms-2026-09 (2026-09-16)
- Restricted uses: https://learn.microsoft.com/en-us/linkedin/marketing/restricted-use-cases (2025-08-29)
- User Agreement: https://www.linkedin.com/legal/user-agreement (effective 2025-11-03)
- Secondary: https://www.outstand.so/blog/linkedin-api-pricing (verified Sept 2026), https://singhamandeep.com/linkedin-community-management-api-access/ (2026)

---

## 3. Threads API (Meta)

### 3.1 Capabilities
| Content | Supported | Notes ([OFFICIAL] https://developers.facebook.com/documentation/threads/posts) |
|---|---|---|
| Text | Yes | **500 chars** (emoji counted as UTF-8 bytes); 1 link preview (first URL) |
| Image | Yes | JPEG/PNG, <= 8 MB, width 320-1440, aspect <= 10:1, sRGB |
| Video | Yes | MOV/MP4 (no edit lists, moov atom first), **H.264 or HEVC**, AAC <= 48 kHz mono/stereo, progressive, closed GOP, 4:2:0, **23-60 fps**, width <= 1920, aspect 0.01:1-10:1 (**9:16 recommended**), <= 100 Mbps, **<= 5 min, <= 1 GB** |
| Carousel | Yes | 2-20 items (images/videos); counts as one post for rate limits |
| Polls, GIFs, text attachments, spoilers, topic tags, alt text (<=1,000 chars) | Yes | `reply_control`, `is_ghost_post`, `crossreshare_to_ig` also exist |

**Publish flow:** (1) `POST /{threads-user-id}/threads` with `media_type=TEXT|IMAGE|VIDEO|CAROUSEL` and **`image_url`/`video_url` pointing at a publicly reachable server** ("We will cURL your video"); (2) wait (docs recommend ~30 s on average) and `POST /{threads-user-id}/threads_publish` with `creation_id`. Carousel: item containers (`is_carousel_item=true`), then a `CAROUSEL` container with `children`, then publish. Container status: `GET /{container-id}?fields=status,error_message` returning `IN_PROGRESS | FINISHED | ERROR | EXPIRED (24 h) | PUBLISHED`; poll about once a minute for up to 5 minutes. Error codes include `FAILED_DOWNLOADING_VIDEO`, `INVALID_ASPEC_RATIO` (sic), `INVALID_BIT_RATE`, `INVALID_FRAME_RATE`, `INVALID_DURATION`. `auto_publish_text` publishes text-only posts in one call.
Base host: `graph.threads.net` or `graph.threads.com` (both documented).

### 3.2 Auth & tokens
- OAuth 2.0 authorization window (`threads.com/oauth/authorize`; the docs show both `.net` and `.com` hosts, the `.com` hosts come from a fetch summary of the get-access-tokens page, verify in the dashboard; parameters `client_id`, `redirect_uri`, `response_type=code`, `scope`; `state` optional); code (valid 1 h) exchanged at `graph.threads.com/oauth/access_token` for a short-lived token + `user_id`. Use the **Threads app ID and Threads app secret** (separate from the Meta app's main ID/secret).
- Scopes: `threads_basic` (required for everything), **`threads_content_publish`** (publishing), optional `threads_manage_replies`, `threads_read_replies`, `threads_manage_insights`, `threads_delete`, etc.
- **Short-lived 1 h -> long-lived 60 days** via `GET /access_token?grant_type=th_exchange_token&client_secret=...&access_token=...` (server-side only). **Refresh** with `GET /refresh_access_token?grant_type=th_refresh_token&access_token=...` once the token is at least **24 h old** and not expired; new 60 days from refresh. Unrefreshed tokens expire at 60 days and cannot be refreshed. **Refresh is fully server-side**: a daily cron that refreshes tokens older than ~30 days suffices, no user interaction.
- Permission grants by users with public profiles last 90 days and are extended by refreshing; private profiles can now also refresh, with 90-day permission validity (doc on long-lived tokens and get-started).

### 3.3 Review / approval & timeline
- **App Review is mandatory for real users:** "If your app will be used by anyone without a Role on the app ... it must first undergo App Review." Until approved, only users with a role (Admin, Developer, Tester, **Threads Tester**) can grant the permissions. Each permission (`threads_basic`, `threads_content_publish`) must be approved, **and the app must be published** (needs 512-1024 px app icon, privacy policy URL, data-deletion callback/URL, DPO contact if doing business in the EU). Source: https://developers.facebook.com/documentation/threads/get-started , https://developers.facebook.com/documentation/resp-plat-initiatives/individual-processes/app-review , .../create-an-app/threads-use-case.
- **Business verification:** Meta's App Review page says "Starting on or after June 12th, 2023, if your app requires advanced level access to permissions or features, you will need to complete business verification and data handling questions as part of the app review process." Meta's Business Verification page: mandatory (since 2023-02-01) for advanced access / serving other businesses, not needed if all users have a role on the app. **I did not find a Threads-specific page that states it; applying the general rule means yes for a multi-tenant SaaS (UNCONFIRMED for Threads specifically).** Business verification requires a legal business (Brazilian CNPJ documents; exact list lives in the Business Help Center, not fetched).
- **Timeline:** Meta publishes none that I could open. [SECONDARY] https://www.blotato.com/blog/threads-api-pricing (published 2026-07-01, updated 2026-09-10): Meta says review "typically takes less than one week, often 2 to 3 days", first-round rejections are common, budget **2-3 weeks including resubmissions**; business verification **adds 1-2 weeks**. Other 2026 guides say 2-6 weeks. Planning assumption: **3-8 weeks**.
- Meta tests the app itself: "If we are unable to access your app to test it, your entire submission will be rejected" (App Review page), so you need a working test login and testing instructions; a screencast per permission is typical in [SECONDARY] guides but not stated on the official pages I read.
- Policy on AI-generated personas / automated accounts for Threads: **UNCONFIRMED** (I could not open Meta's Platform Terms/Threads terms; Meta has "AI info" labeling elsewhere). Treat as a legal-review item.

### 3.4 Limits
| Limit | Value | Source |
|---|---|---|
| Published posts | **250 per profile per rolling 24 h**; a carousel counts as 1 | https://developers.facebook.com/documentation/threads/overview |
| Replies | 1,000 / 24 h; deletions 100 / 24 h; location searches 500 / 24 h | same |
| General API calls | `4,800 x impressions` per rolling 24 h per app+user pair (minimum impressions = 10, so floor 48,000); plus CPU-time caps | same |
| Check remaining quota | `GET /{threads-user-id}/threads_publishing_limit?fields=quota_usage,config` (needs `threads_basic` + `threads_content_publish`) | same |
Meta explicitly recommends the app enforce the publishing limit itself "especially if your app allows app users to schedule posts".

### 3.5 Cost
Meta publishes **no price or per-call fee** for the Threads API (absent from every official page; [SECONDARY] blotato.com states "no paid tier or per-call fee"). Cost is review effort and storage/egress for public media URLs.
- 1 user x 30 posts/month: **US$ 0 / R$ 0**.
- 100 users x 30 posts/month: **US$ 0 / R$ 0**; 3,000 posts/month is nowhere near 250/day per profile.
- LabIA infra cost: media must be **publicly fetchable** at publish time (signed public URL on Vercel Blob/R2/S3). Egress of a 5-30 s 9:16 clip is small.

### 3.6 Native scheduling
**No.** No schedule parameter in `POST /{threads-user-id}/threads` (checked the full parameter table). Containers expire after 24 h, so **create the container at dispatch time**, not when the user schedules.

### 3.7 Same Meta app as Instagram?
- Official (https://developers.facebook.com/documentation/development/create-an-app): "you can add multiple use cases to a single app, provided they are compatible"; example given: Threads API use case + "Manage everything on your Page"; **incompatible** with "Authenticate and request data from users with Facebook Login". Use cases **cannot be removed** once added. Whether "Threads API" is compatible with the Instagram API use cases: **UNCONFIRMED**.
- A Meta app with the Threads use case exposes **two sets of app ID/secret**; Threads calls must use the *Threads* app ID/secret (Threads get-started page).
- Community reports (developers.facebook.com/community thread, answer dated "June 19", year not visible) say an existing app cannot get the Threads use case and a new app must be created. **Recommendation: use a dedicated Meta app for Threads** (separate review, separate redirect URIs, avoids use-case lock-in), and a separate app for Instagram. Both can sit under the same verified Meta Business, so business verification is done once.

### 3.8 Gotchas
- Public media URL required, so signed private URLs must be long enough for Meta's fetch (secs to minutes) and reachable from Meta's IPs (no auth cookies).
- Video: the 9:16 export must be H.264/HEVC, closed GOP, moov-at-front (`-movflags +faststart`), AAC <= 48 kHz, 23-60 fps: map these into the ffmpeg preset.
- Wait/poll before `threads_publish`; handle `ERROR` codes and retry.
- Private-profile users: 90-day permission validity may force re-consent.
- LabIA cannot create persona accounts for the user; each Threads profile must already exist and the owner must grant access through the authorization window (how Threads account creation is tied to Instagram in 2026: UNCONFIRMED, not checked).

### 3.9 Sources (seen 2026-10-06; these markdown pages carry no page date: UNCONFIRMED recency)
- https://developers.facebook.com/documentation/threads/overview
- https://developers.facebook.com/documentation/threads/posts
- https://developers.facebook.com/documentation/threads/get-started
- https://developers.facebook.com/documentation/threads/get-started/long-lived-tokens
- https://developers.facebook.com/documentation/threads/reference/publishing
- https://developers.facebook.com/documentation/threads/troubleshooting
- https://developers.facebook.com/documentation/development/create-an-app/threads-use-case
- https://developers.facebook.com/documentation/development/create-an-app
- https://developers.facebook.com/documentation/resp-plat-initiatives/individual-processes/app-review (and /content)
- https://developers.facebook.com/docs/development/release/business-verification
- Secondary: https://www.blotato.com/blog/threads-api-pricing (2026-07-01, upd. 2026-09-10)

---

## 4. Bluesky (AT Protocol) in one paragraph

**Auth:** Bluesky's docs say apps with their own end-user login "should implement OAuth"; app passwords are for "single-purpose applications such as bots or command-line tools". AT Protocol OAuth requires PKCE (S256), PAR and DPoP with server nonces; access tokens <= 30 min; refresh tokens: public clients limited to ~2-week sessions, **confidential clients up to 180 days**; scopes `atproto` plus `transition:generic` (legacy broad access) or granular `repo:...` permissions (https://atproto.com/specs/oauth; https://bsky.network/docs/oauth-client). For a Next.js backend use a confidential client and an SDK. **Posting:** `app.bsky.feed.post` records: text <= **300 graphemes**, up to **4 images** each **<= 2,000,000 bytes** with alt text (lexicon `app.bsky.embed.images`), 1 video (`app.bsky.embed.video`, `video/mp4`, **<= 300 MB** per lexicon; Engadget 2026-08-26 reports a new **10-minute** cap [SECONDARY]); recommended video path: service-auth token -> `app.bsky.video.uploadVideo` on video.bsky.app -> poll `getJobStatus` -> embed the blob; hosted accounts need a verified email and have **daily video-count/byte limits** (`app.bsky.video.getUploadLimits`; "25 videos or 10 GB per day" is [SECONDARY]). **Cost:** free, no review or approval. **Limits:** per-account content writes 5,000 points/hour and 35,000/day (CREATE = 3 points, so max 1,666 records/hour and **11,666/day**), PDS blob max 50 MB (https://bsky.network/docs/rate-limits); developer guidelines prohibit spam/automated bulk interactions and require report/block/delete mechanisms for apps with UGC. **Scheduling:** none native. Worked cost: 1 user x 30 and 100 users x 30 posts/month = US$ 0. Sources seen 2026-10-06: bsky.network/docs/{rate-limits, about-bluesky-content/video, bluesky-api/creating-a-post, oauth-client, developer-guidelines}, github.com/bluesky-social/atproto lexicons, atproto.com/specs/oauth, engadget.com (2026-08-26). Note docs.bsky.app now redirects (308) to bsky.network/docs.

---

## 5. Comparison table

| | X | LinkedIn personal | LinkedIn Page | Threads | Bluesky |
|---|---|---|---|---|---|
| Text | 280 (weighted) | yes | yes | 500 | 300 graphemes |
| Image | up to 4, 5 MB each | 1 or multi (2-20) | 1 or multi (2-20) | 1, 8 MB | up to 4, 2 MB each |
| Video | 1, H.264/AAC-LC, chunked 5 MB parts | MP4 3 s-30 min | same | MP4/MOV, H.264/HEVC, <= 5 min, 1 GB, public URL | MP4, <= 300 MB, video service |
| Carousel | no (max 4 images) | no organic carousel; MultiImage / PDF document | same | yes (2-20) | no |
| Auth | OAuth2 PKCE | OAuth2 code | OAuth2 code | OAuth2 code (Threads app id) | atproto OAuth (PKCE+PAR+DPoP) |
| Access token | 2 h | 60 d | 60 d | 60 d (refreshable) | <= 30 min |
| Refresh | ~6 months, single-use rotating | none for ordinary apps (re-consent); 365 d for approved partners | same | server-side `th_refresh_token` | <= 180 d (confidential) |
| Platform review | none documented | none | **CM API: dev tier, then standard tier** | **Meta App Review + published app + (likely) business verification** | none |
| Review time | n/a | n/a | not published; est. 1-4+ wks (secondary) | est. 2-8 wks (secondary) | n/a |
| Post limits | 100/15 min/user, 10k/24 h/app | 150 calls/day/member (older doc) | Dev 500/app/day, 100/member/day; Standard unpublished | 250 posts/24 h/profile | 11,666 records/day |
| API cost | **US$ 0.015 / US$ 0.20 with URL** | free | free | free | free |
| 1 user x 30 posts | US$ 0.45 (R$ 2.35) | 0 | 0 | 0 | 0 |
| 100 users x 30 posts | US$ 45 (R$ 235); US$ 600 if all have URLs | 0 | 0 | 0 | 0 |
| Native scheduling | no | no | no | no | no |
| AI persona risk | bot label + `made_with_ai`; AI replies need approval | **fake profiles forbidden** | brand Page OK; no fake member profiles | UNCONFIRMED | spam rules only |

---

## 6. What this means for a multi-tenant SaaS (LabIA)

**Who pays / who needs what**
- **X:** LabIA holds the one developer app and **LabIA pays the X bill** (prepaid credits in console.x.com, USD, via card). End users only need an X account and click "Authorize". You re-bill them per post inside LabIA's own wallet: quote = (0.015 or 0.20 US$) x live FX + card/IOF buffer + margin, and show the actual after. Because credits are shared across all tenants, one tenant's link-heavy posting spends the common balance: enforce per-tenant prepaid wallet, per-tenant daily cap and an app-wide spending limit.
- **LinkedIn, Threads, Bluesky:** no API charge; end users need only their own account (and, for Pages, an admin role). LabIA bears the review/maintenance cost, not a metered cost.
- Each persona has its own social accounts: model `SocialConnection(personaId, platform, externalId, tokens, scopes, expiresAt, refreshState)`; never share content across personas on X (identical-content rule).

**What blocks launch (ordered)**
1. **Threads:** Meta App Review + published app (+ business verification). Start immediately; until approved only users with an app role (Threads Testers) can connect. Needs privacy policy URL, data-deletion callback, app icon, screencast, test accounts.
2. **LinkedIn Company Pages:** Community Management API (legal entity + verified Page + business email), development tier (500 calls/app/day) then standard tier with a screencast. Not published timeline; a rejection forces a new app. Meanwhile ship **LinkedIn personal profile** (open permission, no review), restricted to real people posting as themselves.
3. **X:** no gate, but needs a funded prepaid balance, Automated-label/bio guidance for autonomous personas, and URL-surcharge handling in the quote.
4. **Bluesky:** none; cheapest first integration to prove the whole pipeline (OAuth, media, scheduler, cost-quote UI).

**Build implications**
- You must build the scheduler (Vercel Cron or a queue such as Inngest/QStash + a `scheduled_posts` table); **do the media upload/container creation at dispatch time**, not at schedule time (X media ids and Threads containers expire in 24 h).
- Keep media in object storage with **public, time-limited URLs** for Threads, and a local pipeline to produce per-platform renditions (X: 720x1280 H.264 High/AAC-LC; Threads: H.264/HEVC closed GOP, faststart; LinkedIn: MP4; Bluesky: MP4 <= 300 MB).
- Token refresh jobs: X (rotating single-use refresh token; lock per connection), Threads (daily refresh of tokens older than ~30 days), LinkedIn (60-day expiry; UI reconnect flow), Bluesky (SDK-managed).
- LinkedIn API versioning needs an owner: pin `Linkedin-Version` and bump at least yearly (202510 dies 2026-10-15).
- Cost-quote service: platform price table in DB/config (X rates changed twice in 2026: Feb 6 launch, Apr 20 increase), FX rate source, and a post-hoc cost record using the usage endpoint (`GET /2/usage/tweets`, 50/15 min) to reconcile.
- Compliance copy for the PT-BR UI: tell users that fully automated personas on X must carry the "Automated" label; offer an "AI-generated" toggle that sets `made_with_ai`; block LinkedIn connection of non-real-person profiles.

**Open questions to resolve before committing (UNCONFIRMED items)**
1. Exactly what X counts as "URL" for the US$ 0.20 tier; whether failed requests or DELETE are billed; whether media upload endpoints are truly free.
2. Whether LinkedIn Community Management API apps receive programmatic refresh tokens (365 d); LinkedIn's real review times; whether a Brazilian CNPJ passes "registered legal organization".
3. Whether Threads API App Review needs business verification in practice for LabIA (generic Meta rule says yes) and the real Meta review time; whether Threads and Instagram use cases can share one Meta app.
4. Meta/Threads policy on AI-generated personas and automated accounts.
5. Brazilian tax/IOF on US$ card top-ups for X credits.
6. Whether a Share-on-LinkedIn-only app can call the versioned `/rest/posts` (documented w_member_social support says yes; the product page still shows legacy ugcPosts).
