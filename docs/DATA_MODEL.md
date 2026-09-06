# Data model

Defined in code: Payload collections in `apps/web/src/collections`, globals in `apps/web/src/globals`, shared enums and
seed/public schemas in `packages/schema/src`. `pnpm generate:types` regenerates `apps/web/src/payload-types.ts`.

## Collections

| Slug | What | Notable fields |
| --- | --- | --- |
| `characters` | Humans, zombies, bosses, NPCs | `kind`, `side`, `grade`, `classType`, `factions[]`, `profile{}`, `story` (rich text, localized), `quotes[]`, `abilities[]`, `scenarioStats{health,attack,mobility,armor,ammo}` (x/28), `costumes[]`, `signatureWeapon`, `weapons[]`, `scenarios[]`, `gameModes[]`, `maps[]`, `relatedCharacters[]`, `voiceActors[]`, `model3d` |
| `weapons` | The armory | `category`, `grade`, `origin`, `manufacturer`, `caliber`, `description` (rich), `stats{damage,accuracy,recoil,rateOfFire,weight,knockback,stun}` (0–100), `statNotes` (json prose per stat), `ammo{magazine,reserve,type}`, `price`, `fireModes[]`, `obtainMethod`, `abilities[]`, `variants[]`, `characters[]`, `icon`, `model3d` |
| `scenarios` | Story chapters (Zombie Scenario etc.) | `gameMode`, `season`, `chapter`, `story` (rich), `objectives[]`, `rewards[]`, `bosses[]`, `characters[]`, `maps[]`, `difficulties[]`, `nextChapter` |
| `game-modes` | Ways to play | `family` (original/zombie/scenario/fun/pve/competitive/other), `description`, `lore` (rich), `rules[]`, `maxPlayers` |
| `maps` | Places | `location`, `description`, `gameModes[]`, `scenario`, `minimap` |
| `factions` | Organisations | `side`, `description`, `lore`, `leaders[]`, `members[]`, `emblem` |
| `music` | Soundtrack | `title`, `composer`, `album`, `durationSeconds`, `description`, `audio`, `usedIn{gameModes,scenarios,maps}` |
| `media` | Uploads | `kind`, `alt`, `caption`, `credit`, `sourceUrl`, `license` (CC-BY-SA-3.0 / fair-use / ai-generated / original), `aiGeneration{provider,model,prompt,negativePrompt,seed,referenceImages,generatedAt}`; image sizes `thumbnail` 320, `card` 768, `hero` 1920 (webp) |
| `tags` | Free tags | `name` (localized), `slug` |
| `users` | Studio accounts | `role` admin/editor |

Shared by every world collection (`fields/shared.ts`): `name`, `localizedName`, `aliases[]`, `tagline`, `summary`,
`slug` (unique, auto from name, ASCII-folded incl. Vietnamese), `heroImage`, `gallery[]`, `remoteMedia[]` (wiki-hosted
assets pending ingestion: `url`, `kind`, `caption`, `credit`), `release[]` (`region` ∈ kr cn tw jp id vn sg th tr ru csn,
partial `date`, `note`), `trivia[]`, `accentColor`, `featured`, `tags[]`, `wikiSource{url,title,revisionId,fetchedAt,license}`,
SEO tab (plugin-seo). All have drafts + versions (autosave) and are readable publicly only when `_status = published`.

## Globals

- `site-settings` — `siteName`, `tagline`, `endOfService{date,message}`, `attribution`, `social[]`.
- `homepage` — `hero{headline,subheadline,background}`, `featuredCharacters[]`, `featuredWeapons[]`, `featuredScenarios[]`.
- `storyline` — `title`, `intro`, `eras[]{title,subtitle,period,body(rich),characters[],scenarios[],factions[],image,imageUrl,sources[]}` (drafts).

## Localization

Locales `en` (source) and `vi`, with fallback to English. Localized: names shown per locale (`localizedName`), taglines,
summaries, rich text, quotes, abilities, rules, objectives, rewards, trivia, captions, storyline text. Slugs, stats,
dates, relations are shared.

## Seed shapes (`packages/schema/src/entities.ts`)

`*Seed` types mirror the collections but use `LocalizedText {en, vi?}`, relations by slug, `media[]` of `MediaInput`
(`src` = URL or repo-relative path, `kind`, `caption`, `credit`, optional `aiGeneration`). `SeedBundle` groups them.
`data/seed/*.json` is the curated layer; `data/seed/ingested/*.json` and `data/seed/ai/*.json` are overlays merged by
slug (curated wins; localized text merges per locale; media concatenates).

## Public API shapes

`*Public` types resolve one locale, flatten rich text to Markdown, summarise relations to `{slug, name, href}` and
media to `MediaRef {id, kind, url, width, height, alt, caption, credit, sizes, aiGeneration}`. Lists return
`{data, meta{page,limit,totalItems,totalPages,hasNextPage,hasPrevPage}, links{self,next,prev}}`. Errors return
`{error{code,message,details}}`.

## Identifiers

- Database ids are integers (SQLite/Postgres); the API exposes them as strings and prefers **slugs** everywhere.
- Remote media refs are `remote:<hash>`; local media use the Payload id.

## Extending

1. Add fields to a collection (and to the matching `*Seed` / `*Public` schema if seed or API should carry them).
2. `pnpm generate:types`, update `world.ts` mappers, extend the page.
3. For a new collection: create it, register in `payload.config.ts`, add to `EntityType`/`ENTITY_PATH` in `lib/href.ts`, register API routes with `registerEntity`, add seed loading in `scripts/seed.ts`.
