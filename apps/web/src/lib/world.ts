import type {
  CharacterPublic,
  EntityRef,
  FactionPublic,
  GameModePublic,
  Locale,
  MapPublic,
  MusicPublic,
  PageMeta,
  ScenarioPublic,
  SearchHit,
  WeaponPublic,
} from '@csow/schema'
import type { CollectionSlug, Where } from 'payload'
import type {
  Character,
  Faction,
  Map as GameMap,
  GameMode,
  Music,
  Scenario,
  Tag,
  Weapon,
} from '@/payload-types'
import { type EntityType, entityHref } from './href'
import { audioOf, galleryOf, heroOf, mediaRef, srcFor } from './media'
import { getPayloadClient } from './payload'
import { richTextToMarkdown } from './richtext'
import { populated, populatedMany } from './utils'

/* -------------------------------------------------------------------------- */
/*  Listing                                                                    */
/* -------------------------------------------------------------------------- */

export type ListArgs = {
  locale: Locale
  page?: number
  limit?: number
  sort?: string
  where?: Where
  depth?: number
}

export type ListResult<T> = { docs: T[]; meta: PageMeta }

const toMeta = (r: {
  page?: number
  limit: number
  totalDocs: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}): PageMeta => ({
  page: r.page ?? 1,
  limit: r.limit,
  totalItems: r.totalDocs,
  totalPages: r.totalPages,
  hasNextPage: r.hasNextPage,
  hasPrevPage: r.hasPrevPage,
})

type DocOf = {
  characters: Character
  weapons: Weapon
  scenarios: Scenario
  'game-modes': GameMode
  maps: GameMap
  factions: Faction
  music: Music
}

const DEFAULT_SORT: Record<EntityType, string> = {
  characters: 'name',
  weapons: 'name',
  scenarios: 'chapter',
  'game-modes': 'name',
  maps: 'name',
  factions: 'name',
  music: 'title',
}

export async function listEntities<T extends EntityType>(
  type: T,
  { locale, page = 1, limit = 24, sort, where, depth = 1 }: ListArgs,
): Promise<ListResult<DocOf[T]>> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: type as CollectionSlug,
    locale,
    fallbackLocale: 'en',
    depth,
    page,
    limit,
    sort: sort ?? DEFAULT_SORT[type],
    where,
    overrideAccess: false,
  })
  return { docs: result.docs as unknown as DocOf[T][], meta: toMeta(result) }
}

export async function getEntityBySlug<T extends EntityType>(
  type: T,
  slug: string,
  locale: Locale,
  depth = 1,
): Promise<DocOf[T] | null> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: type as CollectionSlug,
    locale,
    fallbackLocale: 'en',
    depth,
    limit: 1,
    where: { slug: { equals: slug } },
    overrideAccess: false,
  })
  return (result.docs[0] as unknown as DocOf[T]) ?? null
}

export async function listAllSlugs(type: EntityType): Promise<string[]> {
  const payload = await getPayloadClient()
  const result = await payload.find({
    collection: type as CollectionSlug,
    depth: 0,
    limit: 1000,
    pagination: false,
    select: { slug: true },
    overrideAccess: false,
  })
  return result.docs.map((d) => (d as { slug: string }).slug)
}

/* -------------------------------------------------------------------------- */
/*  Globals                                                                    */
/* -------------------------------------------------------------------------- */

export async function getSiteSettings(locale: Locale) {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug: 'site-settings', locale, fallbackLocale: 'en', depth: 0 })
}

export async function getHomepage(locale: Locale) {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug: 'homepage', locale, fallbackLocale: 'en', depth: 1 })
}

export async function getStoryline(locale: Locale) {
  const payload = await getPayloadClient()
  return payload.findGlobal({ slug: 'storyline', locale, fallbackLocale: 'en', depth: 1 })
}

/* -------------------------------------------------------------------------- */
/*  Search                                                                     */
/* -------------------------------------------------------------------------- */

const SEARCHABLE: EntityType[] = [
  'characters',
  'weapons',
  'scenarios',
  'game-modes',
  'maps',
  'factions',
  'music',
]

export async function searchWorld({
  q,
  locale,
  limit = 10,
  types,
}: {
  q: string
  locale: Locale
  limit?: number
  types?: EntityType[]
}): Promise<SearchHit[]> {
  const payload = await getPayloadClient()
  const targets = (types?.length ? types : SEARCHABLE).filter((t) => SEARCHABLE.includes(t))
  const perType = Math.max(2, Math.ceil(limit / targets.length))
  const needle = q.trim()

  const results = await Promise.all(
    targets.map(async (type) => {
      const nameField = type === 'music' ? 'title' : 'name'
      const res = await payload.find({
        collection: type as CollectionSlug,
        locale,
        fallbackLocale: 'en',
        depth: 1,
        limit: perType,
        overrideAccess: false,
        where: {
          or: [
            { [nameField]: { like: needle } },
            { slug: { like: needle.toLowerCase().replace(/\s+/g, '-') } },
            ...(type === 'music' ? [] : [{ 'aliases.alias': { like: needle } }]),
            { tagline: { like: needle } },
            { summary: { like: needle } },
          ],
        },
      })
      return res.docs.map((doc): SearchHit => {
        const d = doc as unknown as Character & Music
        const name = (type === 'music' ? d.title : d.localizedName || d.name) ?? d.name
        const exact = name.toLowerCase() === needle.toLowerCase()
        const starts = name.toLowerCase().startsWith(needle.toLowerCase())
        return {
          type,
          slug: d.slug,
          name,
          summary: d.summary ?? d.tagline ?? null,
          href: entityHref(type, d.slug, locale),
          image: srcFor(heroOf(d), 'thumbnail'),
          score: exact ? 3 : starts ? 2 : 1,
        }
      })
    }),
  )

  return results
    .flat()
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.name.localeCompare(b.name))
    .slice(0, limit)
}

