# Ingestion — from the Counter-Strike Online Wiki to the world

`packages/ingest` turns wiki articles into normalized seed data with provenance. It talks to the MediaWiki API of
https://cso.fandom.com politely (one request per second, identifiable User-Agent, revision-aware so re-runs are cheap).

> Run it from **your own machine**. The sandboxed environments that built this project cannot reach fandom.com at all
> (corporate egress policy), which is why the initial seed was captured by research agents through a browser session
> and converted with `tools/research-to-seed.py`.

## Commands

```bash
pnpm ingest -- categories                                   # top-level categories with sizes (find the right names)
pnpm ingest -- page --title Anemone --type character --dry-run   # inspect infobox → mapped fields → unmapped keys
pnpm ingest -- pages --type character --limit 20            # Category:Characters → data/wiki/characters/*.json
pnpm ingest -- pages --type weapon --recursive               # Category:Weapons and sub-categories
pnpm ingest -- pages --type scenario --category "Zombie Scenario maps"
pnpm ingest -- pages --type map --recursive --limit 100
pnpm ingest -- media --type character --slug anemone         # download the page's files into data/media/characters/anemone/
pnpm ingest -- build-seed                                    # data/wiki/* → data/seed/ingested/*.json
pnpm seed                                                    # load into Payload (curated data/seed wins on conflicts)
```

Flags: `--force` re-fetches unchanged revisions, `--delay 2000` slows down, `--verbose` logs every request.

## How it works

1. **List** titles from a category (`list=categorymembers`, recursive over sub-categories when asked).
2. **Fetch** wikitext for 50 titles per request (`prop=revisions`, `rvslots=main`, follows redirects). Revision ids are
   stored in `data/wiki/manifest.json`; unchanged pages are skipped.
3. **Parse** with `wtf_wikipedia`: infobox key/values (normalised keys), intro, sections (→ Markdown), categories, images.
4. **Map** (`src/mappers.ts`) to `CharacterSeed` / `WeaponSeed` / `MapSeed` / `ScenarioSeed`: tolerant alias tables
   (`damage|dmg`, `rate of fire|rof`, `date added|release`…), grade and category inference from words and categories,
   stats split into numeric bars vs prose `statNotes`, dates in any wiki format → ISO, regions from labels
   (`South Korea` → `kr`, `CSN:Z` → `csn`). Everything the mapper did not understand is kept under `_unmapped` so you can
   grow the alias tables from real pages.
5. **Images** get direct URLs via `prop=imageinfo`; `media` downloads them with the attribution log
   `data/media/ATTRIBUTION.json`.
6. **build-seed** writes overlay bundles the seed script merges beneath the curated data.

## Tuning the mappers

Run a `--dry-run` for a representative page of each type, look at `infobox` and `unmapped`, and add keys to
`KNOWN_*_KEYS` / `pick(box, …)` calls in `src/mappers.ts`. Unit tests in `src/normalize.test.ts` cover the parsers; add
a fixture from `data/wiki/raw/<slug>.wikitext` when you fix a mapping.

## If the wiki refuses the client

Fandom returns 402/403 to some automated clients. Options, in order:
1. Lower the rate (`--delay 3000`) and keep the descriptive User-Agent (edit `WikiClientOptions.userAgent` with a contact URL).
2. Export from a browser session: open `https://cso.fandom.com/api.php?action=query&prop=revisions&rvslots=main&rvprop=content|ids&format=json&titles=Anemone`
   in your browser (logged in or not), save the JSON, and feed the wikitext through `parseWikitext` — a small
   `--from-json` loader is a 20-line addition to `cli.ts`.
3. Ask the wiki admins for a database dump (`Special:Statistics` → dumps); MediaWiki XML dumps parse with the same code.

## Licence hygiene

Text is CC BY-SA 3.0: keep `wikiSource` (URL + revision) on every entity — the site prints it on every page and the API
returns it. Images are Nexon's assets hosted by the wiki under fair use; keep `credit` and `sourceUrl`, and do not
strip watermarks or claim ownership.
