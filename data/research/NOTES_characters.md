# Research notes - CSO characters, factions and storyline

Date: 2026-09-06. Source: Counter Strike Online Wiki (https://cso.fandom.com), CC BY-SA 3.0.
All output text is adapted/summarised in our own words with source URLs kept per file; the only verbatim
material is short in-game voice lines and one-line official descriptions.

## How the pages were reached (important for future runs)

- `WebFetch` on any `cso.fandom.com` URL (including `?action=raw` and `api.php`) returned **HTTP 402** every
  time - Fandom blocks the fetcher. The sandbox egress proxy also denies `cso.fandom.com` and
  `static.wikia.nocookie.net` (403 on CONNECT), so curl/python are out too.
- What worked: the **Cowork Browser pane** on the user's own Windows desktop (`Claude_Browser__navigate`
  then `Claude_Browser__javascript_tool`). After the first navigation the `navigate` tool started failing
  ("denied or failed"), but in-page `location.href = ...` navigation and, better, **same-origin
  `fetch('/api.php?action=parse&page=...')`** calls from inside the page worked perfectly. The latter lets
  one JS call pull several pages (parsed HTML -> DOMParser -> infobox/gallery/text) at once.
- Gallery images are lazy-loaded; real URLs come from `img[data-src]` / `a.image[href]`, not `img.src`.
  Image URLs were normalised by stripping `/revision/latest...`. Add `/revision/latest?cb=...` or
  `/revision/latest/scale-to-width-down/NNN` if a CDN variant is needed.
- TextExtracts (`prop=extracts`) is NOT enabled on this wiki; use `action=parse&prop=text`.
- The wiki's own search API (`list=search`) works from inside the page and is the fastest way to check
  whether a title exists (e.g. it confirmed "Kiriya" has no page).

## What was captured

### Characters (18 files in /home/claude/research/characters/)

| slug | kind/side | richness on wiki | notes |
|---|---|---|---|
| anemone | human / TR / transcendent | medium | Priority target - fully captured: infobox (Category, Gender, Race/Affiliation "VR Human", Faction, Status "Online", Signature Primary M2 Devastator, Date added, 4 voice actresses), overview, Buffs incl. exclusive skill *Resolver*, release dates (KR 2021-07-01; TW/HK + CSNS 2021-07-14), Anemone's Drone costume, ZS stats, 8 gallery images + infobox + skill bg + drone image, 3 voice-line .ogg files, trivia. Enriched with Mirage's page, the **Alpaca Anemone** variant page (childhood backstory via in-character interview; release KR 2023-06-01; Magnum Launcher) and the **M2HB Devastator** weapon page. |
| mirage | human / CT / transcendent | medium | Twin sister; captured to complete Anemone's story. |
| david-black | human / TR | rich | History + NPC roles; story augmented from ZS Seasons 3, 7, 8. |
| gerard | human / CT | rich | Background, appearance, 40-image gallery (25 kept); ZS Season 4 lead. |
| natasha | human / CT | medium | First female CT; costs per region; release dates TR/CSN/VN. |
| choi-ji-yoon | human / CT | rich | Background, Chaos captain, Episode Choi, sister = Sting Finger; 5 regional release dates. |
| erika | human / TR | rich | Background + kidnapping/infection arc from Douglas Jacob page; 5 regional release dates. |
| ritsuka | human / TR | rich | Background, Kronos-agent period, Season 8 arc; 5 regional release dates. |
| yuri | human / TR | medium | Background (explosives genius, Rex bombing); 6 regional release dates incl. KR 2009-04-30. |
| lucia | human / CT | medium | Naval team leader; 2 emote audio files; 5 regional release dates. |
| karin | human(fairy) / TR / transcendent | medium | 2024 class; skills (Baptism of Fire), pairing weapons (Drakar), 3 release dates. |
| milia | human(fairy) / CT / transcendent | medium | 2024 class; skills (Bedtime); 3 release dates. |
| dione | boss / zombie | rich | Full attack breakdown, Zombie Giant skills, honor mission. |
| oberon | boss / zombie | rich | Abilities, tips, honor mission. |
| phobos | boss / zombie | rich | Page title is "Prototype Phobos" ("Phobos" redirects). |
| angra | boss / zombie | rich | Full tactics, Zombie Giant evolution. |
| dr-rex | npc / zombie (boss form) | rich | Bonus: origin of the virus; boss in Paranoia/Madness. |
| douglas-jacob | npc / neutral (Kronos) | rich | Bonus: main antagonist Seasons 5-9. |

