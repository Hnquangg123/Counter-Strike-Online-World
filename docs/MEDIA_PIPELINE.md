# Media pipeline — from wiki captures to CSOW art

The soul of the site is visual, and almost every image we start from is a capture Nexon made for the in-game shop or a
screenshot a wiki editor took. This document explains what those sources look like, why tiles can come out "blank
white", and the two-track pipeline that turns them into hero art: **Restore** (faithful clean-up, every entity) and
**Reimagine** (generative key art from restored references, featured entities only).

## What the wiki gives us

| Wiki file pattern | What it is | Background | Seed `kind` | Good for |
| --- | --- | --- | --- | --- |
| `Buffclass21s2tr.png`, `Dione.png`, `*_gfx.png` (infobox image) | Official character render | **transparent** | `portrait` | hero, cards, 3D reference |
| `*_shopmodel.png`, `*_ingamemdl.png`, `*_model.png`, `*_hd.png` | Shop / in-game model capture | **white or grey** | `render` | body reference — needs restore |
| `V_*.png`, "view model" | First-person weapon view | in-game scene | `screenshot` | gallery |
| `*_msg.png` | Dialogue/message portrait | varies | `portrait` | gallery |
| `*icon.png`, kill marks | Inventory icon / kill mark | transparent | `icon` | weapon tiles, HUD |
| `Wall*.jpg`, posters | Wallpaper / promo art | full art | `artwork` | scenario & lore heroes |

Two things follow. First, the **infobox portrait is the right hero** for characters: it is the official render with a
transparent background, so it sits on our dark stage as-is. `apps/web/src/lib/media.ts` therefore orders hero candidates
`portrait → artwork → render → screenshot → icon`. Second, the white-background `render` captures are still valuable
(they are often the largest, sharpest body shots) but must never be shown raw inside a cropped dark tile — that is the
"blank white image" you saw.

The tactical-grid fallback (an illuminated initial on a grid) appears when an entity has **no** image at all yet
(most weapons in the curated seed) or when the wiki URL is dead. It is a designed state, not a bug: the cure is more
media, via ingestion (`docs/INGESTION.md`) and this pipeline.

## Safety net in the browser

`EntityImage` (`apps/web/src/components/ui/entity-image.tsx`) probes every image it shows with a 64px sample
(`apps/web/src/lib/image-tone.ts`). If the border is a uniform light sweep, the tile switches to a **studio plate**: a
warm light radial background, the image `object-contain` and multiplied onto the plate, an accent hairline underneath.
The white box dissolves and the subject reads as a product shot on a lit plate — the way the CSO shop itself presented
items. Transparent cutouts and dark art render unchanged. The probe degrades to "unknown" (no treatment) if the CDN
withholds CORS headers, so the worst case is exactly what you had before. This is a safety net; the pipeline below fixes
the assets themselves so the probe has nothing to do.

## Track 1 — Restore (deterministic, canon-faithful, cheap, every entity)

```
wiki capture ──► [AuraSR ×4 upscale] ──► background removal ──► trim + 4% pad ──► transparent PNG
                 fal-ai/aura-sr          fal-ai/bria/background/remove             data/media/restored/<type>/<slug>/
```

```bash
pnpm ingest -- verify-media                          # health + tone report: dead links, white-background captures
pnpm ai -- restore --type characters --slug anemone --dry-run
pnpm ai -- restore --type characters --slug anemone            # best portrait/render → cutout
pnpm ai -- restore --type characters --slug anemone --upscale  # ×4 first (small 512px captures)
pnpm ai -- restore --type characters --limit 20 --all          # every portrait/render/icon of 20 characters
pnpm ai -- restore --type weapons --slug m2hb-devastator --kind render
pnpm ai -- restore --type characters --slug anemone --source https://…/Buffclass21s2tr_shopmodel.png
pnpm seed                                                      # uploads restored PNGs → they become heroImage
```

