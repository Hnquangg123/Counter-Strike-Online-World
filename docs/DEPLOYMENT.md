# Deployment — Vercel + Neon + Cloudflare R2

One Next.js deployment serves the site, the Payload studio and the API. Total cost at launch scale: free tiers, then
low tens of dollars a month.

## 0. Repository

Push the repo to GitHub (private or public). Vercel deploys from it; previews per pull request.

## 1. Neon (Postgres)

1. https://console.neon.tech → New project → region close to your users (Singapore for Vietnam/SEA).
2. Copy the pooled connection string (`postgres://…-pooler….neon.tech/neondb?sslmode=require`) → this is `DATABASE_URI`.
3. Optional: enable the `vector` extension for future semantic search (`CREATE EXTENSION IF NOT EXISTS vector;`).
4. Migrations: Payload generates SQL migrations for Postgres. Before the first deploy, from your machine with `DATABASE_URI` pointing at Neon:
   ```
   pnpm --filter @csow/web migrate:create initial
   pnpm --filter @csow/web migrate
   ```
   Commit `apps/web/src/migrations/`. In production `push` is disabled; the build step below runs `payload migrate`.

## 2. Cloudflare R2 (media)

1. Cloudflare dashboard → R2 → Create bucket `csow` (and `csow-preview` for previews).
2. R2 → Manage API tokens → token with Object Read & Write on the bucket → `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`.
   Endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, region `auto`.
3. Public access: connect a custom domain (e.g. `media.csow.world`) or enable the `r2.dev` subdomain → `MEDIA_PUBLIC_URL=https://media.csow.world`.
4. CORS on the bucket (so the 3D viewer and audio player can fetch cross-origin):
   ```json
   [{ "AllowedOrigins": ["https://csow.world", "https://*.vercel.app"], "AllowedMethods": ["GET", "HEAD"], "AllowedHeaders": ["*"], "MaxAgeSeconds": 86400 }]
   ```

## 3. Vercel

1. Import the GitHub repo. Framework preset: Next.js. **Root directory: `apps/web`.**
   Build command: `cd ../.. && pnpm turbo run build --filter=@csow/web` (or leave default `pnpm build` — the workspace is detected; both work). Install command: `pnpm install --frozen-lockfile`.
2. Node.js version: 22.x. Enable the "Fluid compute" option if offered (long API responses, cheaper concurrency).
3. Environment variables (Production, and Preview with the preview bucket/branch):

   | Name | Value |
   | --- | --- |
   | `DATABASE_URI` | Neon pooled connection string |
   | `PAYLOAD_SECRET` | `openssl rand -hex 32` |
   | `NEXT_PUBLIC_SITE_URL` | `https://csow.world` (preview: leave unset; Payload falls back to localhost for serverURL, fine for previews, or set `https://${VERCEL_URL}` via a build step) |
   | `S3_BUCKET` / `S3_ENDPOINT` / `S3_REGION` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `MEDIA_PUBLIC_URL` | from step 2 |
   | `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | only if you run the seed against production |

4. Add the domain (`csow.world`, `www` → redirect). Vercel issues certificates.
5. First deploy → open `/admin` → create the first user (or run `pnpm seed` locally with `DATABASE_URI` pointed at Neon to load the seeded world into production; media referenced as `remoteMedia` streams from the wiki CDN until ingested).

`apps/web/package.json` `build` runs `next build`; add `payload migrate &&` in front of it for production if you prefer
migrations at build time, or run them from CI (`pnpm --filter @csow/web migrate`) before promoting a deploy.

## 4. Caching and revalidation

- Pages: ISR every 300 s (`export const revalidate = 300`). Editing in the studio shows up within five minutes; add an `afterChange` hook calling `revalidatePath` for instant updates when needed.
- API: `Cache-Control: public, s-maxage=300, stale-while-revalidate=86400` — Vercel's edge cache absorbs traffic from third-party apps.
- Images: Payload pre-generates `thumbnail/card/hero` webp sizes on upload; the wiki CDN resizes on request.

## 5. Observability (recommended)

- Vercel Analytics + Speed Insights: `pnpm --filter @csow/web add @vercel/analytics @vercel/speed-insights` and mount in the root layout.
- Sentry for the app and API (`@sentry/nextjs`).
- Neon dashboard for query insights; R2 metrics for egress.

## 6. Self-hosting alternative

Everything is standard Node: `docker compose` with Postgres + MinIO (S3) works with the same env vars (`S3_ENDPOINT`
pointing at MinIO, `forcePathStyle` already on). Deploy with Coolify/Dokploy. The `Dockerfile` from Payload's template
(multi-stage, `output: 'standalone'`) can be added when needed.

## Checklist before going public

- [ ] `NEXT_PUBLIC_SITE_URL` set (used for canonical URLs, OpenGraph and the API index)
- [ ] `PAYLOAD_SECRET` rotated from the dev value
- [ ] Admin user password changed; second admin created
- [ ] Attribution text in Site settings reviewed
- [ ] `robots`/`sitemap` (add `app/sitemap.ts` from `listAllSlugs`) once content is stable
- [ ] Rate limiting on `/api/v1` if abuse appears (Vercel WAF rules or `hono-rate-limiter` with Upstash)