/* -------------------------------------------------------------------------- */
/*  Mappers → public DTOs                                                      */
/* -------------------------------------------------------------------------- */

type AnyDoc = {
  id: number
  slug: string
  name?: string
  title?: string
  localizedName?: string | null
}

const ref =
  (type: EntityType, locale: Locale) =>
  (value: AnyDoc | number | null | undefined): EntityRef | null => {
    const doc = populated(value as AnyDoc | number | null)
    if (!doc) return null
    const name = doc.localizedName || doc.name || doc.title || doc.slug
    return { slug: doc.slug, name, href: entityHref(type, doc.slug, locale) }
  }

const refs = (
  type: EntityType,
  locale: Locale,
  values: (AnyDoc | number)[] | null | undefined,
): EntityRef[] =>
  populatedMany(values as (AnyDoc | number)[])
    .map((d) => ref(type, locale)(d))
    .filter((r): r is EntityRef => Boolean(r))

const tagNames = (tags: (number | Tag)[] | null | undefined) =>
  populatedMany(tags).map((t) => t.name)

const wikiSource = (doc: {
  wikiSource?: {
    url?: string | null
    title?: string | null
    revisionId?: number | null
    fetchedAt?: string | null
    license?: 'CC-BY-SA-3.0' | null
  }
}) =>
  doc.wikiSource?.url
    ? {
        url: doc.wikiSource.url,
        title: doc.wikiSource.title ?? undefined,
        revisionId: doc.wikiSource.revisionId ?? undefined,
        fetchedAt: doc.wikiSource.fetchedAt ?? undefined,
        license: 'CC-BY-SA-3.0' as const,
      }
    : null

type BaseDoc = Character | Weapon | Scenario | GameMode | GameMap | Faction | Music

const base = (type: EntityType, doc: BaseDoc, locale: Locale) => {
  const d = doc as Character & Music
  const name = (type === 'music' ? d.title : d.localizedName || d.name) ?? d.name
  return {
    id: String(doc.id),
    slug: doc.slug,
    name,
    aliases: (d.aliases ?? []).map((a) => a.alias),
    tagline: d.tagline ?? null,
    summary: d.summary ?? null,
    tags: tagNames(d.tags),
    release: (d.release ?? []).map((r) => ({
      region: r.region,
      date: r.date ?? undefined,
      note: r.note ?? undefined,
    })),
    trivia: (d.trivia ?? []).map((t) => t.text),
    heroImage: heroOf(d),
    gallery: galleryOf(d),
    accentColor: d.accentColor ?? null,
    featured: Boolean(d.featured),
    wikiSource: wikiSource(d),
    href: entityHref(type, doc.slug, locale),
    locale,
    updatedAt: doc.updatedAt,
  }
}

const named = (items: { name: string; description?: string | null }[] | null | undefined) =>
  (items ?? []).map((a) => ({ name: a.name, description: a.description ?? null }))

export async function toCharacterPublic(doc: Character, locale: Locale): Promise<CharacterPublic> {
  return {
    ...base('characters', doc, locale),
    kind: doc.kind,
    side: doc.side ?? 'neutral',
    grade: doc.grade ?? 'unknown',
    classType: doc.classType ?? null,
    factions: refs('factions', locale, doc.factions),
    profile: {
      gender: doc.profile?.gender ?? undefined,
      age: doc.profile?.age ?? undefined,
      height: doc.profile?.height ?? undefined,
      weight: doc.profile?.weight ?? undefined,
      birthplace: doc.profile?.birthplace ?? undefined,
      nationality: doc.profile?.nationality ?? undefined,
      bloodType: doc.profile?.bloodType ?? undefined,
      birthday: doc.profile?.birthday ?? undefined,
      occupation: doc.profile?.occupation ?? null,
    },
    story: await richTextToMarkdown(doc.story),
    quotes: (doc.quotes ?? []).map((q) => ({ text: q.text, context: q.context ?? null })),
    abilities: named(doc.abilities),
    weapons: refs('weapons', locale, doc.weapons),
    scenarios: refs('scenarios', locale, doc.scenarios),
    gameModes: refs('game-modes', locale, doc.gameModes),
    maps: refs('maps', locale, doc.maps),
    relatedCharacters: refs('characters', locale, doc.relatedCharacters),
    voiceActors: (doc.voiceActors ?? []).map((v) => ({ region: v.region, name: v.name })),
    scenarioStats: {
      health: doc.scenarioStats?.health ?? undefined,
      attack: doc.scenarioStats?.attack ?? undefined,
      mobility: doc.scenarioStats?.mobility ?? undefined,
      armor: doc.scenarioStats?.armor ?? undefined,
      ammo: doc.scenarioStats?.ammo ?? undefined,
    },
    costumes: (doc.costumes ?? []).map((c) => ({
      name: c.name,
      description: c.description ?? null,
      imageUrl: c.imageUrl ?? null,
    })),
    signatureWeapon: ref('weapons', locale)(doc.signatureWeapon),
    model3d: mediaRef(doc.model3d),
  }
}

