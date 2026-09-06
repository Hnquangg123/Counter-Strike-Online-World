import type {
  CharacterSeed,
  Grade,
  MapSeed,
  MediaInput,
  ScenarioSeed,
  WeaponCategory,
  WeaponSeed,
} from '@csow/schema'
import {
  en,
  integer,
  isoDate,
  listOf,
  parseReleases,
  pick,
  regionOf,
  slugify,
  statNumber,
} from './normalize'
import type { ImageInfo } from './wiki/client'
import type { ParsedPage } from './wiki/parse'

export type EntityKind = 'character' | 'weapon' | 'map' | 'scenario'

export type MappedEntity = {
  kind: EntityKind
  slug: string
  data: CharacterSeed | WeaponSeed | MapSeed | ScenarioSeed
  /** Infobox keys the mapper did not understand — review these to grow the alias tables. */
  unmapped: Record<string, string>
}

const GRADE_WORDS: [RegExp, Grade][] = [
  [/transcend/i, 'transcendent'],
  [/epic/i, 'epic'],
  [/unique/i, 'unique'],
  [/rare/i, 'rare'],
  [/common|normal|basic/i, 'common'],
]

export const gradeOf = (text: string | undefined): Grade =>
  text ? (GRADE_WORDS.find(([re]) => re.test(text))?.[1] ?? 'unknown') : 'unknown'

const CATEGORY_WORDS: [RegExp, WeaponCategory][] = [
  [/sniper/i, 'sniper-rifle'],
  [/sub-?machine|smg/i, 'submachine-gun'],
  [/machine ?gun|lmg|\bmg\b/i, 'machine-gun'],
  [/pistol|handgun|revolver|secondary/i, 'pistol'],
  [/shotgun/i, 'shotgun'],
  [/assault|rifle|carbine/i, 'assault-rifle'],
  [/melee|knife|sword|axe|blade|hammer|fist|katana|kukri/i, 'melee'],
  [/grenade|throw|bomb/i, 'grenade'],
  [/equipment|armor|armour|kit|shield|c4|defuser/i, 'equipment'],
  [/zombie/i, 'zombie'],
]

export const weaponCategoryOf = (
  text: string | undefined,
  categories: string[],
): WeaponCategory => {
  const haystack = `${text ?? ''} ${categories.join(' ')}`
  return CATEGORY_WORDS.find(([re]) => re.test(haystack))?.[1] ?? 'special'
}

const sideOf = (text: string | undefined) => {
  if (!text) return 'neutral' as const
  if (/counter-?terrorist|\bct\b/i.test(text)) return 'ct' as const
  if (/terrorist|\btr?\b/i.test(text)) return 'tr' as const
  if (/zombie|infected|undead/i.test(text)) return 'zombie' as const
  return 'neutral' as const
}

const kindOf = (box: Record<string, string>, categories: string[]) => {
  const hay = `${pick(box, 'category', 'type', 'class', 'role') ?? ''} ${categories.join(' ')}`
  if (/boss/i.test(hay)) return 'boss' as const
  if (/npc|non-playable/i.test(hay)) return 'npc' as const
  if (/zombie/i.test(hay)) return 'zombie' as const
  return 'human' as const
}

/**
 * Media kind from file name + caption, first match wins. Mirrors KIND_HINTS in
 * tools/research-to-seed.py — see docs/MEDIA_PIPELINE.md for what each wiki
 * file pattern looks like. The first image on a page is its infobox image.
 */
export const mediaKind = (
  file: string,
  caption: string | undefined,
  defaultKind: MediaInput['kind'],
  isInfobox = false,
): MediaInput['kind'] => {
  const text = `${file} ${caption ?? ''}`.toLowerCase()
  if (/\.(ogg|mp3|wav)$/i.test(file)) return 'audio'
  if (/\.(glb|gltf)$/i.test(file)) return 'model-3d'
  if (/icon\b|killmark|kill mark/.test(text)) return 'icon'
  if (/hud\b/.test(text)) return 'hud'
  // `_msg` files are the dialogue/message bust portraits.
  if (/portrait|infobox|_msg\b/.test(text)) return 'portrait'
  // Shop / player / in-game *model* captures (`_shopmodel`, `_ingamemdl`) — official renders, often on white (restore them).
  if (/shopmodel|playermodel|mdl\b/.test(text)) return 'render'
  // First-person view models and in-game captures have busy backgrounds → screenshot.
  if (/view ?model|\bv_[a-z0-9]+_|screenshot|in-?game|gameplay/.test(text)) return 'screenshot'
  if (/\bmodel\b|render/.test(text)) return 'render'
  if (/poster|concept|\bart\b|wallpaper|background|costume|drone|skill/.test(text)) return 'artwork'
  return isInfobox ? defaultKind : defaultKind === 'portrait' ? 'artwork' : defaultKind
}

