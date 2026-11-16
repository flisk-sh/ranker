# Flisk Ranker

Products ranked by stars gained on GitHub, each with a live README badge.

- Submit with one GitHub link. Name, description, license and stars are imported.
- Rank = stars gained over today, this week, this month or this year, counted the same way for everyone.
- Every product gets an animated SVG badge: 250x55 (default) or 20 px high (`?size=small`).
- The badge look is one of 625: the body (25, from total stars) times the navy rank (25, from rank position).
- A product is "verified" when its README contains the badge.

## Badge

```md
[![Flisk Ranker](https://ranker.flisk.si/badge/<slug>.svg)](https://ranker.flisk.si/p/<slug>)
```

Options: `?period=daily|weekly|monthly|yearly`, `?size=small`.

## Develop

```bash
bun test
bun scripts/dev.mjs   # http://localhost:8820, sample data, fake GitHub
```

## Deploy

Cloudflare Worker with D1. Create the database, put its id in `wrangler.toml`, apply `schema.sql`, then `bunx wrangler@4 deploy`.
The hourly cron snapshots at most 40 products per run (Workers Free allows 50 outside calls).
Set `GITHUB_TOKEN` as a secret for a higher GitHub rate limit.

## Routes

`/`, `/p/:slug`, `/submit`, `/badges`, `POST /api/submit`, `POST /api/verify/:slug`, `/api/trending?period=`, `/badge/:slug.svg`, `/health`, `/llms.txt`.
