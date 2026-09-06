# Contributing

## Setup

```
corepack enable && pnpm install
cp apps/web/.env.example apps/web/.env   # set PAYLOAD_SECRET
pnpm seed && pnpm dev
```

## Workflow

- Branch from `main`; small PRs. CI runs lint, typecheck, unit tests and a production build.
- `pnpm lint:fix` before committing (Biome formats and organises imports).
- Changing a collection? Run `pnpm generate:types` and commit `payload-types.ts`. If the seed or API should carry the
  new field, update `packages/schema` and `apps/web/src/lib/world.ts`.
- Changing content? Prefer the studio (`/admin`) for one-offs, and `data/seed/*.json` for anything that should survive
  a database reset. Keep `wikiSource` on every entity.
- New UI? Read `docs/DESIGN_SYSTEM.md` first. Use tokens and existing primitives; one accent per view; HUD numerals for
  numbers; designed fallbacks.
- AI output is a draft: run the pipelines into `data/seed/ai`, review in the studio, publish deliberately.

## Tests

- `pnpm test` — Vitest across packages (schema, sdk, ingest) and `apps/web` integration tests (Payload Local API against a throwaway SQLite file).
- `pnpm test:e2e` — Playwright against the dev server (admin smoke + frontend).

## Commit style

Conventional-ish, in the imperative: `feat(web): weapon comparison table`, `fix(api): search excludes music aliases`,
`content: add Season 8 chapters`, `docs: deployment on Vercel`.

## Code of the world

Be kind. This is a memorial to a game and the people who played it; the community is international (Korea, China,
Taiwan/HK, Japan, Indonesia, Vietnam, SEA, Turkey, Russia, and Steam). Respect original creators — Nexon, Valve, the
wiki editors — in text and in tone.