const mediaFrom = (
  page: ParsedPage,
  images: ImageInfo[],
  defaultKind: MediaInput['kind'],
): MediaInput[] => {
  const byFile = new Map(images.map((i) => [i.file.toLowerCase(), i]))
  const seen = new Set<string>()
  const out: MediaInput[] = []
  for (const [index, img] of page.images.entries()) {
    const info = byFile.get(img.file.replace(/^File:/, '').toLowerCase())
    if (!info || seen.has(info.url)) continue
    seen.add(info.url)
    const caption = img.caption
    const kind = mediaKind(img.file, caption, defaultKind, index === 0)
    out.push({
      kind,
      src: info.url,
      caption: en(caption),
      credit: 'Counter-Strike Online Wiki / Nexon',
      sourceUrl: info.descriptionUrl,
    })
  }
  return out
}

const KNOWN_CHARACTER_KEYS = new Set(
  [
    'name',
    'image',
    'category',
    'gender',
    'race',
    'affiliation',
    'faction',
    'status',
    'sigweapon',
    'signatureweapon',
    'signatureprimary',
    'dateadded',
    'date',
    'release',
    'releasedate',
    'voiceactor',
    'voiceactors',
    'va',
    'age',
    'height',
    'weight',
    'birthplace',
    'nationality',
    'occupation',
    'bloodtype',
    'birthday',
    'grade',
    'class',
    'type',
    'role',
    'origin',
    'caption',
  ].map((k) => k.replace(/[\s_-]+/g, '')),
)

export function mapCharacter(page: ParsedPage, images: ImageInfo[], url: string): MappedEntity {
  const box = page.infobox
  const name = pick(box, 'name') ?? page.title
  const gradeText = `${pick(box, 'grade', 'category', 'class') ?? ''} ${page.categories.join(' ')}`
  const voice = pick(box, 'voiceactor', 'voiceactors', 'va')
  const release = parseReleases(pick(box, 'dateadded', 'release', 'releasedate', 'date'))

  const data: CharacterSeed = {
    slug: slugify(name),
    name,
    aliases: [],
    kind: kindOf(box, page.categories),
    side: sideOf(pick(box, 'faction', 'affiliation', 'category', 'team')),
    grade: gradeOf(gradeText),
    classType: pick(box, 'category', 'class', 'type'),
    factions: listOf(pick(box, 'affiliation', 'organization', 'organisation'))
      .map(slugify)
      .filter(Boolean),
    profile: {
      gender: pick(box, 'gender', 'sex'),
      age: pick(box, 'age'),
      height: pick(box, 'height'),
      weight: pick(box, 'weight'),
      birthplace: pick(box, 'birthplace', 'origin'),
      nationality: pick(box, 'nationality'),
      occupation: en(pick(box, 'occupation', 'job', 'role')),
      bloodType: pick(box, 'bloodtype'),
      birthday: pick(box, 'birthday', 'birth'),
    },
    tagline: undefined,
    summary: en(page.intro.split('\n')[0]?.slice(0, 400)),
    story: en(page.markdown),
    quotes: [],
    abilities: [],
    weapons: listOf(pick(box, 'sigweapon', 'signatureweapon', 'signatureprimary'))
      .map(slugify)
      .filter(Boolean),
    scenarios: [],
    gameModes: [],
    maps: [],
    relatedCharacters: [],
    voiceActors: listOf(voice)
      .map((line) => {
        const [maybeRegion, ...rest] = line.split(/[:–-]/)
        const region = maybeRegion && rest.length ? regionOf(maybeRegion) : undefined
        return region
          ? { region, name: rest.join('-').trim() }
          : { region: 'unknown', name: line.trim() }
      })
      .filter((v) => v.name),
    scenarioStats: {},
    costumes: [],
    release,
    trivia: (page.sections.find((s) => /trivia/i.test(s.title))?.text ?? '')
      .split('\n')
      .map((t) => t.replace(/^[-*•]\s*/, '').trim())
      .filter((t) => t.length > 8)
      .map((t) => ({ en: t })),
    media: mediaFrom(page, images, 'portrait'),
    wikiSource: { url, title: page.title, license: 'CC-BY-SA-3.0' },
    tags: [],
    featured: false,
  }
  const unmapped = Object.fromEntries(
    Object.entries(box).filter(([k]) => !KNOWN_CHARACTER_KEYS.has(k)),
  )
  return { kind: 'character', slug: data.slug, data, unmapped }
}