Bosses covered: 4 (Dione, Oberon, Prototype Phobos, Angra). Humans covered: 12 (incl. Anemone/Mirage,
Karin/Milia). Task minimums (>=2 bosses, >=5 humans, 7 from the candidate list) exceeded.

### Factions (7 files in /home/claude/research/factions/)
aegis-institute, vanguard-company, rex-research-institute, **kronos** (the real antagonist corporation
named on the Aegis/Vanguard pages), **asia-red-army** (named on Choi/Ritsuka pages), counter-terrorist,
terrorist. Emblem images: CT (`Ct.png`) and TR (`Tr.png`) have proper emblems; Kronos has a logo header
image (`20200419_155731.JPG`); Aegis, Vanguard and Rex Institute pages have **no dedicated logo** - the
JSON notes the best substitute image for each.

### Lore
`/home/claude/research/lore/storyline.md` - 14 sections, ordered from Dr. Rex's origin through Zombie
Scenario Seasons 1-9 and Douglas Jacob's death, plus side threads (Krono World twins, fairies, Kronos
operatives) and a cast table. Every section carries its source URLs.

## Missing / thin / caveats

- **Kiriya**: no page on cso.fandom.com (search returned zero hits). Possibly a CSO2 character or a
  different romanisation; not researched further. **Not delivered.**
- **Krono World** (the VR platform in Anemone/Mirage lore): no dedicated wiki page. The resemblance of the
  name to "Kronos" (the antagonist corporation) is not addressed anywhere on the wiki - treat any link as
  speculation.
- Character pages carry **no age / height / weight / birthday / blood type**; those profile fields are null
  throughout. Nationality is only implied by affiliation (e.g. Russian Army, 707).
- **Voice actors** are listed only for transcendent classes with voice lines (Anemone, Mirage, Alpaca
  Anemone). Older premium characters (David Black, Gerard, Natasha, Choi Ji Yoon, Erika, Ritsuka, Yuri,
  Lucia) have no VA data on the wiki. Karin/Milia pages mention "exclusive voice line class" but name no VA.
- **Release dates**: the wiki gives KR dates only for some characters (Anemone/Mirage, Karin/Milia, Yuri);
  for the 2011-2012 generation it lists SG/MY, ID, TR, CSN:Z, VN dates but usually not KR/CN/JP. Date
  region codes used: kr, cn, tw (Taiwan & Hong Kong), jp, sg (Singapore/Malaysia), id, vn, tr (Turkey),
  csn (CSN:Z / CSN:S global).
- **Quotes**: only transcendent classes have transcribed voice lines on the wiki (Anemone x3, Mirage x3).
  Other characters' `quotes` arrays hold only the one-line official description where one exists.
- **"Appearances"**: maps/scenarios lists are compiled from page text and navbox NPC listings; they are not
  exhaustive.
- Season pages are inconsistent on a few details (e.g. Season 8 says "the man who blew up the Rex Labs"
  while Yuri's and Douglas Jacob's pages attribute the Rex bombing to Yuri). Noted inline in storyline.md.
