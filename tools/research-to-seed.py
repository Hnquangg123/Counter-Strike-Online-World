#!/usr/bin/env python3
"""
Convert the raw wiki research under data/research/ into the seed bundle under
data/seed/ (the shape defined by @csow/schema SeedBundle).

Run:  python3 tools/research-to-seed.py
Then: pnpm seed

The research files were gathered from the Counter-Strike Online Wiki
(cso.fandom.com, CC BY-SA 3.0). Every record keeps its wikiUrl for attribution.
"""
from __future__ import annotations

import glob
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "data" / "research"
SEED = ROOT / "data" / "seed"
SEED.mkdir(parents=True, exist_ok=True)

REGIONS = {"kr", "cn", "tw", "jp", "id", "vn", "sg", "th", "tr", "ru", "csn"}
GRADES = {"common", "rare", "unique", "epic", "transcendent"}
DIFFICULTIES = {"easy", "normal", "hard", "very-hard", "nightmare"}
FEATURED_CHARACTERS = ["anemone", "mirage", "david-black", "choi-ji-yoon", "dione", "karin"]
FEATURED_WEAPONS = ["ak-47", "m2hb-devastator", "wind-walker", "balrog-vii", "janus-7", "skull-5", "ethereal", "crossbow"]
FEATURED_MODES = ["zombie-scenario", "zombie-shelter", "original", "zombie-4-darkness"]
FEATURED_SCENARIOS = ["lost-city", "angra-nest", "envy-mask"]