const KNOWN_WEAPON_KEYS = new Set(
  [
    'name',
    'image',
    'type',
    'category',
    'class',
    'origin',
    'country',
    'manufacturer',
    'caliber',
    'calibre',
    'ammo',
    'ammotype',
    'price',
    'cost',
    'damage',
    'accuracy',
    'recoil',
    'rateoffire',
    'firerate',
    'rof',
    'speed',
    'weight',
    'knockback',
    'stun',
    'magazine',
    'magsize',
    'clip',
    'reserve',
    'reserveammo',
    'ammoreserve',
    'firemode',
    'firemodes',
    'grade',
    'rarity',
    'date',
    'dateadded',
    'release',
    'releasedate',
    'obtain',
    'howtoobtain',
    'source',
    'system',
    'systemname',
    'caption',
    'variants',
    'user',
    'users',
  ].map((k) => k.replace(/[\s_-]+/g, '')),
)

export function mapWeapon(page: ParsedPage, images: ImageInfo[], url: string): MappedEntity {
  const box = page.infobox
  const name = pick(box, 'name') ?? page.title
  const statKeys = {
    damage: pick(box, 'damage'),
    accuracy: pick(box, 'accuracy'),
    recoil: pick(box, 'recoil'),
    rateOfFire: pick(box, 'rateoffire', 'firerate', 'rof'),
    weight: pick(box, 'weight', 'speed'),
    knockback: pick(box, 'knockback'),
    stun: pick(box, 'stun'),
  }
  const stats: Record<string, number> = {}
  const statNotes: Record<string, string> = {}
  for (const [k, v] of Object.entries(statKeys)) {
    const n = statNumber(v)
    if (n !== undefined) stats[k] = n
    if (v && n === undefined) statNotes[k] = v
  }
  const data: WeaponSeed = {
    slug: slugify(name),
    name,
    aliases: pick(box, 'systemname', 'system') ? [pick(box, 'systemname', 'system')!] : [],
    category: weaponCategoryOf(pick(box, 'type', 'category', 'class'), page.categories),
    grade: gradeOf(`${pick(box, 'grade', 'rarity') ?? ''} ${page.categories.join(' ')}`),
    origin: pick(box, 'origin', 'country'),
    manufacturer: pick(box, 'manufacturer'),
    caliber: pick(box, 'caliber', 'calibre'),
    tagline: undefined,
    summary: en(page.intro.split('\n')[0]?.slice(0, 400)),
    description: en(page.markdown),
    stats,
    statNotes,
    ammo: {
      magazine: integer(pick(box, 'magazine', 'magsize', 'clip')),
      reserve: integer(pick(box, 'reserve', 'reserveammo', 'ammoreserve')),
      type: pick(box, 'ammo', 'ammotype'),
    },
    price: integer(pick(box, 'price', 'cost')),
    fireModes: listOf(pick(box, 'firemode', 'firemodes')),
    obtainMethod: en(pick(box, 'obtain', 'howtoobtain', 'source')),
    variants: listOf(pick(box, 'variants')).map(slugify).filter(Boolean),
    characters: listOf(pick(box, 'user', 'users'))
      .map(slugify)
      .filter(Boolean),
    abilities: [],
    release: parseReleases(pick(box, 'dateadded', 'release', 'releasedate', 'date')),
    trivia: (page.sections.find((s) => /trivia/i.test(s.title))?.text ?? '')
      .split('\n')
      .map((t) => t.replace(/^[-*•]\s*/, '').trim())
      .filter((t) => t.length > 8)
      .map((t) => ({ en: t })),
    media: mediaFrom(page, images, 'render'),
    wikiSource: { url, title: page.title, license: 'CC-BY-SA-3.0' },
    tags: [],
    featured: false,
  }
  const unmapped = Object.fromEntries(
    Object.entries(box).filter(([k]) => !KNOWN_WEAPON_KEYS.has(k)),
  )
  return { kind: 'weapon', slug: data.slug, data, unmapped }
}

