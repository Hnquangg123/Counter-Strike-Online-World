# Architecture

## Shape

```
                       ┌──────────────────────────────────────────────────────────┐
  Counter-Strike       │  apps/web (Next.js 16, one deployment on Vercel)         │
  Online Wiki ──────►  │                                                          │
  (CC BY-SA)           │  (frontend)  /[locale]/…      React Server Components,   │
       │               │              ISR (revalidate 300s), Motion, R3F          │
  packages/ingest      │  (payload)   /admin, /api/*   Payload studio + internal   │
  ──► data/wiki ──┐    │              REST/GraphQL, Lexical rich text, versions   │
                  │    │  api/v1      /api/v1/*        Hono + zod-openapi + Scalar │
  data/seed ◄─────┴──► │  scripts     seed.ts          Local API, idempotent      │
       ▲               └───────────────┬──────────────────────────────────────────┘
  packages/ai ──── data/seed/ai        │ Payload adapters
  (drafts: prose, vi, art, GLB)        ▼
                         SQLite (dev)  ·  Neon Postgres (prod)  ·  local disk (dev) / R2 (prod)
       packages/schema  ── Zod types shared by web, ingest, ai, sdk ──  packages/sdk (public client)
```

## Decisions and their upgrade paths

| Area | Choice | Why | What would replace it |
| --- | --- | --- | --- |
| App framework | **Next.js 16.3**, App Router, RSC, Turbopack, React Compiler | Best SEO/streaming story for a content world with 3D and motion; Payload is Next-native; first-class on Vercel | Cache Components / PPR (`cacheComponents: true`) once every page uses `'use cache'`; TanStack Start if we ever leave React Server Components |
| CMS / data | **Payload 3.88** in the same Next app | Type-safe schema in code, localization, drafts + versions, media pipeline (sharp), admin UI and Local API for free; one deploy | Nothing on the horizon — Payload is the durable choice; if the API ever needs to scale independently, move `src/api/v1` to a Hono worker that reads the same Postgres |
| Database | **SQLite** (libsql) in dev, **Postgres on Neon** in prod, chosen by `DATABASE_URI` | Zero-setup local dev; serverless Postgres with branching and pgvector in prod | Self-hosted Postgres (Docker) is the same adapter; Neon branches for preview deployments |
| Media | Local disk in dev, **Cloudflare R2** (S3 adapter) in prod, `MEDIA_PUBLIC_URL` for a custom domain | Zero egress fees for ~26k wiki images + generated art | Any S3-compatible store; Vercel Blob if simplicity beats cost |
| Styling | **Tailwind CSS 4** (`@theme` tokens), no component kit | The CSO look is bespoke; tokens + utilities keep it consistent; nothing to fight | shadcn/ui primitives if we grow forms; tokens stay |
| UI primitives | `radix-ui` (Dialog), `cmdk` | Accessible overlays and the ⌘K palette with minimal weight | Base UI when it stabilises |
| Motion | **Motion 13** (`motion/react`) | Declarative reveal/scroll animations, small | GSAP (now free) for scroll-driven cinematic sequences |
| 3D | **three.js 0.185 + React Three Fiber 9 + drei** | The character/weapon stage; loads GLBs from AI 3D or hand-made models | WebGPU renderer via `three/webgpu` when Safari catches up |
| Fonts | `@fontsource/*` (self-hosted) | No third-party requests, works offline and in locked-down networks | Variable fonts when Chakra Petch / Barlow ship them |
| i18n | **next-intl 4** for UI strings, Payload localization for content (`en`, `vi`) | Locale-prefixed routes (`/vi/...`), server-rendered translations, content fallback to English | Add locales in `routing.ts` + `payload.config.ts`; AI translate fills them |
| Public API | **Hono 4 + @hono/zod-openapi + Scalar** at `/api/v1` | Schemas are the single source of truth for validation, OpenAPI 3.1 and the SDK types; portable to any runtime | Versioning by path (`/api/v2`) with the same factory |
| Validation / types | **Zod 4** in `@csow/schema` | Shared by seed, ingest, AI, API and SDK | — |
| Monorepo | **pnpm 10 workspaces + Turborepo 2** | Internal packages without publishing; cached tasks | — |
| Quality | **Biome 2** (lint + format), **Vitest 4**, **Playwright 1.63**, TypeScript 5.9 | Fast and simple | TypeScript 7 (native Go compiler) once Next's type plugin and Payload's type generation support it; it is a drop-in `pnpm add -D typescript@7` when ready |
| AI | **Vercel AI SDK 7** with Anthropic / OpenAI / Google / fal / Replicate providers | One interface for text, images and embeddings; providers are config | See `AI_PROVIDERS.md` |