def slugify(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = value.replace("đ", "d").replace("Đ", "D").lower()
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value


def base_name(value: str) -> str:
    """'Mirage (Character) - twin sister' -> 'Mirage'."""
    return re.split(r"\s+[-–—]\s+|\s*\(", value, maxsplit=1)[0].strip()


def L(text):
    """Wrap English text as LocalizedText."""
    if text is None:
        return None
    text = str(text).strip()
    return {"en": text} if text else None


def load_dir(name: str) -> list[dict]:
    items = []
    for path in sorted(glob.glob(str(RESEARCH / name / "*.json"))):
        if Path(path).name.startswith("_"):
            continue
        with open(path, encoding="utf-8") as fh:
            items.append(json.load(fh))
    return items


def release(items) -> list[dict]:
    out = []
    for r in items or []:
        region = (r.get("region") or "").lower()
        if region not in REGIONS:
            continue
        date = r.get("date")
        if date and not re.match(r"^\d{4}(-\d{2}(-\d{2})?)?$", str(date)):
            date = None
        out.append({"region": region, **({"date": date} if date else {}), **({"note": r["note"]} if r.get("note") else {})})
    return out


KIND_HINTS = [
    ("icon", r"icon\b|killmark|kill mark"),
    ("hud", r"hud\b"),
    ("portrait", r"portrait|infobox|_msg\b"),
    # shop / player / in-game *model* captures (_shopmodel, _ingamemdl): official renders, often on white (see MEDIA_PIPELINE.md)
    ("render", r"shopmodel|playermodel|mdl\b"),
    # first-person view models and in-game captures are screenshots (busy backgrounds)
    ("screenshot", r"view ?model|viewmodel|v_[a-z0-9]+_|screenshot|in-?game|gameplay"),
    ("render", r"\bmodel\b|render"),
    ("artwork", r"poster|concept|art|background|costume|drone|skill"),
]


def media_kind(caption: str, url: str, default: str = "artwork") -> str:
    text = f"{caption or ''} {url}".lower()
    for kind, pattern in KIND_HINTS:
        if re.search(pattern, text):
            return kind
    return default


def remote_media(images, audio=None, default_kind: str = "artwork") -> list[dict]:
    """Wiki images → remote media entries. `default_kind` is what an unhinted image is:
    artwork for characters/world pages, render for weapons (their infobox image is the side-profile render)."""
    out, seen = [], set()
    for img in images or []:
        url = (img.get("url") or "").strip()
        if not url or url in seen or not url.startswith("http"):
            continue
        seen.add(url)
        caption = img.get("caption")
        out.append({"kind": media_kind(caption, url, default_kind), "src": url, **({"caption": L(caption)} if caption else {}), "credit": "Counter-Strike Online Wiki / Nexon"})
    for a in audio or []:
        url = (a.get("url") or "").strip()
        if not url or url in seen:
            continue
        seen.add(url)
        out.append({"kind": "audio", "src": url, **({"caption": L(a.get("caption"))} if a.get("caption") else {}), "credit": "Nexon (voice line)"})
    return out


def stat_number(value):
    """'83%' -> 83; '28 (Normal) / 40-47 (Zombie)' -> 28; 'High' -> None; values > 100 -> None."""
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return value if 0 <= value <= 100 else None
    m = re.match(r"^\s*(\d+(?:\.\d+)?)\s*%?", str(value))
    if not m:
        return None
    n = float(m.group(1))
    return int(n) if n.is_integer() and 0 <= n <= 100 else (n if 0 <= n <= 100 else None)


def wiki_source(url, title):
    return {"url": url, "title": title, "license": "CC-BY-SA-3.0"} if url else None


# ─────────────────────────────── Load research ───────────────────────────────
characters_raw = load_dir("characters")
factions_raw = load_dir("factions")
weapons_raw = load_dir("weapons")
scenarios_raw = load_dir("scenarios")
modes_raw = load_dir("game-modes")
music_raw = load_dir("music")
with open(RESEARCH / "scenarios" / "_index.json", encoding="utf-8") as fh:
    scenario_index = json.load(fh)

character_slugs = {c["slug"] for c in characters_raw}
character_by_name = {c["name"].lower(): c["slug"] for c in characters_raw}
for c in characters_raw:
    for alias in c.get("aliases") or []:
        character_by_name.setdefault(base_name(alias).lower(), c["slug"])
character_by_name.update({"prototype phobos": "phobos", "siege type phobos": "phobos", "dr. steve rex": "dr-rex", "steve rex": "dr-rex", "rex": "dr-rex"})
faction_slugs = {f["slug"] for f in factions_raw}
faction_by_name = {f["name"].lower(): f["slug"] for f in factions_raw}
for f in factions_raw:
    for alias in f.get("aliases") or []:
        faction_by_name.setdefault(base_name(alias).lower(), f["slug"])
weapon_slugs = {w["slug"] for w in weapons_raw} | {"m2hb-devastator"}
weapon_by_name = {w["name"].lower(): w["slug"] for w in weapons_raw}
weapon_by_name.update({"m2 devastator": "m2hb-devastator", "m2hb devastator": "m2hb-devastator"})
mode_slugs = {m["slug"] for m in modes_raw}
mode_by_name = {m["name"].lower(): m["slug"] for m in modes_raw}
for m in modes_raw:
    for alias in m.get("aliases") or []:
        mode_by_name.setdefault(alias.lower(), m["slug"])
mode_by_name.update({"zombie scenario": "zombie-scenario", "zombie z": "zombie-z", "original / general modes (terrorist team)": "original", "original mode": "original", "zombie mode": "zombie-the-mutation", "zombie 4: darkness": "zombie-4-darkness", "new zombie shelter": "zombie-shelter", "zombie shelter": "zombie-shelter"})

scenario_slugs = set()
for season in scenario_index["seasons"]:
    for ch in season["chapters"]:
        scenario_slugs.add(slugify(ch))
scenario_by_name = {}
for season in scenario_index["seasons"]:
    for ch in season["chapters"]:
        scenario_by_name[ch.lower()] = slugify(ch)


def lookup(name: str, table: dict, valid: set) -> str | None:
    if not name:
        return None
    for candidate in (name, base_name(name)):
        key = candidate.lower().strip()
        if key in table and table[key] in valid:
            return table[key]
        slug = slugify(candidate)
        if slug in valid:
            return slug
    return None


def lookup_many(names, table, valid) -> list[str]:
    out = []
    for n in names or []:
        s = lookup(n, table, valid)
        if s and s not in out:
            out.append(s)
    return out


maps: dict[str, dict] = {}


def map_slug(name: str) -> str | None:
    name = re.sub(r"\s*\((?:zm|zs|de|cs|zsh)_[^)]*\)", "", name).strip()
    if not name:
        return None
    slug = slugify(name)
    if slug not in maps:
        maps[slug] = {"slug": slug, "name": name, "gameModes": [], "featured": False}
    return slug


# ─────────────────────────────── Factions ────────────────────────────────────
factions = []
for f in factions_raw:
    side = f.get("side") if f.get("side") in {"ct", "tr", "zombie", "neutral"} else "neutral"
    lore = f.get("lore") or ""
    if f.get("sideNote"):
        lore = f"{lore}\n\n**Position.** {f['sideNote']}".strip()
    products = f.get("products", {}).get("series") if isinstance(f.get("products"), dict) else None
    if products:
        lines = ["", "## Weapon programmes", ""]
        for s in products:
            members = ", ".join(s.get("members", []))
            lines.append(f"- **{s.get('name')}** — {s.get('gimmick') or ''} {('(' + members + ')') if members else ''}".rstrip())
        lore = (lore + "\n" + "\n".join(lines)).strip()
    factions.append({
        "slug": f["slug"], "name": f["name"], "aliases": f.get("aliases") or [], "side": side,
        "tagline": L(f.get("tagline")), "summary": L(f.get("summary")),
        "description": L(f.get("description")), "lore": L(lore),
        "leaders": lookup_many(f.get("leaders"), character_by_name, character_slugs),
        "members": lookup_many(f.get("members"), character_by_name, character_slugs),
        "media": remote_media(f.get("images")),
        "wikiSource": wiki_source(f.get("wikiUrl"), f["name"]),
        "featured": f["slug"] in {"aegis-institute", "vanguard-company", "rex-research-institute", "kronos"},
        "tags": [], "release": [], "trivia": [],
    })

# ─────────────────────────────── Game modes ──────────────────────────────────
modes = []
for m in modes_raw:
    mp = m.get("maxPlayers")
    max_players = None
    if isinstance(mp, int):
        max_players = mp
    elif isinstance(mp, str):
        nums = re.findall(r"\d+", mp)
        max_players = int(nums[-1]) if nums else None
    lore = m.get("lore")
    if lore and lore.lower().startswith("no dedicated story"):
        lore = None
    rules = [L(r) for r in (m.get("rules") or []) if r]
    trivia = [L(t) for t in (m.get("trivia") or []) if t]
    if isinstance(mp, str) and not mp.strip().isdigit():
        trivia.insert(0, L(f"Player count: {mp}."))
    modes.append({
        "slug": m["slug"], "name": m["name"], "aliases": m.get("aliases") or [], "family": m["family"],
        "tagline": L(m.get("tagline")), "summary": L(m.get("summary")),
        "description": L(m.get("description")), "lore": L(lore), "rules": rules,
        **({"maxPlayers": max_players} if max_players else {}),
        "release": release(m.get("release")), "trivia": trivia,
        "media": remote_media(m.get("images")),
        "wikiSource": wiki_source(m.get("wikiUrl"), m["name"]),
        "featured": m["slug"] in FEATURED_MODES, "tags": [],
    })

# ─────────────────────────────── Weapons ─────────────────────────────────────
weapons = []
for w in weapons_raw:
    stats, notes = {}, {}
    for key, value in (w.get("stats") or {}).items():
        n = stat_number(value)
        if n is not None:
            stats[key] = n
        if isinstance(value, str) and value.strip():
            notes[key] = value.strip()
    desc = w.get("description") or ""
    if w.get("advantages"):
        desc += "\n\n## Advantages\n\n" + "\n".join(f"- {a}" for a in w["advantages"])
    if w.get("disadvantages"):
        desc += "\n\n## Disadvantages\n\n" + "\n".join(f"- {a}" for a in w["disadvantages"])
    ammo = {k: v for k, v in (w.get("ammo") or {}).items() if v is not None}
    for k in ("magazine", "reserve"):
        if k in ammo and not isinstance(ammo[k], int):
            nums = re.findall(r"\d+", str(ammo[k]))
            ammo[k] = int(nums[0]) if nums else None
            if ammo[k] is None:
                del ammo[k]
    price = w.get("price")
    if isinstance(price, str):
        nums = re.findall(r"\d[\d,]*", price)
        price = int(nums[0].replace(",", "")) if nums else None
    weapons.append({
        "slug": w["slug"], "name": w["name"], "aliases": w.get("aliases") or [],
        "category": w["category"], "grade": w.get("grade") if w.get("grade") in GRADES else "unknown",
        **({"origin": w["origin"]} if w.get("origin") else {}),
        **({"manufacturer": w["manufacturer"]} if w.get("manufacturer") else {}),
        **({"caliber": w["caliber"]} if w.get("caliber") else {}),
        "tagline": L(w.get("tagline")), "summary": L(w.get("summary")), "description": L(desc),
        "stats": stats, "statNotes": notes, "ammo": ammo,
        **({"price": price} if isinstance(price, int) else {}),
        "fireModes": [f for f in (w.get("fireModes") or []) if f],
        "obtainMethod": L(w.get("obtainMethod")),
        "variants": lookup_many(w.get("variants"), weapon_by_name, weapon_slugs - {w["slug"]}),
        "characters": lookup_many(w.get("characters"), character_by_name, character_slugs),
        "abilities": [{"name": L(a["name"]), "description": L(a.get("description"))} for a in (w.get("abilities") or []) if a.get("name")],
        "release": release(w.get("release")),
        "trivia": [L(t) for t in (w.get("trivia") or []) if t],
        "media": remote_media(w.get("images"), default_kind="render"),
        "wikiSource": wiki_source(w.get("wikiUrl"), w["name"]),
        "featured": w["slug"] in FEATURED_WEAPONS, "tags": [],
    })

# Anemone's signature weapon, captured on her page.
anemone = next(c for c in characters_raw if c["slug"] == "anemone")
sig = anemone.get("signatureWeaponDetail")
if sig:
    weapons.append({
        "slug": "m2hb-devastator", "name": sig["name"], "aliases": ["M2 Devastator", "Buff M2"],
        "category": "machine-gun", "grade": "transcendent", "origin": "United States",
        "tagline": L("Anemone's incendiary .50 cal, fed from a backpack reservoir and finished with a missile barrage."),
        "summary": L(sig["summary"]),
        "description": L(sig["summary"] + "\n\nIt is the pairing weapon of the 2021 Season 2 Transcendence class Anemone; a Mirage-themed view-model skin also exists."),
        "stats": {}, "statNotes": {}, "ammo": {"type": ".50 BMG (incendiary)"}, "fireModes": ["Automatic", "Missile launcher (gauge)"],
        "variants": [], "characters": ["anemone", "mirage"], "abilities": [
            {"name": L("Penetrating missile launcher"), "description": L("Once the gauge fills, launches missiles that pull enemies in.")},
            {"name": L("Unlimited reserve ammo"), "description": L("Reserve ammunition is unlimited in Scenario mode.")},
        ],
        "release": release(sig.get("release")), "trivia": [],
        "media": remote_media(sig.get("images"), default_kind="render"),
        "wikiSource": wiki_source(sig.get("wikiUrl"), sig["name"]),
        "featured": True, "tags": [],
    })

# ─────────────────────────────── Characters ──────────────────────────────────
characters = []
for c in characters_raw:
    profile = {k: v for k, v in (c.get("profile") or {}).items() if v and k in {"gender", "age", "height", "weight", "birthplace", "nationality", "bloodType", "birthday"}}
    if c.get("profile", {}).get("occupation"):
        profile["occupation"] = L(c["profile"]["occupation"])
    story = c.get("story") or ""
    if c.get("personality"):
        story += f"\n\n## Personality\n\n{c['personality']}"
    zs = c.get("zombieScenarioStats") or {}
    scenario_stats = {}
    for k, v in zs.items():
        m = re.match(r"^\s*(\d+)\s*/\s*(\d+)", str(v))
        if m:
            scenario_stats[k] = int(m.group(1))
    costumes = [{"name": L(k["name"]), "description": L(k.get("description")), **({"imageUrl": k["image"]} if k.get("image") else {})} for k in (c.get("costumes") or []) if k.get("name")]
    for v in c.get("variants") or []:
        img = next((i["url"] for i in v.get("images", []) if i.get("url")), None)
        costumes.append({"name": L(f"{v['name']} (variant)"), "description": L(v.get("note")), **({"imageUrl": img} if img else {})})
    weapons_for = lookup_many(c.get("weapons"), weapon_by_name, weapon_slugs)
    signature = weapons_for[0] if c["slug"] in {"anemone", "mirage"} and "m2hb-devastator" in weapons_for else None
    appearances = c.get("appearances") or {}
    characters.append({
        "slug": c["slug"], "name": c["name"], "aliases": c.get("aliases") or [],
        "kind": c.get("kind") or "human", "side": c.get("side") or "neutral",
        "grade": c.get("grade") if c.get("grade") in GRADES else "unknown",
        **({"classType": c["classType"]} if c.get("classType") else {}),
        "factions": lookup_many(c.get("factions"), faction_by_name, faction_slugs),
        "profile": profile,
        "tagline": L(c.get("tagline")), "summary": L(c.get("summary")), "story": L(story),
        "quotes": [{"text": L(q["text"]), **({"context": L(q["context"])} if q.get("context") else {})} for q in (c.get("quotes") or []) if q.get("text")],
        "abilities": [{"name": L(a["name"]), "description": L(a.get("description"))} for a in (c.get("abilities") or []) if a.get("name")],
        "scenarioStats": scenario_stats, "costumes": costumes,
        **({"signatureWeapon": signature} if signature else {}),
        "weapons": weapons_for,
        "scenarios": lookup_many(appearances.get("scenarios"), scenario_by_name, scenario_slugs),
        "gameModes": lookup_many(appearances.get("gameModes"), mode_by_name, mode_slugs),
        "maps": [s for s in (map_slug(n) for n in appearances.get("maps") or []) if s],
        "relatedCharacters": lookup_many(c.get("relatedCharacters"), character_by_name, character_slugs - {c["slug"]}),
        "voiceActors": [{"region": v["region"], "name": v["name"]} for v in (c.get("voiceActors") or []) if v.get("name")],
        "release": release(c.get("release")),
        "trivia": [L(t) for t in (c.get("trivia") or []) if t],
        "media": remote_media(c.get("images"), c.get("audio")),
        "wikiSource": wiki_source(c.get("wikiUrl"), c["name"]),
        "featured": c["slug"] in FEATURED_CHARACTERS, "tags": [],
    })

# ─────────────────────────────── Scenarios ───────────────────────────────────
detailed = {s["slug"]: s for s in scenarios_raw}
scenarios = []
season_story = {s["season"]: s.get("story") for s in scenario_index["seasons"]}
for season in scenario_index["seasons"]:
    chapters = season["chapters"]
    details = {d["name"]: d for d in season.get("chapterDetails", [])}
    for i, name in enumerate(chapters):
        slug = slugify(name)
        d = detailed.get(slug)
        info = details.get(name, {})
        next_slug = slugify(chapters[i + 1]) if i + 1 < len(chapters) else None
        boss_names = (d.get("bosses") if d else None) or ([info["boss"]] if info.get("boss") else [])
        entry = {
            "slug": slug, "name": name, "aliases": ([info["codename"]] if info.get("codename") else []) + ((d or {}).get("aliases") or []),
            "gameMode": "zombie-scenario", "season": season["season"], "chapter": i + 1,
            "tagline": L((d or {}).get("tagline") or info.get("style")),
            "summary": L((d or {}).get("summary") or season_story.get(season["season"])),
            "story": L((d or {}).get("story")),
            "objectives": [L(o) for o in ((d or {}).get("objectives") or []) if o],
            "bosses": lookup_many(boss_names, character_by_name, character_slugs),
            "characters": lookup_many((d or {}).get("characters"), character_by_name, character_slugs),
            "maps": [s for s in (map_slug(n) for n in ((d or {}).get("maps") or [name])) if s],
            "difficulties": [x for x in ((d or {}).get("difficulties") or []) if x in DIFFICULTIES],
            "rewards": [L(r) for r in ((d or {}).get("rewards") or []) if r],
            **({"nextChapter": next_slug} if next_slug else {}),
            "release": release((d or {}).get("release")),
            "trivia": [L(t) for t in ((d or {}).get("trivia") or []) if t] + ([L(f"Unlisted bosses on the wiki: {', '.join(b for b in boss_names if not lookup(b, character_by_name, character_slugs))}.")] if any(not lookup(b, character_by_name, character_slugs) for b in boss_names) else []),
            "media": remote_media((d or {}).get("images")),
            "wikiSource": wiki_source((d or {}).get("wikiUrl") or f"https://cso.fandom.com/wiki/{name.replace(' ', '_')}", name),
            "featured": slug in FEATURED_SCENARIOS, "tags": [],
        }
        for ms in entry["maps"]:
            maps[ms]["scenario"] = slug
            if "zombie-scenario" not in maps[ms]["gameModes"]:
                maps[ms]["gameModes"].append("zombie-scenario")
        scenarios.append(entry)

# ─────────────────────────────── Music ───────────────────────────────────────
music = []
for m in music_raw:
    used = m.get("usedIn") or {}
    music.append({
        "slug": m["slug"], "name": m["title"], "title": m["title"], "aliases": [],
        **({"composer": m["composer"]} if m.get("composer") else {}),
        **({"album": m["album"]} if m.get("album") else {}),
        **({"durationSeconds": m["durationSeconds"]} if isinstance(m.get("durationSeconds"), int) else {}),
        "tagline": L(m.get("tagline")), "summary": L(m.get("summary")), "description": L(m.get("description")),
        "usedIn": {
            "gameModes": lookup_many(used.get("gameModes"), mode_by_name, mode_slugs),
            "scenarios": lookup_many(used.get("scenarios"), scenario_by_name, scenario_slugs),
            "maps": [s for s in (map_slug(n) for n in used.get("maps") or []) if s],
        },
        **({"audio": m["audioUrl"]} if m.get("audioUrl") else {}),
        "media": remote_media(m.get("images")),
        "wikiSource": wiki_source(m.get("wikiUrl"), m["title"]),
        "featured": False, "tags": [], "release": [], "trivia": [],
    })

# ─────────────────────────────── Storyline ───────────────────────────────────
md = (RESEARCH / "lore" / "storyline.md").read_text(encoding="utf-8")
sections = re.split(r"^## ", md, flags=re.M)[1:]
eras = []
for sec in sections:
    title_line, _, body = sec.partition("\n")
    m = re.match(r"^(\d+)\.\s+(.*)$", title_line.strip())
    if not m:
        continue
    num, title = int(m.group(1)), m.group(2).strip()
    if title.lower().startswith(("cast of the saga", "source list")):
        continue
    sources = re.findall(r"https?://cso\.fandom\.com/\S+", body)
    body_clean = re.sub(r"^Sources?:.*$(?:\n\s*https?://\S+.*$)*", "", body, flags=re.M).strip()
    body_clean = re.sub(r"\n{3,}", "\n\n", body_clean)
    period = None
    pm = re.search(r"Season (\d+)", title)
    if pm:
        period = f"Zombie Scenario · Season {pm.group(1)}"
    elif "Origin" in title:
        period = "Prologue"
    elif "Setting" in title:
        period = "Foundations"
    main_title, _, subtitle = title.partition(" - ")
    subtitle = re.sub(r"\s*\([^)]*\)\s*$", "", subtitle).strip()
    body_lower = body_clean.lower()
    era_chars = [c["slug"] for c in characters if c["name"].lower() in body_lower or c["slug"].replace("-", " ") in body_lower]
    chap_names = re.findall(r"\(([^)]*)\)\s*$", title)
    era_scen = []
    if chap_names:
        for n in re.split(r",|;", chap_names[0]):
            n = n.replace("extra:", "").strip()
            s = scenario_by_name.get(n.lower())
            if s and s not in era_scen:
                era_scen.append(s)
    era_factions = [f["slug"] for f in factions if f["name"].lower() in body_lower]
    eras.append({
        "title": L(main_title.strip()), "subtitle": L(subtitle) if subtitle else None, "period": period,
        "body": L(body_clean), "characters": era_chars[:8], "scenarios": era_scen, "factions": era_factions[:4],
        "sources": list(dict.fromkeys(s.rstrip(",.") for s in sources)),
    })

storyline = {
    "title": L("The Story of the World"),
    "intro": L("From Dr. Rex's Super Soldier Project to the fall of Kronos: the complete arc of Counter-Strike Online's zombie saga, season by season, adapted from the wiki's storyline sections."),
    "eras": eras,
}

# ─────────────────────────────── Write ───────────────────────────────────────
def strip_none(value):
    """Drop None values so optional schema fields are simply absent."""
    if isinstance(value, dict):
        return {k: strip_none(v) for k, v in value.items() if v is not None}
    if isinstance(value, list):
        return [strip_none(v) for v in value if v is not None]
    return value


maps_list = sorted(maps.values(), key=lambda m: m["slug"])
bundle = {
    "factions": factions, "gameModes": modes, "maps": maps_list, "characters": characters,
    "weapons": weapons, "scenarios": scenarios, "music": music,
}
for key, items in bundle.items():
    fname = {"gameModes": "game-modes"}.get(key, key)
    (SEED / f"{fname}.json").write_text(json.dumps(strip_none(items), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
(SEED / "storyline.json").write_text(json.dumps(strip_none(storyline), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

print("seed written:", {k: len(v) for k, v in bundle.items()}, "eras:", len(eras))
