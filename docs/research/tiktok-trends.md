# TikTok trends and trending songs inside LabIA (research, task F8)

Date: 2026-10-08. Research only, no code. Goal (Felipe): see the trends and the hottest songs of the moment directly in LabIA, next to `/trends`, and recreate one with an influencer.

Everything below was read on the pages linked at the end on 2026-10-08. Prices are the actor owners' public prices and can change. Nothing here was run, so "works for Brazil" and "returns video files" are still to be confirmed with one free test run each.

## What exists

| Source | What it gives | Official? | Fits LabIA? |
| --- | --- | --- | --- |
| TikTok Research API | Account and video metadata for studies | Yes | No. Only non-profit academics in the US, EEA, UK or Switzerland, about 4 weeks to approve, 1,000 requests per day, commercial use is excluded. It is also not a trending feed. |
| TikTok Creative Center (web) | Trending hashtags, songs, creators and videos by country, plus Top Ads | Yes, but a website, not an API | Right data, no API. Basic pages are public, more needs sign-in. |
| Creative Center scraper on Apify (`datapeak/tiktok-creative-center`) | Trending hashtags, trending songs (title, artist, duration, rank) and Top Ads, filtered by country and by 7 / 30 / 180 days | No (third party) | Best fit for hashtags and songs. About US$ 0.001 per hashtag or song record, US$ 1.50 per 1,000 ads. Uses direct calls, not a browser. |
| Explore-feed scraper on Apify (`mu0i/tiktok-trending`) | Videos from the Explore feed: link, description, play/like/comment/share counts, duration, cover, link to a video without watermark, song, creator, hashtags | No (third party) | Best fit for trending videos. US$ 3.00 per 1,000 videos (less on paid plans). Caveat: the feed is the US viewer's feed only. |
| Another Apify "Trending Songs" actor (`lexis-solutions`) | Songs | No | Marked deprecated and failing while Creative Center returns a deprecated response. A reminder that any scraper can break overnight. |

Risk to state plainly: every route that works today is a scraper of a TikTok website. It can stop at any time, and scraping is very likely against TikTok's terms of use (not checked clause by clause). This is fine for validating the idea, but it is not a base to promise to paying users.

## Proposal

Two lists on the Trends screen, fed by one small background job:

1. **Trending now**: hashtags and videos (cover, plays, likes, duration, song, "Recreate this").
2. **Trending songs**: title, artist, rank, how long it has been rising.

"Recreate this" downloads the video once into our private storage (the signed links from the scrapers expire in about 24 to 48 hours), then opens the existing Trends form with that video already chosen as the movement reference. The 4 MB and 4 to 30 s limits of the importer still apply, so some videos need to be skipped or trimmed.

## Cron or agent

Use a **scheduled job (cron)**, not an agent. The work is fixed: call two actors, save the result. An agent adds cost and unpredictability for no gain.

- Vercel Cron calls a protected route once or twice per day; the route starts the Apify actors and saves the rows into a new table (`trend_snapshots`: kind `hashtag` / `song` / `video`, country, rank, payload, collected_at). Old snapshots are deleted after about 30 days.
- The screen only reads that table, so it is fast, free per visit and does not break when a scraper is down (it shows the last good snapshot and its date).
- An agent would only be worth it later, to write a short "why this is trending and how to recreate it" summary for each video.

## Cost estimate

- Songs and hashtags: 50 records per day at about US$ 0.001 is about US$ 0.05 per day, under US$ 2 per month.
- Videos: 100 per day at US$ 3.00 per 1,000 is about US$ 0.30 per day, about US$ 9 per month.
- Storage: only the videos someone chose to recreate are downloaded. If every one of 100 daily videos were saved at 4 MB, that is 400 MB per day, about 12 GB per month, so do not save them all, only on demand. Check the current Vercel Blob price before turning it on.

So the whole feature is on the order of US$ 10 to 15 per month while there are few users, with no per-user cost.

## Songs: what you can and cannot do

- Showing the list of trending songs is fine and useful as inspiration.
- **Using** a trending commercial song in a video we generate and the user posts is a licensing problem. Sounds from the general library are not cleared for business use, and TikTok's Commercial Music Library (over 1 million pre-cleared tracks, free for any business account) covers TikTok only, not Instagram or YouTube.
- Suggestion: the song list shows what is trending, and next to each song LabIA offers a similar royalty-free option. The video model does not need the song anyway; the user adds it in the app where they post. This belongs on the legal review task already on the board.

## Same legal point for videos

Recreating a trend means taking the movement from someone else's video. The app already says the catalog does not ship third-party videos and that the user brings their own. A "Recreate this" button that downloads another person's video changes that stance. Decide with Diego before building: either keep the list as inspiration only (link out to TikTok, user imports their own copy), or accept the download.

## Questions for the founders

1. Is inspiration only (list plus link out) enough for the first version, or must "Recreate this" download the video?
2. Which country: Brazil first? (Creative Center takes a country code; the Explore feed is US only. To be confirmed with one free run.)
3. Is a scraper acceptable as the source, knowing it can break and probably breaks TikTok's terms?

## Next steps if approved

1. One free Apify run of each actor, Brazil and US, to confirm fields, country support and that the video link downloads.
2. Table `trend_snapshots` and the protected cron route.
3. "Trending now" and "Trending songs" blocks on `/trends`, with the last-updated date.
4. "Recreate this": download to private storage, open the form with the video selected.

## Sources

- [TikTok Creative Center overview (Pallyy)](https://pallyy.com/blog/tiktok-creative-center)
- [Creative Center Scraper on Apify](https://apify.com/datapeak/tiktok-creative-center)
- [TikTok Trending Scraper, Explore feed (Apify)](https://apify.com/mu0i/tiktok-trending/pricing)
- [TikTok Trending Songs Scraper, deprecated (Apify)](https://apify.com/lexis-solutions/tiktok-trending-songs-scraper)
- [TikTok Research API limits and access (Xpoz)](https://www.xpoz.ai/blog/guides/tiktok-research-api-limits-access-and-alternatives/)
- [TikTok Data Coverage in 2026 (Datashake)](https://www.datashake.com/blog/tiktok-data-coverage-in-2026-what-social-intelligence-teams-need-to-know)
- [TikTok Music Library for creators and brands (Soundstripe)](https://www.soundstripe.com/blogs/tiktok-music-library-explained)