export async function toWeaponPublic(doc: Weapon, locale: Locale): Promise<WeaponPublic> {
  const s = doc.stats ?? {}
  return {
    ...base('weapons', doc, locale),
    category: doc.category,
    grade: doc.grade ?? 'unknown',
    origin: doc.origin ?? null,
    manufacturer: doc.manufacturer ?? null,
    caliber: doc.caliber ?? null,
    description: await richTextToMarkdown(doc.description),
    statNotes: (doc.statNotes as Record<string, string> | null | undefined) ?? {},
    stats: {
      damage: s.damage ?? undefined,
      accuracy: s.accuracy ?? undefined,
      recoil: s.recoil ?? undefined,
      rateOfFire: s.rateOfFire ?? undefined,
      weight: s.weight ?? undefined,
      knockback: s.knockback ?? undefined,
      stun: s.stun ?? undefined,
    },
    ammo: {
      magazine: doc.ammo?.magazine ?? undefined,
      reserve: doc.ammo?.reserve ?? undefined,
      type: doc.ammo?.type ?? undefined,
    },
    price: doc.price ?? null,
    fireModes: doc.fireModes ?? [],
    obtainMethod: doc.obtainMethod ?? null,
    variants: refs('weapons', locale, doc.variants),
    characters: refs('characters', locale, doc.characters),
    abilities: named(doc.abilities),
    icon: mediaRef(doc.icon),
    model3d: mediaRef(doc.model3d),
  }
}

export async function toScenarioPublic(doc: Scenario, locale: Locale): Promise<ScenarioPublic> {
  return {
    ...base('scenarios', doc, locale),
    gameMode: ref('game-modes', locale)(doc.gameMode),
    season: doc.season ?? null,
    chapter: doc.chapter ?? null,
    story: await richTextToMarkdown(doc.story),
    objectives: (doc.objectives ?? []).map((o) => o.text),
    bosses: refs('characters', locale, doc.bosses),
    characters: refs('characters', locale, doc.characters),
    maps: refs('maps', locale, doc.maps),
    difficulties: doc.difficulties ?? [],
    rewards: (doc.rewards ?? []).map((r) => r.text),
    nextChapter: ref('scenarios', locale)(doc.nextChapter),
  }
}

export async function toGameModePublic(
  doc: GameMode,
  locale: Locale,
  scenarios: Scenario[] = [],
): Promise<GameModePublic> {
  return {
    ...base('game-modes', doc, locale),
    family: doc.family,
    description: await richTextToMarkdown(doc.description),
    lore: await richTextToMarkdown(doc.lore),
    rules: (doc.rules ?? []).map((r) => r.text),
    maxPlayers: doc.maxPlayers ?? null,
    scenarios: refs('scenarios', locale, scenarios),
  }
}

export async function toMapPublic(doc: GameMap, locale: Locale): Promise<MapPublic> {
  return {
    ...base('maps', doc, locale),
    description: await richTextToMarkdown(doc.description),
    gameModes: refs('game-modes', locale, doc.gameModes),
    scenario: ref('scenarios', locale)(doc.scenario),
    location: doc.location ?? null,
  }
}

export async function toFactionPublic(doc: Faction, locale: Locale): Promise<FactionPublic> {
  return {
    ...base('factions', doc, locale),
    side: doc.side ?? 'neutral',
    description: await richTextToMarkdown(doc.description),
    lore: await richTextToMarkdown(doc.lore),
    leaders: refs('characters', locale, doc.leaders),
    members: refs('characters', locale, doc.members),
  }
}

export async function toMusicPublic(doc: Music, locale: Locale): Promise<MusicPublic> {
  const remoteAudio = audioOf(doc)[0] ?? null
  return {
    ...base('music', doc, locale),
    title: doc.title,
    composer: doc.composer ?? null,
    album: doc.album ?? null,
    durationSeconds: doc.durationSeconds ?? null,
    description: await richTextToMarkdown(doc.description),
    usedIn: {
      gameModes: refs('game-modes', locale, doc.usedIn?.gameModes),
      scenarios: refs('scenarios', locale, doc.usedIn?.scenarios),
      maps: refs('maps', locale, doc.usedIn?.maps),
    },
    audio: mediaRef(doc.audio) ?? remoteAudio,
  }
}