Nothing is invented. Super-resolution (AuraSR v2, a GAN upscaler with no text prompt) sharpens pixels that exist;
background removal (Bria RMBG 2.0, or `fal-ai/birefnet/v2` via `AI_BG_REMOVE_MODEL` for finer hair/strap edges) only
deletes background pixels. The result keeps the `fair-use` licence with a credit line such as
`Nexon via Counter-Strike Online Wiki — restored (upscaled ×4, background removed)` and `sourceUrl` pointing at the
original. Each output has a provenance JSON beside it (steps, models, fal request ids, timings, original dimensions) and
the untouched source file (`*.source.png`) so any restore can be audited or redone.

Idempotent: the output name is `<slug>-<kind>-<hash of source URL>.png`, so re-running overwrites rather than
duplicates, and the overlay entry in `data/seed/ai/<type>.json` is replaced. Already-restored sources are skipped unless
you pass `--force`. Cost: about $0.01–0.03 per image on fal; the whole current roster is well under $5.

`data/media/**` is git-ignored: the media library in Payload (local disk in dev, Cloudflare R2 in production) is the
system of record once `pnpm seed` has uploaded a file. Keep the folder on the machine that seeds production, or re-run
`restore` — it is deterministic.

## Track 2 — Reimagine (generative, featured entities, labelled, reviewed)

Once a character has a clean cutout, use it as the **reference** so generated art keeps her face, outfit and colours:

```bash
pnpm ai -- art --type characters --slug anemone --variant hero \
  --reference https://<your-media-host>/anemone-portrait-fd86491d.png          # Flux Kontext (fal) keeps identity
pnpm ai -- art --type characters --slug anemone --variant action --provider google   # Gemini: strongest at edits with references
pnpm ai -- art --type characters --slug anemone --variant portrait --provider openai  # gpt-image-2: art-director friendly
pnpm ai -- figure --slug anemone --image https://<your-media-host>/anemone-portrait-fd86491d.png   # Hunyuan3D → GLB for the 3D stage
```

Prompts live in `packages/ai/src/prompts.ts` and describe the CSOW look: dark lobby, spotlit figure, ember rim light,
chamfered plates, no text. Outputs land in `data/media/generated/<type>/<slug>/` with full `aiGeneration` provenance
(provider, model, prompt, seed, references) and are seeded with `license: ai-generated` and the credit
`Counter-Strike Online World (AI-generated)`. They are drafts: a person compares them with canon in the studio
(`/admin`) before they are published, and they never replace the restored canon image in the gallery — they sit next to it.

Which track for which page:

| Page | Hero | Gallery |
| --- | --- | --- |
| Character (e.g. Anemone) | Reimagined key art if approved, else restored portrait | restored portrait, restored renders, wiki screenshots, generated set, GLB figure |
| Weapon | Restored side-profile render / icon on the tactical grid | view-model screenshots, skins |
| Scenario / mode / faction | Wiki poster or loading screen (`artwork`), no cutout needed | screenshots, maps |

## Media kinds and how they are inferred

`tools/research-to-seed.py` (and `packages/ingest/src/mappers.ts` for live ingestion) tag each wiki image with a
`kind` from its caption and file name, first match wins: `icon` (icon, kill mark) → `hud` → `portrait` (portrait,
infobox, `_msg` dialogue busts) → `render` (`_shopmodel`, `playermodel`, `_ingamemdl`) → `screenshot` (view model,
`V_*`, in-game, gameplay) → `render` (model, render) → `artwork` (poster, concept, art, wallpaper, costume, skill).
Unhinted weapon images default to `render` because a weapon's infobox image is its side-profile render; unhinted
character/world images default to `artwork`.

## Legal

Restored images are still Nexon's artwork, served under the same fair-use, attributed, non-commercial terms as the wiki
copies they came from; restoration is presentation, not authorship. Generated images are fan art, labelled as such, never
sold, never presented as official. See `NOTICE.md`.