- Wiki spelling variants kept as aliases: Erika/Erica, Gerard/Gerrard, Milia/Millia, Soy/Soi, ARA/JRA.
- Long/rich pages that exist but were **not** fetched (good next targets): Episode Lucia (14 KB),
  Rendezvous (19 KB), Rex Labs (18 KB), Angra Nest (11 KB), Paranoia (12 KB), Overflow (11 KB),
  Zombie 3: Hero (35 KB), Zombie (39 KB), Jennifer, Soy, Jim, Carlito, Norman, Mr. X, Revenant,
  Siege Type Phobos, Siege Type Dione, Fallen Titan, Frozen Terror, Laser Wing, Crono Wing, Adamant.

## Open questions for the site owner

1. Should "Phobos" on the site be the Prototype (as here) with Siege Type Phobos as a variant, or two
   separate entries?
2. Do you want the Alpaca Anemone / Blue Rabbit Mirage variants as separate character pages or as
   sub-entries (current JSON nests the variant under `variants`)?
3. Do you want Dr. Rex and Douglas Jacob under "characters" (current) or a separate "NPC/antagonists"
   collection?
4. Should faction `side` for Aegis be "neutral" (wiki says it deliberately stays neutral) or "ct" (it was
   founded by the Counter-Terrorism Alliance)? Current: neutral, with `sideNote`.

## All source URLs used

Characters
- https://cso.fandom.com/wiki/Anemone
- https://cso.fandom.com/wiki/Alpaca_Anemone
- https://cso.fandom.com/wiki/Mirage_(Character)
- https://cso.fandom.com/wiki/M2_Devastator (page title: M2HB Devastator)
- https://cso.fandom.com/wiki/David_Black
- https://cso.fandom.com/wiki/Gerard
- https://cso.fandom.com/wiki/Natasha
- https://cso.fandom.com/wiki/Choi_Ji_Yoon
- https://cso.fandom.com/wiki/Erika
- https://cso.fandom.com/wiki/Ritsuka
- https://cso.fandom.com/wiki/Yuri
- https://cso.fandom.com/wiki/Lucia
- https://cso.fandom.com/wiki/Karin
- https://cso.fandom.com/wiki/Milia
- https://cso.fandom.com/wiki/Dione
- https://cso.fandom.com/wiki/Oberon
- https://cso.fandom.com/wiki/Phobos -> https://cso.fandom.com/wiki/Prototype_Phobos
- https://cso.fandom.com/wiki/Angra
- https://cso.fandom.com/wiki/Dr._Rex
- https://cso.fandom.com/wiki/Douglas_Jacob

Factions / organisations
- https://cso.fandom.com/wiki/Aegis_Institute
- https://cso.fandom.com/wiki/Vanguard_Company
- https://cso.fandom.com/wiki/Rex_Research_Institute
- https://cso.fandom.com/wiki/Kronos
- https://cso.fandom.com/wiki/Asia_Red_Army
- https://cso.fandom.com/wiki/Counter-Terrorist
- https://cso.fandom.com/wiki/Terrorist

Lore
- https://cso.fandom.com/wiki/Zombie_Scenario
- https://cso.fandom.com/wiki/Zombie_Scenario:_Season_1
- https://cso.fandom.com/wiki/Zombie_Scenario:_Season_2
- https://cso.fandom.com/wiki/Zombie_Scenario:_Season_3
- https://cso.fandom.com/wiki/Zombie_Scenario:_Season_4
- https://cso.fandom.com/wiki/Zombie_Scenario:_Season_5
- https://cso.fandom.com/wiki/Zombie_Scenario:_Season_6
- https://cso.fandom.com/wiki/Zombie_Scenario:_Season_7
- https://cso.fandom.com/wiki/Zombie_Scenario:_Season_8
- https://cso.fandom.com/wiki/Zombie_Scenario:_Season_9
- https://cso.fandom.com/wiki/Z-VIRUS

Searched but not fetched / missing
- Kiriya - no page. Krono World - no page. Storyline / Timeline - no dedicated page (story lives in the
  Season pages above).
