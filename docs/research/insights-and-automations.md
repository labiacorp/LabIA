# Insights, automations and ready-made recipes for LabIA (research)

Date: 2026-10-08. Research only, no code. Question from Felipe: besides TikTok trends and songs, what other insights and automations could LabIA run (maybe on Cloudflare) for us and for our users, and could users start from ready-made models instead of from zero?

Companion to `tiktok-trends.md` (sources for trends and songs). Prices and limits below were read on the vendors' pages on 2026-10-08 and can change; anything not verified is marked.

## 1. The cheapest insight is our own data

LabIA already records, for every generation: the model, the exact prompt, the credit cost, when it started and finished, whether the user approved it, and what was published. A redo currently overwrites the step, so counting redos needs the attempt history that is already a board task. Nothing external is needed to answer:

- **Which model gives the best result per credit?** Share of generations approved on the first try, redo rate, and cost per approved video, per model and per resolution. This directly decides the defaults and the price of the plan.
- **Which prompts work?** With admin prompts now editable, compare the approval rate before and after a change. This is the base for the reverse engineering of Higgsfield-style prompts that Felipe described.
- **What does one finished piece really cost?** Per influencer and per content, including redos. (This is the "cost per piece" screen already on the board.)
- **Failures and refunds:** which model fails or times out most, so we stop offering it.

For users the same data becomes a small "How your account is doing" card: credits spent this month, cost per finished video, which format they approve most.

Effort: low (queries over existing tables, one admin page). Risk: none. This should come first.

## 2. Ready-made recipes (the "modelos prontos")

Today the user starts from a blank prompt box. `/modelos` has five script starters and `/trends` has three structures, but nothing ties a trend to the right model and prompt.

A **recipe** is one saved bundle:

- the idea or trend (for example "parking-lot group scene"),
- the prompt template with its placeholders (from `src/lib/prompts.ts`, editable by the admin),
- the recommended model and resolution, with the price shown,
- an example script or movement reference,
- how many characters and what each one does.

The user picks a recipe, chooses their influencer, and everything else is filled in. It is the practical output of the prompt reverse engineering: every time we learn what works on a model, we update the recipe once and every user gets it.

Where recipes come from: written by us first (admin screen next to Prompts), later drafted from the daily trends list ("this song and this movement are rising, make a recipe").

Effort: medium (a table, an admin editor, a picker on the content and Trends forms). Risk: low. Biggest product value of this document, and it needs no external data.

## 3. External signals

| Signal | Source | Official? | Notes |
| --- | --- | --- | --- |
| Songs most played in Brazil | Apple Music charts feed | Yes, free, no key | Not TikTok-specific. |
| Trending videos by country and category | YouTube Data API `videos.list` with `chart=mostPopular` | Yes, 1 quota unit per call | YouTube, not TikTok. |
| TikTok hashtags, songs, videos | EnsembleData, or Apify actors | No | See `tiktok-trends.md`. EnsembleData starts at US$ 100 per month, with a free tier of 5,000 records per month. |
| Search interest by topic and region | Google Trends API | Yes, but alpha, by application only | Official sources do not mention Brazil or a "trending now" endpoint; unofficial scrapers exist. Worth applying with a concrete use case. |
| Competitor and niche accounts | Apify profile scrapers | No | Followers, posts, posting rhythm. Matches the board tasks "competitor study" and "high-performing products by niche". |
| What sells in a niche | Shopee affiliate catalogues, marketplaces | Varies | Ties to the affiliate and product-research tasks. Not researched here. |

## 4. Automations we could run

For users (shown inside the app, no setup on their side):

- **Daily trend card**: three trends and three songs rising today for their niche, with "make it with my influencer".
- **Weekly report per influencer**: credits spent, pieces finished, best performer, one suggestion.
- **Content ideas per influencer**: a cheap text model drafts five ideas from the niche and the day's trends; the user edits and approves. Costs fractions of a credit.
- **Posting reminders** from the publishing area: best times from their own results, once there are enough posts.

For us (admin):

- Price watch: `npm run prices:check` already reads provider prices; run it weekly and flag changes.
- Alerts when a provider fails more than usual, when a balance is low, or when an uncertain cost sits unresolved.
- A weekly digest of the numbers in section 1 sent to Felipe and Diego.

## 5. What Cloudflare would add (and what it would not)

LabIA runs on Vercel with Neon. Cloudflare is not needed to start, but three pieces are worth knowing:

- **R2 object storage**: US$ 0.015 per GB-month, no charge for egress, 10 GB free per month. Generated video is the heavy item, and egress is what makes video expensive elsewhere. This is the strongest argument, and it connects to the board task "keep generated media forever".
- **Workers with Cron Triggers, Queues and Workflows**: scheduled jobs and queues. The free plan lists 5 cron triggers per account and 100,000 requests per day (one third-party source disagrees on the trigger cap, so confirm in the dashboard). Queues: 10,000 operations per day free. The paid plan is US$ 5 per month. Vercel Cron can do the same daily jobs while we are small; check the limits of our Vercel plan before deciding.
- **Workers AI**: 10,000 neurons per day free, then US$ 0.011 per 1,000 neurons, text and small models. Fit for the cheap "content ideas" and summaries. Per-model rates changed in 2026; check the model used.
- **Browser Rendering**: 10 minutes per day free, then US$ 0.09 per browser hour. Possible for our own scraping, with the same terms-of-use risk as in `tiktok-trends.md`.

Recommendation: do **not** move the app. If media cost becomes real, move only file storage to R2 and keep everything else where it is. Jobs can start on Vercel Cron and move to Cloudflare Workers later without changing the screens, because they only write rows into the database.

## 6. Suggested order

1. Insights from our own data (admin page first, then the user card). Low effort, no risk.
2. Recipes: table, admin editor, picker on content and Trends forms. Medium effort, highest value.
3. Songs (Apple, Brazil) and trending videos (YouTube, Brazil) on `/trends`, with the daily job. Low cost, official sources.
4. Apply for the Google Trends API alpha; run the free EnsembleData test for TikTok.
5. Daily trend card and weekly report for users.
6. R2 for media, only if storage and egress cost show up.

## 7. Questions for the founders

1. Start with recipes and own-data insights (1 and 2), or with the external trends (3)?
2. Are recipes something users can also write and share, or only ours for now?
3. For users, do insights live only inside the app, or also by e-mail and WhatsApp? (E-mail is not connected yet.)
4. Is the Google Trends alpha application worth a founder's name and use-case text?

## Sources

- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing)
- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits)
- [Cloudflare Queues pricing](https://developers.cloudflare.com/queues/pricing/)
- [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Cloudflare Browser Rendering pricing (changelog, 2025)](https://developers.cloudflare.com/changelog/2025-07-28-br-pricing/)
- [Cloudflare plans](https://www.cloudflare.com/plans.md)
- [Google Trends API (alpha)](https://developers.google.com/search/apis/trends)
- [YouTube Data API, videos.list](https://developers.google.com/youtube/v3/docs/videos/list)
- [Apple Marketing Tools RSS feed generator](https://victorwynne.com/apple-rss-generator/)
- [EnsembleData on Apify](https://apify.com/ensembledata/tiktok-api/pricing)
