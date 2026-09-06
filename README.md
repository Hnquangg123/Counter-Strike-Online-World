# Counter-Strike Online World

> The world never ended. Its soul is still here.

An open, beautiful archive of **Counter-Strike Online** (Nexon, 2008 – 30 September 2026): every character, weapon,
scenario chapter, game mode, faction and song — with a public API so other apps and sites can build bridges into the
world. Content is adapted from the [Counter-Strike Online Wiki](https://cso.fandom.com) (CC BY-SA 3.0) and reviewed by
humans; AI helps with prose, translation and art, never with facts.

**Stack (September 2026):** Next.js 16.3 (App Router, React 19.2, Turbopack, React Compiler) · Payload CMS 3.88
(content studio, localization, versions, media) · Tailwind CSS 4 · Motion 13 · React Three Fiber 9 / three.js ·
Hono 4 + OpenAPI 3.1 + Scalar docs · Zod 4 · next-intl 4 (English + Tiếng Việt) · SQLite locally / Neon Postgres +
Cloudflare R2 in production on Vercel · pnpm 10 + Turborepo 2 + Biome 2 + Vitest 4 + Playwright · Vercel AI SDK 7
(Claude, OpenAI, Gemini, fal/Flux).

## Quick start (Windows, macOS, Linux)

Requirements: **Node.js 22.12+** and **git**. pnpm comes with Node via corepack.

```powershell
corepack enable                 # once; gives you pnpm 10
pnpm install                    # installs the whole workspace
copy apps\web\.env.example apps\web\.env     # macOS/Linux: cp apps/web/.env.example apps/web/.env
# edit apps/web/.env → set PAYLOAD_SECRET to any long random string
pnpm seed                       # creates the SQLite DB, the admin user and the whole seeded world (~30 s)
pnpm dev                        # http://localhost:3000
```

- Site: http://localhost:3000 (English) · http://localhost:3000/vi (Tiếng Việt)
- Studio (Payload admin): http://localhost:3000/admin — login with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`
- API: http://localhost:3000/api/v1 · docs at http://localhost:3000/api/v1/docs · spec at `/api/v1/openapi.json`

Images and voice lines are streamed from the wiki's CDN until you run the ingestion pipeline (`docs/INGESTION.md`),
which downloads them into your own media library. `docs/MEDIA_PIPELINE.md` explains how wiki captures become CSOW hero
art: **restore** (faithful cutout + upscale, every entity) and **reimagine** (AI key art from restored references).

## Repository map

```
apps/web                Next.js 16 app: site (src/app/(frontend)), Payload studio (src/app/(payload)),
                        public API (src/api/v1 → /api/v1), collections, design system (src/styles/globals.css)
packages/schema         @csow/schema — Zod schemas, enums, grade/side metadata shared by everything
packages/sdk            @csow/sdk — typed client for the public API (publishable)
packages/ingest         @csow/ingest — Counter-Strike Online Wiki → normalized JSON + media
packages/ai             @csow/ai — enrichment, translation, art, 3D figures, embeddings (Vercel AI SDK)
data/seed               curated seed bundle (characters, weapons, scenarios, modes, factions, maps, music, storyline)
data/research           raw research captured from the wiki, with sources (provenance for the seed)
data/wiki, data/media   ingestion output (gitignored, regenerated)
docs                    ARCHITECTURE · DESIGN_SYSTEM · DATA_MODEL · DEPLOYMENT · INGESTION · MEDIA_PIPELINE · AI_PROVIDERS · CONTRIBUTING
tools                   one-off scripts (research → seed converter)
```

## Everyday commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the site + studio + API with Turbopack |
| `pnpm seed` / `pnpm seed:reset` | Load `data/seed` into the database (idempotent) / wipe content first |
| `pnpm generate:types` | Regenerate `payload-types.ts` after changing collections |
| `pnpm lint` / `pnpm lint:fix` | Biome lint + format |
| `pnpm typecheck` / `pnpm test` / `pnpm build` | Across the workspace via Turborepo |
| `pnpm ingest -- --help` | Wiki ingestion CLI (run from your own machine); `pnpm ingest -- verify-media` reports dead links and white-background captures |
| `pnpm ai -- status` / `pnpm ai -- --help` | AI pipelines — reads keys from `apps/web/.env` (see `docs/AI_PROVIDERS.md`) |
| `pnpm ai -- restore --type characters --slug anemone` | Clean up a wiki capture (upscale, cut out the background) into a hosted hero image (`docs/MEDIA_PIPELINE.md`) |

## Principles

1. **Soul first.** Dark lobby, chamfered panels, CS orange, HUD numerals, spotlit figures. If it doesn't feel like CSO, it doesn't ship. (`docs/DESIGN_SYSTEM.md`)
2. **Facts from the wiki, prose from us, review by humans.** Every entity carries `wikiSource` attribution; AI output lands as drafts.
3. **The API is a first-class product.** Versioned, documented, cached, CORS-open, attribution in every payload.
4. **Upgradeable by design.** Adapters everywhere (DB, storage, AI providers), a shared schema package, and `docs/ARCHITECTURE.md` recording why each choice was made and what would replace it.

## Licence

Code: MIT. Encyclopedic content: CC BY-SA 3.0 (adapted from the Counter-Strike Online Wiki). Game assets © Nexon;
Counter-Strike is a trademark of Valve Corporation. Unofficial fan project — not affiliated with Nexon or Valve.
