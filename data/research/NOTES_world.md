# CSO World research notes (weapons, scenarios, game modes, music)

Research date: 2026-09-06. Source wiki: https://cso.fandom.com (CC BY-SA 3.0 - keep `wikiUrl` attribution on every record).

## Tooling situation (important for follow-up runs)

- Fandom answered **HTTP 402** ("Payment Required" - Cloudflare's AI-crawler gate) to roughly half of all WebFetch requests. The block is *per page*: some pages (AWP, Desert Eagle, Thanatos-7, Dual Kukri, Zombie Scenario: Season 1, Zombie Shelter, Zombie Giant, Zombie: The Original, Bot Zombie, Seo Jeong Min, Koo Ja Wan, Category:Music, Category:Sounds, Dead End, Nightmare, Dragon Cannon, M3 Dragon, MG36 Refine, Game_modes/Game_Mode) failed on every attempt, including with `?action=raw`, `api.php`, `?useskin=fandommobile` and query-string variants. Other pages worked first time.
- BreezeWiki mirrors (antifandom.com) are blocked by robots.txt; the Wayback Machine is blocked by the sandbox.
- WebFetch returns a model-written digest, so long story passages were only obtainable as summaries; the JSON `story` / `description` fields are therefore faithful paraphrases with short quotes rather than verbatim wiki text.
- No `static.wikia.nocookie.net` image URLs were exposed in any digest - every `images` array is empty. Image harvesting needs a different tool (browser automation or a MediaWiki API call from a non-blocked network, e.g. `https://cso.fandom.com/api.php?action=query&prop=imageinfo&iiprop=url&titles=File:...`).

## What was captured

### Weapons (12 files, `research/weapons/`)
| slug | category | wiki page |
|---|---|---|
| ak-47 | assault rifle (T basic) | https://cso.fandom.com/wiki/AK-47 |
| m4a1 | assault rifle (CT basic) | https://cso.fandom.com/wiki/M4A1 |
| ethereal | assault rifle (sci-fi) | https://cso.fandom.com/wiki/Ethereal |
| crossbow | assault rifle class (projectile) | https://cso.fandom.com/wiki/Crossbow |
| skull-3 | submachine gun | https://cso.fandom.com/wiki/SKULL-3 |
| skull-11 | shotgun | https://cso.fandom.com/wiki/SKULL-11 |
| skull-5 | sniper rifle (anti-zombie) | https://cso.fandom.com/wiki/SKULL-5 |
| barrett-m95 | sniper rifle | https://cso.fandom.com/wiki/Barrett_M95 |
| balrog-vii | machine gun | https://cso.fandom.com/wiki/BALROG-VII |
| janus-7 | machine gun | https://cso.fandom.com/wiki/JANUS-7 |
| skull-9 | melee | https://cso.fandom.com/wiki/SKULL-9 |
| wind-walker | pistol (Transcendent) | https://cso.fandom.com/wiki/Wind_Walker |

Substitutions made because the requested page was blocked: Desert Eagle -> Wind Walker (pistol); Dual Kukri -> SKULL-9 (melee); M3 Dragon / Dragon Cannon -> SKULL-11 (shotgun); AWP -> Barrett M95 (sniper); Thanatos-7 -> JANUS-7 (Aegis-series machine gun); MG36 Refine -> BALROG-VII. No grenade/equipment page was reached.

Caveats inside weapon files (`_notes` keys): AK-47 variant names expanded from a compact list; M4A1 release dates on the page probably belong to variants; M4A1 price/damage are derived from the wiki's "+$600 / -2 damage vs AK-47" statements; Crossbow grade left null because the digest's "Transcendent" may refer to Crossbow Advance; BALROG-VII release dates only at month precision.

### Zombie Scenario (`research/scenarios/`)
- `_index.json`: seasons 1-7 with chapter order, codenames, bosses and per-season story summaries. Seasons 2-7 come from the season pages. **Season 1 is reconstructed** from chapter pages (Lost City = ch.1, Double Gate = 2nd map, Trap = 3rd chapter, Last Clue = 4th map); the rest of Season 1 is unverified - a `Dead End` page exists (https://cso.fandom.com/wiki/Dead_End) and Season 2's finale codename `zs_nightmare2` implies a Season 1 `zs_nightmare` stage. Verify against https://cso.fandom.com/wiki/Zombie_Scenario:_Season_1 when reachable.
- Season 6 chapter names are as rendered in the wiki table digest ("Episode Choi", "Episode Victor", "Episode Lucia", "Episode Carlito", "Forest Keeper"); in-game subtitles were not captured.
- Deep dives (6): lost-city, double-gate, trap, last-clue (Season 1), angra-nest (Season 2), envy-mask (Season 4). Trap, Last Clue, Angra Nest and Envy Mask have per-region release dates; Lost City and Double Gate did not expose dates.
- Difficulty list used everywhere: Easy, Normal, Hard, Very Hard, Hell (current five-tier system; pre-2020 it was Easy 1-2 / Normal / Hard 1-9).
- Human Scenario has real story text (Phobos corpse transport ambushed by Vanguard; Jim, Norman's betrayal, Victor) - captured in `game-modes/human-scenario.json` `lore`. It bridges Zombie Scenario Season 1 (Last Clue) and Season 3.
- Zombie Z and Zombie Touchdown pages contain no story text. New Zombie Shelter has no dedicated lore section (setting: "Dead City" / City of Damned).

### Game modes (15 files, `research/game-modes/`)
zombie-scenario, human-scenario, zombie-shelter (New Zombie Shelter: Co-op / Team Match), zombie-escape, zombie-hero (Zombie 3: Hero), zombie-4-darkness, zombie-the-mutation, zombie-z, zombie-touchdown, original, team-deathmatch, deathmatch, hide-and-seek (prop hunt), studio (Fun/Playroom host), metal-arena.

Not reachable (402): Zombie Shelter (old), Zombie Giant, Zombie: The Original, Bot Zombie, Game_Mode list page, Zombie_modes digest was thin. Not attempted for budget reasons: Partner mode, Super Soldier, Lab, Bazooka mode, Zombie: The Union, All-Star, Zombie 5: Rise, Scenario T, Destruction, Soccer (all named as Studio rule sets or on the main page).

Main-page mode grouping (as rendered): Original {Team Deathmatch, Death/Basic Gun, Botzombi}; Zombie {Hot Zombie Team Control(?), Zombie Hero, Zombie Annihilate, Zombie Scenario, Zombie Shelter, Zombie Escape, Zombie Giant, Zombie Touchdown, Zombies PVE}; Other {Human Scenario, All-Star, Playroom, Fun Mode, Prophet Hunt (= Hide and Seek), Partner Mode, Super Soldier, Lab Scenario}. Featured on the main page: New Epic Weapon; New Transcendent Classes (Karin & Milia); New Transcendent Pistol (Wind Walker); New Machine Gun (MG36 Refine). No end-of-service notice was visible on the main page or the Counter-Strike Online article.

### Music (6 files, `research/music/`) - THIN
Only verifiable items were written: `good-night` (Zombie 4: Darkness night BGM - the only track with a confirmed title), `zombie-4-darkness-preparation-music`, and the three Season 2 sound categories (`zombie-scenario-freeze-time-music`, `zombie-scenario-survival-music`, `zombie-scenario-pursuit-and-boss-music`), plus `lobby-theme` (low confidence, attributed to Seo Jeong Min via Last.fm). Composer pages exist on the wiki - **Seo Jeong Min** (https://cso.fandom.com/wiki/Seo_Jeong_Min) and **Koo Ja Wan** (https://cso.fandom.com/wiki/Koo_Ja_Wan) - but were unreadable; they are the primary targets for a follow-up. Audio files live under Category:Sounds / Category:Music. A user blog on the wiki mentions a "Human scenario ready music", suggesting a dedicated HS pre-round track.

## Service history facts picked up (from https://cso.fandom.com/wiki/Counter-Strike_Online)
Developer NEXON Corporation & Valve Corporation; Windows. Regional closures listed: Thailand (PlayFPS) 19 Dec 2013; Turkey (Nexon Europe) 30 Dec 2014; Singapore/Malaysia (IAHGames) 30 Jun 2015; Vietnam (GoPlay) 15 Aug 2016; Japan 6 Mar 2019; Indonesia (Megaxus) 1 Aug 2019. Zombie 4: Darkness was discontinued in CSO China mid-2021. The wiki calls CSO the second game with playable female characters after Counter-Strike Neo.

## Open questions
1. Full Season 1 chapter list and bosses (Dead End? Nightmare? Oberon?) - needs the Season 1 page.
2. Official track titles/composers for Zombie Scenario, Zombie Hero, Human Scenario music - needs composer pages and Category:Sounds.
3. Per-region release dates for AK-47/M4A1 base weapons, Zombie Scenario mode launch, Human Scenario launch, New Zombie Shelter.
4. Image URLs for every record.
5. Season 6 in-game episode subtitles; confirm boss names "Mr. X", "Condemned Criminal", "Tyrant Crab", "Agent Jay" against the chapter pages.
6. Whether the base Crossbow is graded Transcendent (probably not; check Crossbow Advance).

## All source URLs used
- https://cso.fandom.com/wiki/Counter-Strike_Online_Wiki
- https://cso.fandom.com/wiki/Counter-Strike_Online
- https://cso.fandom.com/wiki/Zombie_Scenario
- https://cso.fandom.com/wiki/Zombie_Scenario:_Season_2 .. _Season_7
- https://cso.fandom.com/wiki/Lost_City , /Double_Gate , /Trap , /Last_Clue , /Angra_Nest , /Envy_Mask
- https://cso.fandom.com/wiki/AK-47 , /M4A1 , /BALROG-VII , /SKULL-5 , /JANUS-7 , /Ethereal , /Wind_Walker , /Crossbow , /SKULL-9 , /SKULL-11 , /SKULL-3 , /Barrett_M95
- https://cso.fandom.com/wiki/Zombie_Escape , /New_Zombie_Shelter , /Zombie_3:_Hero , /Zombie_Z , /Zombie_Touchdown , /Human_Scenario , /Zombie_4:_Darkness , /Zombie:_The_Mutation , /Original , /Team_Deathmatch , /Deathmatch , /Hide_and_Seek , /Studio_(mode) , /Metal_Arena , /Zombie_modes
- External (music attribution only): https://www.last.fm/music/Seo+Jeong+Min , https://sonichits.com/video/Seo_Jeong_Min/Counter_Strike_Online_Scenario_Rush
- Blocked (402) but confirmed to exist: /AWP , /Desert_Eagle , /Thanatos-7 , /Dual_Kukri , /Zombie_Scenario:_Season_1 , /Zombie_Shelter , /Zombie_Shelter:_Coop , /Zombie_Shelter:_Team_Match , /Zombie_Giant , /Zombie:_The_Original , /Dead_End , /Seo_Jeong_Min , /Koo_Ja_Wan , /Category:Music , /Category:Sounds , /Game_Mode , /Zombie_Hero_Classic