## Request flow (site)

1. `src/proxy.ts` (Next 16 "proxy", formerly middleware) resolves the locale (`/` = en, `/vi/...` = vi) and rewrites to `app/(frontend)/[locale]/...`. `/admin` and `/api` are excluded.
2. Pages are React Server Components. They call `src/lib/world.ts` (Payload Local API, `overrideAccess: false` so only published docs are visible) and render with `revalidate = 300`. Detail pages pre-render known slugs via `generateStaticParams`.
3. Media: `src/lib/media.ts` resolves `heroImage` → gallery → `remoteMedia` (wiki CDN) and builds responsive `srcSet`s (Payload sizes locally, `scale-to-width-down` on the wiki CDN). `EntityImage` renders a designed fallback when art is pending.
4. Client islands: `EntityImage`, `Reveal` (Motion), `FigureViewer` (R3F, dynamically imported, no SSR), `CommandPalette`, `Countdown`, `AudioPlayer`, `Gallery`, `LocaleSwitcher`, `MobileNav`.

## Request flow (API)

`app/api/v1/[[...route]]/route.ts` hands every request to the Hono app in `src/api/v1/app.ts`. `registerEntity()` builds
`GET /{type}` and `GET /{type}/{slug}` from a Zod schema + filter shape; handlers call `world.ts` and map Payload
documents to the public DTOs (`toCharacterPublic`, …), converting Lexical rich text to Markdown. Responses carry
`Cache-Control: public, s-maxage=300, stale-while-revalidate=86400` and CORS `*` (set in `next.config.ts` headers).
`/api/v1/openapi.json` is generated from the same route definitions; `/api/v1/docs` serves Scalar.

## Content pipeline

```
wiki ──(packages/ingest: MediaWiki API → wtf_wikipedia → mappers)──► data/wiki/<type>/<slug>.json (+ raw wikitext, manifest)
     ──(pnpm ingest -- build-seed)──► data/seed/ingested/<type>.json
data/research (agent captures) ──(tools/research-to-seed.py)──► data/seed/<type>.json   (curated, committed)
packages/ai ──► data/seed/ai/<type>.json (text overlays) + data/media/generated/** (art, GLB with provenance)
pnpm seed: curated ▷ ingested ▷ ai merged by slug (curated wins) → Payload Local API (en, then vi) → published docs
```

## Environments

| | Local | Preview (Vercel) | Production (Vercel) |
| --- | --- | --- | --- |
| DB | `file:./csow.db` (push schema) | Neon branch per PR (migrations) | Neon main (migrations) |
| Media | `apps/web/media` on disk | R2 bucket `csow-preview` | R2 bucket `csow` + custom domain |
| Secrets | `apps/web/.env` | Vercel env (preview) | Vercel env (production) |

See `DEPLOYMENT.md` for the step-by-step.

## Roadmap seeds

- "Ask the Archivist": RAG chat over embeddings (pgvector) with citations back to entity pages.
- Community bridge: accounts (Payload auth), favourites, user-submitted memories per character/map, moderated in the studio.
- Live wallpapers / OBS overlays powered by the API; Discord bot using `@csow/sdk`.
- Full ingestion of ~1,900 articles + 26k images with the pipeline, then AI enrichment passes and human review.
- Motion polish: GSAP scroll sequences on the story page; page transitions with the View Transitions API.
