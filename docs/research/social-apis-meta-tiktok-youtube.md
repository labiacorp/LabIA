# Social publishing APIs for LabIA: Instagram, Facebook Pages, TikTok, YouTube Shorts

Research date: 2026-10-06 (all "seen" dates below are this day unless noted).
Method: first-party docs fetched live (Meta `.md` doc sources, TikTok for Developers, Google/YouTube docs). Where a first-party page would not render or did not state a number, the item is marked **UNCONFIRMED** and any secondary source is labelled as such. Nothing here is from memory.

Legend: "FP" = first-party (platform's own doc). "SEC" = secondary (blog, forum, press). Numbers from SEC sources are never treated as confirmed.

---

## 0. Executive findings (read this first)

1. **Instagram**: Content Publishing works on both login paths. "Instagram API with Instagram Login" needs **no Facebook Page** and covers Business and Creator professional accounts. Going live for other users' accounts needs Business Verification + Tech Provider access verification + App Review (Advanced Access). Realistic: 4-8 weeks. No native scheduling (LabIA must run the timer; containers expire after 24 h). Official docs contradict themselves on the daily limit (100 vs 50): plan for 50 and read `config.quota_total` from the API at runtime.
2. **Facebook Pages**: only platform with true **native scheduling** (`published=false` + `scheduled_publish_time`, Reels via `video_state=SCHEDULED`). Same review chain as Instagram (`pages_manage_posts` etc. need App Review).
3. **TikTok**: the hardest gate. Until the app passes a separate **Content Posting audit**, everything posted is private (`SELF_ONLY`), at most **5 users per 24 h**, and the creator's account itself must be private. PULL_FROM_URL needs a **verified domain you control** (fal.ai CDN and Vercel Blob domains cannot be used; no redirects). No scheduling parameter. Mandatory UX rules (no default privacy, consent, disclosure toggles). `is_aigc` flag exists.
4. **YouTube**: big change in 2026. `videos.insert` now has its **own quota bucket: 100 uploads/day per Google Cloud project** (all LabIA tenants share it) and costs 1 unit. Unverified API projects (created after 2020-07-28) can only upload **private** videos until an API compliance audit passes. Native scheduling exists (`status.publishAt`, video must be `private`). `status.containsSyntheticMedia` exists. No image/carousel support.
5. **Cost**: none of the four charges per-call fees in the official docs (UNCONFIRMED as an explicit "free" statement; no pricing page exists for any of them). The cost is review effort, verification, and compliance UX.
6. **None of the four can be used by arbitrary tenants on day one.** Plan for Meta (4-8 weeks) and TikTok (3-8+ weeks) and YouTube (2-8+ weeks, least predictable) review tracks in parallel, starting with Business Verification (needs CNPJ documents).

---

## 1. Instagram (Meta)

### 1.1 Capabilities

Two supported configurations (FP, Instagram Platform overview, https://developers.facebook.com/documentation/instagram-platform/overview):

| | Instagram API with **Instagram Login** (Business Login for Instagram) | Instagram API with **Facebook Login for Business** |
|---|---|---|
| Content publishing | Yes | Yes |
| Facebook Page required | **No** | **Yes** (IG professional account linked to a Page; user must hold Page tasks, e.g. `CREATE_CONTENT`/`MANAGE`) |
| Account types | Instagram professional: Business **and** Creator | Instagram professional: Business and Creator |
| Host | `graph.instagram.com` | `graph.facebook.com` (+ `rupload.facebook.com`) |
| Token | Instagram User access token | Facebook User/Page access token |
| Scopes (publishing) | `instagram_business_basic`, `instagram_business_content_publish` | `instagram_basic`, `instagram_content_publish`, `pages_read_engagement` (+ `ads_management`/`ads_read` if the user's Page role came via Business Manager) |
| Partnership ads label, product tags, hashtag search, collaborators | No | Yes |
| Resumable upload (`upload_type=resumable`) | Guide says "only for apps that implemented Facebook Login for Business"; the media reference does not repeat the restriction. **UNCONFIRMED for Instagram Login.** | Yes |

Recommendation for LabIA: **Instagram Login** (no Page, simplest onboarding for AI-influencer accounts that were never linked to a Page). Meta's review page also says "Your app can either use Facebook Login or Instagram Login but not both" for the Instagram products.

Publishable media (FP, content-publishing guide + `ig-user/media` reference, API v25.0 shown as latest):
- Single image (**JPEG only**), single video, **Reels** (`media_type=REELS`), **Stories** (`media_type=STORIES`), **Carousels** (up to 10 images/videos mixed; Reels cannot be carousel items; carousel images are cropped to the first item's ratio, default 1:1).
- Trial Reels (`trial_params.graduation_strategy` = `MANUAL` | `SS_PERFORMANCE`) supported on both login paths.
- Caption: max 2200 chars, 30 hashtags, 20 @tags; caption not supported on carousel children. `collaborators` up to 3 (Feed image, Reels, Carousels; not Stories). `alt_text` (images, up to 1000 chars). `cover_url` / `thumb_offset` for Reels. `share_to_feed` flag for Reels. Story stickers (link/poll/location) not supported.

Flow:
1. `POST /<IG_ID>/media` with `image_url` or `video_url` (+ `media_type`), returns container id. Carousel: create child containers with `is_carousel_item=true`, then a `media_type=CAROUSEL` container with `children=[...]`.
2. Poll `GET /<CONTAINER_ID>?fields=status_code`: `IN_PROGRESS`, `FINISHED`, `ERROR`, `EXPIRED` (24 h), `PUBLISHED`. Meta recommends polling **once per minute, max 5 minutes**.
3. `POST /<IG_ID>/media_publish` with `creation_id`.

**Public URL requirement: yes.** "We cURL media used in publishing attempts, so the media must be hosted on a publicly accessible server at the time of the attempt." URLs should be plain US-ASCII. A short-lived signed public URL is therefore fine as long as it is fetchable unauthenticated until the container reaches `FINISHED` (behaviour with expiring signed URLs is not documented: **UNCONFIRMED**, test it).
Resumable alternative: `POST https://rupload.facebook.com/ig-api-upload/<version>/<CONTAINER_ID>` with either the file bytes (`offset`, `file_size` headers) or a `file_url` header pointing at a hosted file.

Video specs, Reels (FP, `ig-user/media` reference, "Reel Specifications"):
- Container MOV or MP4, **no edit lists, moov atom at the front**.
- Video codec HEVC or **H.264**, progressive scan, **closed GOP**, 4:2:0.
- Frame rate **23-60 fps**. Max width **1920 px**. Aspect ratio accepted 0.01:1 to 10:1; 9:16 recommended.
- Video bitrate VBR **max 25 Mbps**. Duration **3 s min, 15 min max**. File size **300 MB max**.
- Audio: AAC, max 48 kHz, 1-2 channels, 128 kbps. Whether a **silent video** is accepted is not stated: **UNCONFIRMED** (test it).
- Reels cover image: JPEG, ≤8 MB, 9:16 recommended.
- Stories video: ≤60 s, ≤100 MB, 3 s min.
- Images: JPEG, ≤8 MB, aspect 4:5 to 1.91:1, width 320-1440 px, sRGB.
LabIA's 9:16, 5-30 s MP4 H.264 fits, but fal.ai outputs may not satisfy "closed GOP / no edit lists / moov at front"; plan an ffmpeg normalisation step (inference). Images from fal.ai (often PNG/WebP) **must be converted to JPEG**.

### 1.2 Auth & tokens

Business Login for Instagram (FP, https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login):
- Authorize: `https://www.instagram.com/oauth/authorize?client_id=…&redirect_uri=…&response_type=code&scope=instagram_business_basic,instagram_business_content_publish` (+ optional `state`, `enable_fb_login`, `force_reauth`).
- Authorization code valid **1 hour**, single use. Exchange at `https://api.instagram.com/oauth/access_token` → **short-lived token (1 hour)**.
- Exchange for long-lived at `https://graph.instagram.com/access_token?grant_type=ig_exchange_token` (server-side only) → **60 days**.
- Refresh at `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token` for another 60 days, only if the token is **≥24 h old, not expired, and `instagram_business_basic` is granted**. "Tokens that have not been refreshed in 60 days will expire and can no longer be refreshed" → LabIA needs a refresh job (e.g. weekly) and a "reconnect" state in the UI.
- Old scope names (`business_basic`, `business_content_publish`, …) were deprecated 2025-01-27.
Facebook Login path: long-lived user token ~60 days; Page access tokens derived from a long-lived user token "do not have an expiration date" (FP, https://developers.facebook.com/documentation/facebook-login/guides/access-tokens/get-long-lived).

### 1.3 Review/approval and realistic timeline

Chain required to serve accounts you do not own (FP):
1. **Business app** type, connected to a **verified Business** (Business Verification). Advanced Access "requires App Review and Business Verification" (overview). Brazil documents (SEC, 2026-05-14 and others): CNPJ, Contrato Social/MEI certificate, bank statement, utility bill; "1-5 business days when clean, up to 14" (SEC; **UNCONFIRMED by FP**, Meta's help page would not render).
2. **Tech Provider "Access verification"**: required for any app used by other businesses that requests `instagram_business_basic`, `instagram_business_content_publish`, `instagram_basic`, `instagram_content_publish`, `pages_manage_posts`, `pages_read_engagement`, `publish_video`, etc. Prerequisite: Business Verification with no restrictions. Meta: decision "within approximately 5 days". Independent of App Review. Without it, calls from users with no role on the app fail with error 100. (FP, https://developers.facebook.com/documentation/development/release/access-verification)
3. **Data handling questions** (answered inside the review flow, evaluated in ~30 s) and then a recurring **annual Data Use Checkup** (FP).
4. **App Review** for each permission: working test environment reviewers can reach, step-by-step login/test instructions, one successful API call per permission within the last 30 days, **screencast per permission** (1080p+, show the user granting the permission and the feature in use, English UI or captions), 1024x1024 app icon, **Privacy Policy URL**, app category, business email. Terms of Service URL is required to switch to Live. A **Data Deletion Request URL (callback or instructions)** and a deauthorize callback are configured in Business Login settings. Do not copy-paste descriptions between permissions. (FP: submission guide, IG app review page, basic settings, data deletion doc.)
5. Meta states a decision "within a week" (FP submission guide). Field data for 2026 (SEC, bundle.social 2026-08-04): until 2025 1-3 days; Jan-Mar 2026 4-6 days; Apr 2026 9-12; May 2026 17-19; mid-2026 "up to 20 days". A Meta developer-community thread (SEC) shows an app with 8 permissions pending 13+ days from 2026-05-21. First submissions are frequently rejected (SEC).
**Realistic total for LabIA: ~4-8 weeks** from starting Business Verification if CNPJ documents are ready (best case ~3 weeks, each rejection round adds ~1-2 weeks). Duration inferred from the pieces above; no first-party end-to-end number exists.

### 1.4 What works BEFORE approval (Development mode / Standard Access)

- Standard Access is "for apps that will only be used by people who have roles on them, during app development, or for testing" (FP). App Review is "not required" if only users with a role use it.
- In Development mode, only **role users** (Admin/Developer/Tester, and Instagram Testers added via App Roles) can grant permissions; data created is only visible to role users until the app is switched Live (FP, app modes/roles).
- Role limits: up to 500 admins; "most apps, not linked [to a verified Business], can have up to 50 testers"; verified-Business apps up to 500 analytics users + testers combined (FP, app roles).
- Test Instagram accounts must be professional and **public** (FP, create-an-app guide, 2025-05-14 version) and be added in Dashboard → App roles / Instagram API setup.
- The dashboard "Generate token" path yields long-lived (60-day) tokens for those accounts (FP, get-started).
- Net: you can build and demo the whole publish/schedule flow end-to-end with your own and friends' accounts. You cannot onboard a paying customer.

### 1.5 Limits

- **Publishing limit per account: documented inconsistently.** Content Publishing guide: "100 API-published posts within a 24-hour moving period; carousels count as a single post" (enforced at `media_publish`). Same guide, carousel section: "50 published posts within a 24-hour period". `content_publishing_limit` reference: `config.quota_total` "currently `50`", `quota_duration` 86400, example response shows 50. SEC (bundle.social, 2026-08-04) confirms the endpoint returns 50 and notes the doc conflict. History (SEC, Ayrshare 2023-06-27): was raised 25 → 50 in 2023. **Plan on 50, read `GET /<IG_ID>/content_publishing_limit?fields=quota_usage,config` before each publish.** (FP: https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/content_publishing_limit)
- **Containers: 400 created per rolling 24 h per account; containers expire after 24 h.**
- Carousel: ≤10 items.
- API rate limit: calls per 24 h = 4800 × impressions for that app/user pair (Instagram Business Use Case rate limiting, FP overview).
- Reels: 3 s-15 min, ≤300 MB (see 1.1).

### 1.6 Cost

No fees documented anywhere in the Instagram Platform docs. Free to use (UNCONFIRMED as an explicit statement; there is no price list). Real cost is Business Verification effort, review cycles and the compliance surface (privacy policy, deletion endpoint, annual Data Use Checkup).

### 1.7 Native scheduling

**No.** Searched the content-publishing guide, `ig-user/media` and `media_publish` references and the full changelog: no `scheduled_publish_time` or equivalent for Instagram. Meta's own guide tells apps that "allow app users to schedule posts to be published in the future" to enforce the publishing limit themselves, i.e. the app holds the timer. SEC (bundle.social 2026-08-04): "There is no `scheduled_publish_time` equivalent. You hold the schedule; the API publishes now."
Implication: because containers expire in 24 h and a Reel needs 5-60 s of processing, create the container ~10-30 minutes before the slot, poll to `FINISHED`, then call `media_publish` at the target minute. Keep the payload and a retry queue in Postgres (not in the container).

### 1.8 AI-generated content disclosure

- **API field exists**: `is_ai_generated=true` on `POST /<IG_ID>/media` applies the "AI info" label. Available on both login paths. For carousels set it **only on the carousel container**; setting it on children errors. Readable back via `GET /<media_id>?fields=is_ai_generated`. Added in changelog entry **2026-06-22**. (FP: content-publishing guide, `ig-user/media` reference, changelog.)
- Policy: Meta says it will require people to use the disclosure/label tool for organic "photorealistic video or realistic-sounding audio that was digitally created or altered", and "may apply penalties if they fail to do so" (FP, Meta newsroom 2024-02-06). For AI influencers with photoreal faces/voices, **default `is_ai_generated=true` on, with the user able to override** is the safe design. (Whether non-photoreal/stylised content needs it is policy-dependent; the label is not stated to be mandatory for those.)

### 1.9 Gotchas

- Official docs inconsistent: 100 vs 50 daily limit; review page lists `instagram_business_content_publishing` ("-ing") while the OAuth doc uses `instagram_business_content_publish`; one old banner says "Reels and stories are not supported" but that sentence belongs to the `alt_text` note. Always test against the live API.
- The 2019 changelog entry saying Creators cannot use Content Publishing is **obsolete**: current Instagram Login docs target "businesses and creators" (FP) and SEC sources confirm Creator publishing since 2023. Stories publishing may be restricted to Business accounts (SEC, **UNCONFIRMED**).
- Account must be a professional account (switching is free in the IG app). Personal accounts cannot connect.
- Media must be fetchable without auth at `cURL` time: **private Vercel Blob URLs will fail**; use short-lived public (signed) URLs and keep them valid until `FINISHED`.
- An IG account linked to a Page that requires **Page Publishing Authorization (PPA)** cannot publish until PPA is done (Facebook Login path; may also matter for linked accounts).
- `media_type` for a published Reel reads back as `VIDEO`; use `media_product_type`.
- Business Verification and Live mode need a real legal entity; the app admin must be a Business admin.
- Live mode toggle exposes Development-mode test posts to everyone; clean test posts before going live.

### 1.10 Sources (URL, date seen 2026-10-06)

- Content Publishing guide (FP, no page date; banner 2025-03-24 for `alt_text`): https://developers.facebook.com/documentation/instagram-platform/content-publishing
- IG User Media reference (FP, banner 2025-07-09; API v25.0): https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/media
- Content publishing limit reference (FP): https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/content_publishing_limit
- Instagram Platform overview (FP): https://developers.facebook.com/documentation/instagram-platform/overview
- Instagram API with Instagram Login (FP): https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login
- Business Login for Instagram, tokens (FP): https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login
- Get started (FP): https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/get-started
- Create an Instagram app (FP, "Updated 14 May 2025"): https://developers.facebook.com/documentation/instagram-platform/create-an-instagram-app/
- Instagram Platform changelog (FP, latest entry 2026-06-22): https://developers.facebook.com/documentation/instagram-platform/changelog
- App Review for Instagram API (FP): https://developers.facebook.com/documentation/instagram-platform/app-review
- App Review overview / content / submission guide (FP): https://developers.facebook.com/documentation/resp-plat-initiatives/individual-processes/app-review , .../app-review/content , .../app-review/submission-guide
- Business Verification (FP): https://developers.facebook.com/documentation/development/release/business-verification
- Access (Tech Provider) verification (FP): https://developers.facebook.com/documentation/development/release/access-verification
- App modes / roles (FP): https://developers.facebook.com/documentation/development/build-and-test/app-modes , .../app-roles
- Data handling questions (FP): https://developers.facebook.com/documentation/resp-plat-initiatives/individual-processes/data-handling-questions
- Data deletion callback / basic settings (FP): https://developers.facebook.com/documentation/development/create-an-app/app-dashboard/data-deletion-callback , .../basic-settings
- Meta AI labeling announcement (FP, 2024-02-06): https://about.fb.com/news/2024/02/labeling-ai-generated-images-on-facebook-instagram-and-threads/
- SEC: bundle.social "Instagram Graph API production guide" (2026-08-04) https://bundle.social/blog/instagram-graph-api ; bundle.social "Meta App Review 20 days" (2026-08-04) https://bundle.social/blog/meta-app-review-20-days ; Meta developer community thread (submitted 2026-05-21) https://developers.facebook.com/community/threads/2119529588613973/ ; Ayrshare (2023-06-27) https://www.ayrshare.com/blog/the-instagram-api-just-went-to-11.md ; WATI Business Verification docs by country (SEC) https://support.wati.io/en/articles/11463208-meta-business-verification-required-documents-by-country

---

## 2. Facebook Pages (brief)

### 2.1 Capabilities

- Text/link posts: `POST /{page_id}/feed` (`message`, `link`). Photos: `POST /{page_id}/photos` with `url` (URL of an already-hosted photo). Videos: Video API upload. **Reels: `POST /{page_id}/video_reels`** with 3 phases (`upload_phase=start` → upload to `rupload.facebook.com` (local bytes or `file_url`) → `upload_phase=finish` with `video_state=PUBLISHED|SCHEDULED|DRAFT`).
- Reels spec (FP): MP4, **9:16**, 1080x1920 recommended, **min 540x960**, **24-60 fps**, **3-90 s**, 4:2:0, closed GOP 2-5 s, H.264/H.265 (VP9/AV1 also), AAC-LC stereo 48 kHz 128 kbps+. Hosted-file upload rejects robots.txt-restricted hosts (must allow `facebookexternalhit/1.1`) and rejects Meta CDN URLs.
- Photo `url` upload: reference page says photos may not exceed **4 MB** (PNG recommended <1 MB).
- Reels can only be published to Facebook Pages (not personal profiles). Page-audience scope is public only.

### 2.2 Auth & tokens

Facebook Login (for Business). Page access token required, obtained from a user who can perform the needed tasks on the Page (`CREATE_CONTENT`, `MANAGE`, `MODERATE` for posts). Long-lived user token ≈60 days; **Page token derived from a long-lived user token has no expiry** (invalidated only on password change, permission revoke, etc.).

### 2.3 Review/approval and realistic timeline

- Permissions for posts: `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`, `pages_manage_engagement`, `pages_read_user_engagement`; `publish_video` for video; Reels: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`.
- "All Page-related Permissions and Features require approval through the App Review process before your app can use them when your app goes live" (FP). They are also on the Tech Provider access-verification list (`pages_manage_posts`, `pages_read_engagement`, `pages_show_list`, `publish_video`). Same chain and timeline as Instagram (section 1.3): **~4-8 weeks**; one combined submission can request Instagram and Page permissions if they live in the same app (see gotcha below).

### 2.4 Before approval

Same as Instagram: Development mode, role users/testers only.

### 2.5 Limits

- **Reels: 30 API-published Reels per Page per 24 h** (FP, Reels guide: "limited to 30 API-published posts within a 24-hour moving period", enforced on `video_reels`). Collaborator invitations: 10 per Page per 24 h.
- Feed posts and photos: no numeric daily cap in the docs fetched (**UNCONFIRMED**).

### 2.6 Cost

Free (no fees documented; UNCONFIRMED as explicit statement).

### 2.7 Native scheduling: **YES**

- Feed posts: `published=false` + `scheduled_publish_time` (UNIX seconds, ISO 8601 or `strtotime`-parsable). "The publish date must be between **10 minutes and 30 days** from the time of the API request." (FP, Pages API Posts guide.)
- Photos: `POST /{page-id}/photos` supports `published=false` and `scheduled_publish_time` ("Applies to Pages only") (FP, Photo reference; no page date visible).
- Reels: `video_state=SCHEDULED` + `scheduled_publish_time` "greater than 10 minutes from the current time and within **29 days**" (FP, Reels guide; note 29 vs 30 days difference between pages).
- Status via `GET /{video_id}?fields=status` → `publishing_phase.publish_status` = `scheduled`, with `publish_time`.

### 2.8 AI-content disclosure

No API field found in the Pages docs fetched (**UNCONFIRMED**). Meta's general policy (labelling photoreal AI video/audio) applies across Facebook and Instagram (FP newsroom 2024-02-06), but a Pages-API parameter equivalent to `is_ai_generated` was not found.

### 2.9 Gotchas

- Facebook Login (Pages) and Instagram Login are separate login types; Meta states an app "can either use Facebook Login or Instagram Login but not both" for Instagram permissions. Whether one Meta app can hold Instagram Login **and** Facebook Login for Pages is **UNCONFIRMED**; budget for possibly two Meta apps, each through App Review.
- A Page can only update posts made by the same app.
- New Pages Experience restricts some endpoints (see Pages changelog; latest entry 2026-01-30).
- PPA (Page Publishing Authorization) may block publishing for some Pages.

### 2.10 Sources (date seen 2026-10-06)

- Pages API Posts (FP, no page date): https://developers.facebook.com/documentation/pages-api/posts
- Reels Publishing API (FP, API v25.0 examples, no page date): https://developers.facebook.com/documentation/video-api/guides/reels-publishing
- Photo reference (FP): https://developers.facebook.com/docs/graph-api/reference/page/photos/
- Pages API overview and changelog (FP; changelog latest 2026-01-30): https://developers.facebook.com/documentation/pages-api/overview , https://developers.facebook.com/documentation/pages-api/changelog
- Long-lived tokens (FP): https://developers.facebook.com/documentation/facebook-login/guides/access-tokens/get-long-lived
- Access verification permission list (FP): https://developers.facebook.com/documentation/development/release/access-verification

---

## 3. TikTok

### 3.1 Capabilities

Two modes of the Content Posting API (FP, https://developers.tiktok.com/doc/content-posting-api-get-started and .../content-posting-api-get-started-upload-content):

| | **Direct Post** | **Upload (inbox/draft)** |
|---|---|---|
| Scope | `video.publish` | `video.upload` |
| Video init | `POST /v2/post/publish/video/init/` | `POST /v2/post/publish/inbox/video/init/` |
| Photo init | `POST /v2/post/publish/content/init/` (`post_mode=DIRECT_POST`, `media_type=PHOTO`) | same endpoint with `post_mode=MEDIA_UPLOAD` |
| Result | Posted to the creator's profile | Lands in creator's inbox; creator "must click on inbox notifications to continue the editing flow in TikTok and complete the post" |
| Pre-flight | **Must call `POST /v2/post/publish/creator_info/query/` first** | not required for upload |
| Audit restrictions | All unaudited content forced private (below) | Official upload page is silent on unaudited restrictions (**UNCONFIRMED**); SEC sources say inbox mode needs no audit, but app/scope review still applies |

Status polling: `POST /v2/post/publish/status/fetch/` → `PROCESSING_UPLOAD`, `PROCESSING_DOWNLOAD`, `SEND_TO_USER_INBOX`, `PUBLISH_COMPLETE`, `FAILED` (+ `fail_reason`); `publicaly_available_post_id` is only returned once public and moderated. Rate limit for status: 30 req/min per token. Webhooks also available.

`creator_info` returns: `creator_nickname`, `creator_username`, `creator_avatar_url` (TTL 2 h), `privacy_level_options` (public accounts: `PUBLIC_TO_EVERYONE`, `MUTUAL_FOLLOW_FRIENDS`, `SELF_ONLY`; private accounts: `FOLLOWER_OF_CREATOR`, `MUTUAL_FOLLOW_FRIENDS`, `SELF_ONLY`), `comment_disabled`, `duet_disabled`, `stitch_disabled`, **`max_video_post_duration_sec`**. Rate limit 20 req/min per token.

Direct Post `post_info` (video): `title` (≤2200 UTF-16 runes, hashtags/mentions allowed), `privacy_level`, `disable_duet`, `disable_comment`, `disable_stitch`, `video_cover_timestamp_ms`, `brand_content_toggle`, `brand_organic_toggle`, **`is_aigc`**. Photo posts: up to **35 images**, source **`PULL_FROM_URL` only**, `photo_cover_index`, `title` ≤90 runes, `description` ≤4000 runes, `auto_add_music`, `disable_comment` (photos only support comments), `is_aigc`.

Media transfer (FP, https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide, last updated 2026-08-04):
- `FILE_UPLOAD`: chunked, sequential `PUT` with `Content-Range`; chunk **5-64 MB** (final chunk up to 128 MB; videos <5 MB = single chunk); ≤1000 chunks; responses 206 for partial, 201 for last; upload URL valid **1 hour**.
- `PULL_FROM_URL`: URL must be on a **verified domain or URL prefix** (DNS verification of a domain/subdomain, or URL-prefix verification `https://host/path/`); host must be a domain (no IPs); HTTPS; **"Redirections are not followed. URLs that return HTTP 3xx are considered invalid"**; must be downloadable within a 1-hour window. Photos also require PULL_FROM_URL.
- Video: MP4 (recommended), WebM, MOV; H.264 (recommended), H.265, VP8, VP9; **23-60 fps**; resolution **360-4096 px** per side; ≤4 GB; max 10 minutes via API (actual cap per creator is `max_video_post_duration_sec`). Photos: WebP or JPEG, ≤20 MB each. (An "up to 1080p" photo resolution remark came from a summariser; treat as **UNCONFIRMED**.)
LabIA's 9:16, 5-30 s clips fit all specs.

### 3.2 Auth & tokens

OAuth via Login Kit; scopes needed: `user.info.basic` (identity, open_id) + `video.publish` and/or `video.upload`. (FP token page last updated 2026-08-04, https://developers.tiktok.com/doc/oauth-user-access-token-management):
- **Access token valid 24 h** (86400 s). **Refresh token 365 days** (31536000 s). On refresh "the returned `refresh_token` may be different... You must use the newly-returned token if the value is different" (store the rotation). Revoke: `POST https://open.tiktokapis.com/v2/oauth/revoke/`.

### 3.3 Review/approval and realistic timeline

Three gates (FP):
1. **App review** of the app and its products/scopes (Login Kit, Content Posting API, scopes `video.publish`/`video.upload`): ≥1 demo video of the complete end-to-end flow (max 5 videos, 50 MB each), sandbox required for first-time approvals, official website with Privacy Policy and Terms visible without menu navigation, redirect URI for web apps; "Only request permissions and features that your app needs"; apps still in development/testing, adult, or "intended for private/personal use only" are not approved (FP, https://developers.tiktok.com/doc/app-review-guidelines, 2026-08-04). **No review timeline is stated by TikTok.**
2. **URL ownership verification** (only if using PULL_FROM_URL; per-app, per domain/prefix).
3. **Content Posting audit** to lift the private-only restriction (application at https://developers.tiktok.com/application/content-posting-api, which returned 401 without login so the form fields are **UNCONFIRMED**). The audit form collects usage estimates that set a 24-hour **active creator cap** per client. TikTok's guidelines say an audit is required to verify ToS compliance but publish no duration.
Timeline evidence (all SEC, **UNCONFIRMED**): product access "days"; audit "weeks, and variable" (bundle.social 2026-08-04); "2-6 weeks" (rapidevelopers/others); an Indie Hackers founder reports getting approved on 2026-08-26 (no duration given) and then hitting `url_ownership_unverified` in production because S3 URLs were not on a verified domain. Demo video must show login, consent screen, composer built from `creator_info`, and the post appearing (SEC). Common rejections: scope overreach, creator settings not respected in UI, no confirmation before publishing, unreachable policy pages.
**Realistic total for LabIA: ~3-8 weeks, with the audit the unpredictable part.** Build the compliant composer UX before submitting.

### 3.4 What works BEFORE approval

- **Sandbox**: up to **5 sandboxes per app, 10 target accounts**; Login Kit works; "Sandbox mode does not offer access to Content Posting API for public videos or Data Portability API" (FP, https://developers.tiktok.com/doc/add-a-sandbox, 2026-08-04). Whether private posting works in sandbox is not stated (**UNCONFIRMED**).
- **After app approval but before audit** (unaudited client, FP content-sharing guidelines + Direct Post reference, 2026-08-04/08-24): "All content posted by unaudited clients will be restricted to private viewing mode"; "Unaudited API Clients can allow up to **5 users** to post in a 24 hour window. All user accounts using the API client to post **must be set to private at the time of posting**"; "can only post contents in `SELF_ONLY` viewership". Error: `unaudited_client_can_only_post_to_private_accounts`. Posts made while unaudited stay private (SEC).
- So a customer can try the flow, but nothing is public until the audit passes.

### 3.5 Limits

- Per-user-token rate limits: Direct Post init 6 req/min; creator_info 20 req/min; status fetch 30 req/min (FP).
- **Daily post cap per creator account: "typically around 15 posts per day / creator account"** and may vary (FP content-sharing guidelines). Error `spam_risk_too_many_posts`. SEC sources claim 20-25/day: do not rely on them.
- **Active creator cap per API client per 24 h**, set from the audit usage estimates; error `reached_active_user_cap`.
- Upload (inbox) mode: "at most **5 pending shares within any 24-hour period**" (FP, upload-video reference, 2026-08-04); error `spam_risk_too_many_pending_share`.
- Titles ≤2200 runes (video), photos ≤35 images, duration per `max_video_post_duration_sec`.

### 3.6 Cost

No fees documented (UNCONFIRMED as an explicit statement).

### 3.7 Native scheduling

**No.** No schedule parameter in the Direct Post reference (confirmed absence in the fetched page). LabIA must hold the job and call Direct Post at the chosen time. Each Direct Post must still satisfy the UX rules: the app must fetch fresh `creator_info` and "stop publishing if the creator cannot post more content"; "explicit user consent before upload" is required (FP guidelines). Whether a consent captured at scheduling time satisfies the per-post rule for a deferred background publish is **UNCONFIRMED**; ask in the audit application or test it. Third-party schedulers do operate on this API (inference).

### 3.8 AI-content disclosure

- **API field exists: `is_aigc`** (Direct Post video and photo). FP: "Set to true if the video is AI generated content. If set, the video will be labelled with Creator labeled as AI-generated tag in video's description."
- Policy: TikTok requires labelling of realistic AI-generated content (SEC: cinerads.com 2026-07-21 and press); labelled via the in-app toggle or auto-labelled from C2PA metadata; repeated non-disclosure leads to forced labels, removal, account restrictions (SEC). The TikTok Community Guidelines and support pages would not render for me, so the **first-party policy wording is UNCONFIRMED**. The Direct Post UX guidelines themselves do not make `is_aigc` mandatory. For AI influencers, send `is_aigc=true` by default (user can override).

### 3.9 Gotchas

- **Direct Post UX rules are mandatory** (FP content-sharing guidelines, 2026-08-04): show creator nickname; privacy dropdown with **no default** (must match `privacy_level_options`); Comment/Duet/Stitch checkboxes **unchecked by default** and greyed out if the creator disabled them; commercial-content toggle **off by default**, "Your Brand" (Promotional content) / "Branded Content" (Paid partnership) options, branded content cannot be `SELF_ONLY`; declarations "By posting, you agree to TikTok's Music Usage Confirmation" (+ Branded Content Policy when applicable); content preview; explicit consent before upload; user-editable title/hashtags (no forced prefill); tell the user processing can take minutes; poll status or use webhooks.
- **No watermarks, logos, promotional text or links** added to content (FP). Unacceptable uses: apps that copy arbitrary content from other platforms; utility tools limited to internal use or private teams. LabIA (multi-tenant, original AI-generated content created in-app) should fit, but present it explicitly in the demo video.
- **PULL_FROM_URL cannot use fal.ai CDN or Vercel Blob domains** (you cannot DNS-verify a domain you do not own; redirects are not followed). Options: (a) serve media from a LabIA-owned domain/subdomain that streams bytes without redirecting (e.g. `media.<labia-domain>`), verified per app; (b) use `FILE_UPLOAD` and push chunks from the server (works from a Vercel function for 5-30 s clips; photos have no FILE_UPLOAD path). Photo posts require (a).
- Verification is per app, and per domain/prefix: verify every host you will actually serve from (SEC, bundle.social).
- Regional availability of the Content Posting API for Brazilian creators: not stated in docs I could fetch (**UNCONFIRMED**); verify in sandbox with a BR account.

### 3.10 Sources (TikTok pages show "Last Updated" in-page; seen 2026-10-06)

- Get started (Direct Post; last updated 2026-08-04): https://developers.tiktok.com/doc/content-posting-api-get-started
- Get started, Upload (2026-08-04): https://developers.tiktok.com/doc/content-posting-api-get-started-upload-content
- Content Sharing Guidelines / UX requirements / caps (2026-08-04): https://developers.tiktok.com/doc/content-sharing-guidelines
- Direct Post reference (2026-08-24): https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
- Query Creator Info (2026-08-04): https://developers.tiktok.com/doc/content-posting-api-reference-query-creator-info
- Photo Post reference (2026-08-24): https://developers.tiktok.com/doc/content-posting-api-reference-photo-post
- Upload Video reference (2026-08-04): https://developers.tiktok.com/doc/content-posting-api-reference-upload-video
- Get Video Status (2026-08-04): https://developers.tiktok.com/doc/content-posting-api-reference-get-video-status
- Media Transfer Guide (2026-08-04): https://developers.tiktok.com/doc/content-posting-api-media-transfer-guide
- User access token management (2026-08-04): https://developers.tiktok.com/doc/oauth-user-access-token-management
- App Review Guidelines (2026-08-04): https://developers.tiktok.com/doc/app-review-guidelines
- Sandbox (2026-08-04): https://developers.tiktok.com/doc/add-a-sandbox
- SEC: bundle.social TikTok approval (2026-08-04) https://bundle.social/blog/tiktok-api-approval ; Indie Hackers post (2026-08-26) https://www.indiehackers.com/post/we-got-approved-for-tiktok-s-direct-content-posting-api-here-s-what-we-learned-xJwmsd75Yq5uRQ95wdw2 ; cinerads AIGC policy (2026-07-21) https://www.cinerads.com/blog/tiktok-ai-content-policy

---

## 4. YouTube Shorts (YouTube Data API v3)

### 4.1 Capabilities

- `videos.insert` (multipart/resumable upload, `POST https://www.googleapis.com/upload/youtube/v3/videos`). **Bytes must be uploaded to Google; there is no "fetch from URL"**: LabIA's server must stream the MP4 from fal.ai/Blob to YouTube via resumable upload. Max file 256 GB; MIME `video/*` or `application/octet-stream`.
- **What makes a Short**: no API flag. Per YouTube Help, "any videos uploaded on or after [2024-10-15] with a **square or vertical aspect ratio up to three minutes** in length will be categorized as Shorts" (FP). LabIA's 9:16 clips (<3 min) qualify automatically; `#Shorts` is optional. YouTube may still classify at its discretion.
- Metadata settable on insert: `snippet.title`, `description`, `tags`, `categoryId`, `defaultLanguage`; `status.privacyStatus`, `status.publishAt`, `status.selfDeclaredMadeForKids`, `status.containsSyntheticMedia`, `status.embeddable`, `status.license`, `status.publicStatsViewable`; `localizations`. `notifySubscribers` (default true). New in 2026: `brandPartner` part (2026-07-07).
- **Images/carousels: not supported.** The Data API v3 has no Community-post/image-post resource in the docs fetched (**UNCONFIRMED** as an explicit statement).
- Thumbnails: `thumbnails.set` (max thumbnail upload size raised from 2 MB to 50 MB on 2026-09-14).

### 4.2 Auth & tokens

- OAuth 2.0 Google. Scope: **`https://www.googleapis.com/auth/youtube.upload`** (Manage your YouTube videos). `videos.insert` also accepts `youtube`, `youtube.force-ssl`, `youtubepartner`. Use the narrowest (`youtube.upload`).
- YouTube scopes are **sensitive** (SEC says "all YouTube scopes are sensitive"; Google's own scope page I fetched did not print the classification column: first-party confirmation UNCONFIRMED; Google's verification doc names "deleting a YouTube video" as a sensitive-scope example). Sensitive scopes require OAuth app verification.
- Refresh tokens (FP, https://developers.google.com/identity/protocols/oauth2, updated 2026-05-26): do not expire on a timer, but are invalidated if **unused for six months**, revoked by the user, or beyond **100 refresh tokens per Google account per OAuth client** (oldest dropped silently). **While the consent screen is in "Testing" status, refresh tokens expire after 7 days.** Access token lifetime is returned in `expires_in` (typically ~1 h; exact value not seen on the fetched page).

### 4.3 Review/approval and realistic timeline

Two **separate** gates:
1. **Google OAuth app verification** (sensitive scope): brand verification (usually "a few minutes"), verified domain ownership via Search Console, privacy policy on the same domain, scope justification and a **demo video** of the OAuth grant and usage; "sensitive scope verification process typically takes **3-5 business days**" (FP, https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification, updated 2026-08-19). Another Google help page warns verification "might require several months" depending on data sensitivity (https://support.google.com/cloud/answer/7454865). Unverified apps show a warning screen and are capped at **100 new users** until verified (FP).
2. **YouTube API Services compliance audit** to lift the upload lock: "All videos uploaded via the `videos.insert` endpoint from unverified API projects created after 28 July 2020 will be restricted to private viewing mode. To lift this restriction, each API project must undergo an audit to verify compliance with the Terms of Service." (FP, `videos.insert` page, updated 2026-09-14.) Submitted through the **"YouTube API Services - Audit and Quota Extension Form"**; "A YouTube API Services team member will contact you" (FP, https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits, updated 2026-09-14). **No official timeline.** SEC (Phyllo, 2026-06-25): "several weeks to several months", approval not guaranteed, granted quota may be below what was requested.
**Realistic total for LabIA: ~2-8+ weeks, least predictable of the four** (OAuth verification ~1 week + audit weeks-to-months).

### 4.4 What works BEFORE approval

- OAuth consent screen in **Testing**: up to **100 test users**, authorisations (and refresh tokens) **expire after 7 days** (FP, https://support.google.com/cloud/answer/15549945).
- In production but unverified: 100-new-user cap with the unverified-app warning.
- Uploads from an **unaudited** API project (created after 2020-07-28) are forced **private**; you can still test the upload and scheduling mechanics, but nothing becomes public.

### 4.5 Limits

- **videos.insert: own quota bucket "Video Uploads", default 100 calls/day per project, each call costs 1 unit** (FP, quota calculator, last updated **2026-09-15**; `videos.insert` page 2026-09-14). The other endpoints share the remaining 10,000 units/day bucket; `search.list` also has its own 100/day bucket. Daily quota resets at **midnight Pacific Time**.
- Change history (FP revision history, https://developers.google.com/youtube/v3/revision_history, updated 2026-09-30): **2025-12-04** upload cost reduced "from approximately 1600 units to approximately 100 units" (≈100 uploads/day in the 10,000-unit pool, was ≈6); **2026-06-01** granular quota system: `videos.insert` and `search.list` moved to their own buckets. So the answer to "1600 units vs 10,000/day" is **obsolete**: the current default is **100 uploads/day per Cloud project, shared by all LabIA tenants**. Per-tenant effect: 100 uploads/day total across the platform until a quota extension is approved.
- Additional quota: audit first, then Audit and Quota Extension Form; "you cannot pay Google to buy more quota" (SEC). Re-submit the same form for later extensions within 12 months of an audit (FP).
- Shorts: ≤3 min, square/vertical, max 1080p for Shorts uploads (FP help page, "maximum resolution of 1080p").

### 4.6 Cost

Free. No per-call charge; the cost is the quota ceiling and the audit effort. (Google's docs describe quota only; no price list. "Free" is UNCONFIRMED as an explicit statement.)

### 4.7 Native scheduling: **YES**

`status.publishAt` (ISO 8601). "It can be set only if the privacy status of the video is **private**" and the video must never have been published; when used on `videos.update` you must also send `privacyStatus=private`; a past time publishes immediately (FP, `videos` resource page). Note: for an unaudited project, a scheduled video will still not become public.

### 4.8 AI-content disclosure

- **API field exists**: `status.containsSyntheticMedia` (boolean) on `videos.insert`/`videos.update`, added **2024-10-30** (FP revision history). Meaning: video contains realistic altered or synthetic (A/S) content: makes a real person appear to say/do something they didn't, alters footage of a real event/place, or generates a realistic scene that did not occur.
- Policy (FP YouTube Help GenAI disclosure): creators must disclose realistic synthetic content; non-realistic content (clearly fantastical/animated) and minor edits need not be; "Creators who consistently choose not to disclose... may be subject to manual application of a label, or penalties from YouTube, including removal of content or suspension from the YouTube Partner Program." (https://support.google.com/youtube/answer/14328491). For AI-influencer videos with photoreal people, default `containsSyntheticMedia=true`.

### 4.9 Gotchas

- 100 uploads/day is **per Cloud project**, not per tenant or per channel; the same project also serves all tenants' quota for other calls. Reserve headroom; surface "daily limit reached, resets at midnight PT" in the UI.
- Quota counts failed uploads too ("every API request, including invalid ones, incurs a minimum cost"), and resumable-upload retries must be designed so they do not create duplicate videos.
- The resumable upload has to run server-side with the user's token; Vercel function duration/size limits apply (verify against Vercel limits; not researched here).
- A video classified as a Short is decided by YouTube from aspect ratio and length; there is no API toggle.
- Account must have a YouTube channel; the user picks which channel during Google consent (brand accounts add steps).
- Testing-mode consent screen silently kills refresh tokens after 7 days: do not demo with it for longer than a week.

### 4.10 Sources (date seen 2026-10-06; in-page "last updated" shown)

- Quota calculator (2026-09-15): https://developers.google.com/youtube/v3/determine_quota_cost
- `videos.insert` (2026-09-14): https://developers.google.com/youtube/v3/docs/videos/insert
- `videos` resource, `publishAt`, `containsSyntheticMedia`: https://developers.google.com/youtube/v3/docs/videos
- Revision history (2026-09-30): https://developers.google.com/youtube/v3/revision_history
- Quota and compliance audits (2026-09-14): https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits
- Upload guide (2026-09-14): https://developers.google.com/youtube/v3/guides/uploading_a_video
- OAuth 2.0 (token expiry, 2026-05-26): https://developers.google.com/identity/protocols/oauth2
- Sensitive scope verification (2026-08-19): https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification
- Unverified apps / 100-user cap: https://support.google.com/cloud/answer/7454865
- Testing publishing status / 100 test users / 7-day expiry: https://support.google.com/cloud/answer/15549945
- Scopes list (2026-09-14): https://developers.google.com/identity/protocols/oauth2/scopes
- Shorts: three-minute rule: https://support.google.com/youtube/answer/15424877 ; Shorts upload help: https://support.google.com/youtube/answer/10059070
- Altered/synthetic disclosure policy: https://support.google.com/youtube/answer/14328491
- YouTube API Services terms revision history (no AI/upload changes 2025-2026): https://developers.google.com/youtube/terms/revision-history
- SEC: Phyllo "Is the YouTube API free in 2026" (2026-06-25) https://www.getphyllo.com/post/is-the-youtube-api-free-in-2026-quota-limits-costs-when-to-pay

---

## 5. Cross-cutting implications for LabIA (inferred from the above)

- **Media hosting**: Instagram and Facebook fetch from a public HTTPS URL (private Vercel Blob will not work; use short-lived public signed URLs valid for the whole processing window). TikTok `PULL_FROM_URL` needs a verified domain you own and no redirects; otherwise use `FILE_UPLOAD`. YouTube needs a server-side resumable upload (no URL ingestion). Standardise one pipeline: normalise to MP4 H.264 + AAC, 9:16, 1080x1920, 30 fps, closed GOP, moov first, with a silent AAC track if silent-video acceptance cannot be confirmed; images to JPEG.
- **Scheduler**: only Facebook (Pages) and YouTube schedule natively. Instagram and TikTok need a LabIA-owned scheduler (DB-backed queue + cron/worker) that creates containers/inits uploads shortly before the slot and respects per-platform daily limits (IG ≈50, FB Reels 30, TikTok ≈15/creator, YouTube 100/project).
- **AI disclosure**: all four expose a field (`is_ai_generated`, `is_aigc`, `containsSyntheticMedia`; Facebook Pages API field UNCONFIRMED). Default it on for photoreal AI personas and show the user the label state before publishing.
- **Token ops**: IG long-lived token refresh at least every ~50 days; TikTok access token every <24 h with refresh-token rotation; Google refresh tokens unused 6 months die; keep a per-account "needs reconnect" state.
- **Compliance surface needed by all**: privacy policy, terms, data-deletion endpoint and user-facing delete/disconnect flow, public company website, demo videos, test accounts for reviewers. Product copy for reviews should be prepared in English (reviewers), UI itself can stay PT-BR with captions.

---

## 6. Comparison table

| | Instagram (Instagram Login) | Facebook Pages | TikTok (Content Posting) | YouTube Shorts (Data API) |
|---|---|---|---|---|
| Formats | Reels, image (JPEG), carousel (≤10), Stories | Feed post, photo, video, Reels | Video, photo post (≤35 images) | Video only |
| Account needed | IG Business/Creator (no Page) | Page (user with tasks) | TikTok account (creator) | YouTube channel |
| Scopes | `instagram_business_basic`, `instagram_business_content_publish` | `pages_manage_posts`, `pages_read_engagement`, `pages_show_list` (+`publish_video`) | `user.info.basic`, `video.publish` / `video.upload` | `youtube.upload` |
| Media ingestion | Public URL (or rupload) | `url` / `file_url` / upload | `PULL_FROM_URL` (verified domain) or chunked `FILE_UPLOAD` | Resumable upload only |
| Video spec (our clips) | MP4/H.264/AAC, 3 s-15 min, ≤300 MB, 23-60 fps | Reels 3-90 s, ≥540x960, 24-60 fps | 23-60 fps, 360-4096 px, ≤4 GB | any, Short = ≤3 min square/vertical |
| Daily limit | 50 (docs also say 100; read API) ; 400 containers | Reels 30/Page; others UNCONFIRMED | ≈15/creator; active-creator cap; 5 pending (inbox) | **100 uploads/day/project** |
| Native scheduling | **No** (app timer; container TTL 24 h) | **Yes** (10 min-30 days) | **No** | **Yes** (`publishAt`, private) |
| AI flag | `is_ai_generated` (since 2026-06-22) | UNCONFIRMED | `is_aigc` | `status.containsSyntheticMedia` |
| Access token | 1 h short → 60 d long, refresh ≥24 h old | Page token non-expiring (from long-lived user token) | 24 h; refresh 365 d (rotating) | ~1 h; refresh until revoked/6 months unused (7 days in Testing) |
| Review gate | Business Verification + Tech Provider + App Review | same | App review + (URL verify) + Content Posting audit | OAuth verification + API compliance audit |
| Before approval | Dev mode: role users/testers only (≈50 testers) | same | Sandbox 10 users; unaudited: private only, 5 users/24 h, account private | Testing: 100 users, 7-day tokens; unaudited uploads private only |
| Realistic time to public multi-tenant | ~4-8 weeks | ~4-8 weeks (same review) | ~3-8+ weeks (audit unpredictable) | ~2-8+ weeks (audit unpredictable) |
| Cost | Free | Free | Free | Free (quota-limited) |

---

## 7. What blocks a multi-tenant launch, and how long

**Instagram (and Facebook Pages)**
- Blockers: (1) legal entity with CNPJ documents for Business Verification; (2) Tech Provider access verification (~5 days, FP); (3) App Review for `instagram_business_basic` + `instagram_business_content_publish` (+ Page permissions): screencast, reviewer-accessible test environment, privacy policy, ToS, data deletion URL; (4) an Instagram-specific scheduler and token-refresh job.
- Time: **~4-8 weeks** to Advanced Access (3 weeks best case; 2026 reviews run 9-20 days and first submissions often fail). Until then only role users/testers (≈50 Instagram test accounts) can connect.
- Parallelisable: start Business Verification immediately; build the screencast while the verification runs.

**TikTok**
- Blockers: (1) app review with demo video of a compliant Direct Post composer (no default privacy, consent, commercial-content toggles, creator_info-driven UI); (2) **Content Posting audit**: until passed, all posts are private, max 5 users/24 h, and creators' accounts must be private; (3) media domain you own, verified in the portal (or switch to FILE_UPLOAD); (4) official website with visible privacy policy and ToS.
- Time: **~3-8+ weeks**; TikTok publishes no SLA; the audit is the unknown. Do not onboard customers before the audit lands (posts made before it stay private).
- Possible interim (UNCONFIRMED): inbox "Upload" mode (`video.upload`) lets the creator finish and publish inside TikTok; verify with TikTok whether unaudited clients may use it publicly.

**YouTube**
- Blockers: (1) Google OAuth verification for the sensitive `youtube.upload` scope (3-5 business days typical, FP) incl. domain verification, demo video, privacy policy; (2) **API compliance audit** to lift forced-private uploads (no stated timeline; SEC: weeks to months); (3) quota: default **100 uploads/day for the whole platform** until a quota extension is approved; (4) server-side resumable upload plumbing.
- Time: **~2-8+ weeks**, highest variance; the quota ceiling will bind quickly (e.g. 50 active tenants × 2 uploads/day).
- Interim: until the audit passes, uploads can be created as private/scheduled for the owner's own channel only (useful for demos, not for customers).

**Suggested order**: start Meta Business Verification + Tech Provider verification and Google OAuth verification and the TikTok app registration the same week (all are paperwork); ship Facebook Pages + Instagram first (best native fit, shared review), then YouTube, then TikTok (heaviest UX and audit requirements).

---

## 8. Items I could not confirm (UNCONFIRMED list)

1. Instagram daily publishing limit: docs say both 100 and 50 (SEC and the API reference indicate 50). Read `config.quota_total` at runtime.
2. Resumable upload (`rupload`) availability on Instagram Login (guide says Facebook Login only; reference silent).
3. Whether silent (no-audio) MP4 is accepted by Instagram Reels (not stated; test it).
4. Behaviour of expiring signed URLs during Instagram/Facebook fetch (not documented).
5. Meta Business Verification duration and Brazil document list from a first-party page (help page would not render; SEC only).
6. Facebook Pages API field for AI disclosure; per-day limits for Page feed posts/photos.
7. Whether one Meta app can combine Instagram Login and Facebook Login (Pages).
8. TikTok: audit duration and form fields (form requires login); whether unaudited clients can use inbox Upload publicly; whether sandbox allows private posting; Brazil regional availability; whether a consent captured at schedule time satisfies the per-post consent rule for deferred posts; first-party AIGC policy wording (support pages did not render); photo max resolution.
9. YouTube: official audit/quota-extension turnaround; first-party sensitivity classification of `youtube.upload` on Google's scope page; exact access-token lifetime from the fetched page; explicit absence of an image/community-post API.
10. "Free" is never stated explicitly as a policy by any of the four; absence of fees is inferred from the absence of pricing in the docs.