export function mapMap(page: ParsedPage, images: ImageInfo[], url: string): MappedEntity {
  const box = page.infobox
  const name = pick(box, 'name') ?? page.title
  const data: MapSeed = {
    slug: slugify(name),
    name,
    aliases: pick(box, 'filename', 'systemname', 'codename')
      ? [pick(box, 'filename', 'systemname', 'codename')!]
      : [],
    summary: en(page.intro.split('\n')[0]?.slice(0, 400)),
    description: en(page.markdown),
    gameModes: listOf(pick(box, 'mode', 'modes', 'gamemode'))
      .map(slugify)
      .filter(Boolean),
    location: pick(box, 'location', 'setting'),
    release: parseReleases(pick(box, 'dateadded', 'release', 'releasedate', 'date')),
    trivia: [],
    media: mediaFrom(page, images, 'screenshot'),
    wikiSource: { url, title: page.title, license: 'CC-BY-SA-3.0' },
    tags: [],
    featured: false,
  }
  return { kind: 'map', slug: data.slug, data, unmapped: {} }
}

export function mapScenario(page: ParsedPage, images: ImageInfo[], url: string): MappedEntity {
  const box = page.infobox
  const name = pick(box, 'name') ?? page.title
  const seasonText = pick(box, 'season') ?? page.categories.find((c) => /season/i.test(c))
  const chapterText = pick(box, 'chapter', 'episode')
  const story = page.sections.find((s) => /story|plot|background|synopsis/i.test(s.title))?.text
  const data: ScenarioSeed = {
    slug: slugify(name),
    name,
    aliases: pick(box, 'filename', 'systemname', 'codename')
      ? [pick(box, 'filename', 'systemname', 'codename')!]
      : [],
    gameMode: /human/i.test(page.categories.join(' ')) ? 'human-scenario' : 'zombie-scenario',
    season: seasonText ? `Season ${seasonText.match(/\d+/)?.[0] ?? seasonText}` : undefined,
    chapter: integer(chapterText),
    summary: en(page.intro.split('\n')[0]?.slice(0, 400)),
    story: en(story ?? page.markdown),
    objectives: [],
    bosses: listOf(pick(box, 'boss', 'bosses'))
      .map(slugify)
      .filter(Boolean),
    characters: [],
    maps: [slugify(name)],
    difficulties: [],
    rewards: [],
    release: parseReleases(pick(box, 'dateadded', 'release', 'releasedate', 'date')),
    trivia: [],
    media: mediaFrom(page, images, 'screenshot'),
    wikiSource: { url, title: page.title, license: 'CC-BY-SA-3.0' },
    tags: [],
    featured: false,
  }
  return { kind: 'scenario', slug: data.slug, data, unmapped: {} }
}

export const MAPPERS: Record<
  EntityKind,
  (page: ParsedPage, images: ImageInfo[], url: string) => MappedEntity
> = {
  character: mapCharacter,
  weapon: mapWeapon,
  map: mapMap,
  scenario: mapScenario,
}

/** Sensible default wiki categories for each entity kind. */
export const DEFAULT_CATEGORIES: Record<EntityKind, string[]> = {
  character: ['Characters'],
  weapon: ['Weapons'],
  map: ['Maps'],
  scenario: ['Zombie Scenario maps', 'Zombie Scenario'],
}

export { isoDate }
