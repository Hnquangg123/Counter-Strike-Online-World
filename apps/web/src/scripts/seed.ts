/**
 * Seed the world from data/seed/*.json.
 *
 *   pnpm seed                 # upsert everything (idempotent, keyed by slug)
 *   pnpm seed:reset           # wipe content collections first
 *   SEED_DOWNLOAD_MEDIA=1     # also download the first portrait/render of each entry
 *                             # into the media collection (needs network access to the wiki CDN)
 *
 * Runs through Payload's Local API so every hook, validation and localization
 * rule applies exactly as it would in the admin UI.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  type CharacterSeed,
  type FactionSeed,
  type GameModeSeed,
  LOCALES,
  type Locale,
  type LocalizedText,
  type MapSeed,
  type MediaInput,
  type MusicSeed,
  type ScenarioSeed,
  SeedBundle,
  type WeaponSeed,
} from '@csow/schema'
import config from '@payload-config'
import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { getPayload, type Payload } from 'payload'
import { z } from 'zod'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const SEED_DIR = path.resolve(dirname, '../../../../data/seed')
const RESET = process.env.SEED_RESET === '1'
const DOWNLOAD = process.env.SEED_DOWNLOAD_MEDIA === '1'

const StorylineSeed = z.object({
  title: z.object({ en: z.string(), vi: z.string().optional() }),
  intro: z.object({ en: z.string(), vi: z.string().optional() }).optional(),
  eras: z.array(
    z.object({
      title: z.object({ en: z.string(), vi: z.string().optional() }),
      subtitle: z.object({ en: z.string(), vi: z.string().optional() }).nullable().optional(),
      period: z.string().nullable().optional(),
      body: z.object({ en: z.string(), vi: z.string().optional() }).nullable().optional(),
      characters: z.array(z.string()).default([]),
      scenarios: z.array(z.string()).default([]),
      factions: z.array(z.string()).default([]),
      imageUrl: z.string().optional(),
      sources: z.array(z.string()).default([]),
    }),
  ),
})

type Ids = Map<string, number>
type Seedable =
  | 'factions'
  | 'game-modes'
  | 'maps'
  | 'weapons'
  | 'characters'
  | 'scenarios'
  | 'music'
  | 'tags'
const ids: Record<Seedable, Ids> = {
  factions: new Map(),
  'game-modes': new Map(),
  maps: new Map(),
  weapons: new Map(),
  characters: new Map(),
  scenarios: new Map(),
  music: new Map(),
  tags: new Map(),
}
const idOf = (collection: Seedable, slug: string): number => {
  const id = ids[collection].get(slug)
  if (id === undefined) throw new Error(`${collection}/${slug} was not created in pass 1`)
  return id
}

const log = (...args: unknown[]) => console.log('[seed]', ...args)

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(SEED_DIR, file), 'utf8')) as T
  } catch {
    return fallback
  }
}

type SeedRecord = Record<string, unknown> & { slug: string }

const isLocalized = (v: unknown): v is Record<string, string> =>
  Boolean(v) &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  typeof (v as Record<string, unknown>).en === 'string'

/**
 * Merge overlay values into a curated record without overwriting curated
 * content: LocalizedText merges per locale, `media` concatenates by src, other
 * fields fill in only when the curated value is missing/empty.
 */
const mergeRecord = (base: SeedRecord, overlay: SeedRecord): SeedRecord => {
  const out: SeedRecord = { ...base }
  for (const [key, value] of Object.entries(overlay)) {
    if (key.startsWith('_') || value === undefined || value === null) continue
    const current = out[key]
    if (isLocalized(value) && isLocalized(current)) out[key] = { ...value, ...current }
    else if (key === 'media' && Array.isArray(value) && Array.isArray(current)) {
      const seen = new Set(current.map((m) => (m as { src: string }).src))
      out[key] = [...current, ...value.filter((m) => !seen.has((m as { src: string }).src))]
    } else if (
      current === undefined ||
      current === null ||
      current === '' ||
      (Array.isArray(current) && current.length === 0)
    )
      out[key] = value
  }
  return out
}

/** Curated data/seed/<name>.json + ingested/ + ai/ overlays (curated wins). */
async function loadBundle(name: string): Promise<SeedRecord[]> {
  const curated = await readJson<SeedRecord[]>(`${name}.json`, [])
  const overlays = [
    await readJson<SeedRecord[]>(`ingested/${name}.json`, []),
    await readJson<SeedRecord[]>(`ai/${name}.json`, []),
  ]
  const bySlug = new Map(curated.map((r) => [r.slug, r]))
  for (const layer of overlays) {
    for (const rec of layer) {
      const existing = bySlug.get(rec.slug)
      bySlug.set(
        rec.slug,
        existing
          ? mergeRecord(existing, rec)
          : {
              ...Object.fromEntries(Object.entries(rec).filter(([k]) => !k.startsWith('_'))),
              slug: rec.slug,
            },
      )
    }
  }
  return [...bySlug.values()]
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

let md2lexical: ((markdown: string) => unknown) | null = null

const richText = (text: LocalizedText | null | undefined, locale: Locale) => {
  const value = text?.[locale]
  if (!value?.trim() || !md2lexical) return locale === 'en' ? null : undefined
  return md2lexical(value)
}

const loc = (text: LocalizedText | null | undefined, locale: Locale) =>
  locale === 'en' ? (text?.en ?? null) : (text?.[locale] ?? undefined)

const locArray = <T extends Record<string, unknown>>(
  items: T[] | undefined,
  locale: Locale,
  pick: (item: T, l: Locale) => Record<string, unknown>,
) => (items ?? []).map((item) => pick(item, locale))

const hasLocale = (bundle: unknown, locale: Locale): boolean => {
  if (!bundle || typeof bundle !== 'object') return false
  if (Array.isArray(bundle)) return bundle.some((b) => hasLocale(b, locale))
  const obj = bundle as Record<string, unknown>
  if (typeof obj[locale] === 'string' && typeof obj.en === 'string') return true
  return Object.values(obj).some((v) => hasLocale(v, locale))
}

const relIds = (collection: Seedable, slugs: string[] | undefined) =>
  (slugs ?? [])
    .map((s) => ids[collection].get(s))
    .filter((id): id is number => typeof id === 'number')

const relId = (collection: Seedable, slug: string | undefined) =>
  slug ? (ids[collection].get(slug) ?? null) : null

const remoteMedia = (media: MediaInput[] | undefined, locale: Locale) =>
  (media ?? [])
    .filter((m) => /^https?:\/\//.test(m.src))
    .map((m) => ({
      url: m.src,
      kind: m.kind,
      caption: loc(m.caption, locale),
      credit: m.credit ?? 'Counter-Strike Online Wiki / Nexon',
    }))

const wikiSource = (
  ws: { url: string; title?: string; revisionId?: number; fetchedAt?: string } | undefined,
) =>
  ws
    ? {
        url: ws.url,
        title: ws.title ?? null,
        revisionId: ws.revisionId ?? null,
        fetchedAt: ws.fetchedAt ?? null,
        license: 'CC-BY-SA-3.0' as const,
      }
    : undefined

async function downloadMedia(
  payload: Payload,
  item: MediaInput,
  alt: string,
): Promise<number | null> {
  if (!DOWNLOAD) return null
  try {
    const res = await fetch(item.src, {
      headers: { 'User-Agent': 'CSOW-seed/0.1 (fan archive; contact via repository)' },
    })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    const mimetype = res.headers.get('content-type')?.split(';')[0] ?? 'image/png'
    const name = decodeURIComponent(item.src.split('/').pop() ?? 'asset').replace(/[^\w.-]+/g, '_')
    const doc = await payload.create({
      collection: 'media',
      data: {
        alt,
        kind: item.kind,
        credit: item.credit ?? 'Counter-Strike Online Wiki / Nexon',
        sourceUrl: item.sourceUrl ?? item.src,
        license: 'fair-use',
      },
      file: { data: buf, mimetype, name, size: buf.byteLength },
    })
    return doc.id
  } catch (err) {
    log(`  media download failed for ${item.src}: ${(err as Error).message}`)
    return null
  }
}

const ROOT_DIR = path.resolve(SEED_DIR, '..', '..')
const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  glb: 'model/gltf-binary',
  gltf: 'model/gltf+json',
  ogg: 'audio/ogg',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
}

/**
 * Upload media that lives in the repository (AI-generated art under
 * data/media/generated, downloaded wiki files under data/media) into the media
 * collection and return their ids, keyed by kind. Idempotent by filename.
 */
async function uploadLocalMedia(
  payload: Payload,
  items: MediaInput[],
  alt: string,
): Promise<{ id: number; kind: string }[]> {
  const out: { id: number; kind: string }[] = []
  for (const item of items) {
    if (/^https?:\/\//.test(item.src)) continue
    const abs = path.isAbsolute(item.src) ? item.src : path.join(ROOT_DIR, item.src)
    let buf: Buffer
    try {
      buf = await fs.readFile(abs)
    } catch {
      log(`  local media missing: ${item.src}`)
      continue
    }
    const name = path.basename(abs)
    const existing = await payload.find({
      collection: 'media',
      where: { filename: { equals: name } },
      limit: 1,
      depth: 0,
    })
    if (existing.docs[0]) {
      out.push({ id: existing.docs[0].id, kind: item.kind })
      continue
    }
    const ext = name.split('.').pop()?.toLowerCase() ?? ''
    const isAi = Boolean(item.aiGeneration)
    const doc = await payload.create({
      collection: 'media',
      data: {
        alt: item.alt ?? alt,
        kind: item.kind,
        caption: item.caption?.en ?? null,
        credit:
          item.credit ??
          (isAi
            ? 'Counter-Strike Online World (AI-generated)'
            : 'Counter-Strike Online Wiki / Nexon'),
        sourceUrl: item.sourceUrl ?? null,
        license: isAi ? 'ai-generated' : 'fair-use',
        ...(item.aiGeneration
          ? {
              aiGeneration: {
                provider: item.aiGeneration.provider,
                model: item.aiGeneration.model,
                prompt: item.aiGeneration.prompt,
                negativePrompt: item.aiGeneration.negativePrompt ?? null,
                seed: item.aiGeneration.seed ?? null,
                generatedAt: item.aiGeneration.generatedAt ?? null,
                referenceImages: (item.aiGeneration.referenceImages ?? []).map((url) => ({ url })),
              },
            }
          : {}),
      },
      file: {
        data: buf,
        mimetype: MIME[ext] ?? 'application/octet-stream',
        name,
        size: buf.byteLength,
      },
    })
    out.push({ id: doc.id, kind: item.kind })
  }
  return out
}

/** Create or update a document by slug in `en`, then layer other locales on top. */
async function upsert(
  payload: Payload,
  collection: Seedable,
  slug: string,
  build: (locale: Locale) => Record<string, unknown>,
  seed: unknown,
) {
  const existing = await payload.find({
    collection: collection as 'characters',
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    locale: 'en',
  })
  const data = { ...build('en'), slug, _status: 'published' }
  let id: number
  if (existing.docs[0]) {
    id = existing.docs[0].id
    await payload.update({
      collection: collection as 'characters',
      id,
      data: data as never,
      locale: 'en',
      draft: false,
      depth: 0,
    })
  } else {
    const created = await payload.create({
      collection: collection as 'characters',
      data: data as never,
      locale: 'en',
      draft: false,
      depth: 0,
    })
    id = created.id
  }
  ids[collection].set(slug, id)
  for (const locale of LOCALES) {
    if (locale === 'en' || !hasLocale(seed, locale)) continue
    const localized = Object.fromEntries(
      Object.entries(build(locale)).filter(([, v]) => v !== undefined),
    )
    await payload.update({
      collection: collection as 'characters',
      id,
      data: localized as never,
      locale,
      draft: false,
      depth: 0,
    })
  }
  return id
}

/* -------------------------------------------------------------------------- */
/*  Builders (pass 1: scalars, pass 2: relations)                              */
/* -------------------------------------------------------------------------- */

const identity = (
  s: {
    name: string
    localizedName?: LocalizedText
    aliases: string[]
    tagline?: LocalizedText
    summary?: LocalizedText
  },
  locale: Locale,
) => ({
  name: s.name,
  localizedName: locale === 'en' ? null : (s.localizedName?.[locale] ?? undefined),
  aliases: locale === 'en' ? s.aliases.map((alias) => ({ alias })) : undefined,
  tagline: loc(s.tagline, locale),
  summary: loc(s.summary, locale),
})

const common = (
  s: {
    release: { region: string; date?: string; note?: string }[]
    trivia: LocalizedText[]
    media: MediaInput[]
    wikiSource?: { url: string; title?: string }
    accentColor?: string
    featured: boolean
  },
  locale: Locale,
) => ({
  release:
    locale === 'en'
      ? s.release.map((r) => ({ region: r.region, date: r.date ?? null, note: r.note ?? null }))
      : undefined,
  trivia: locArray(s.trivia, locale, (t, l) => ({ text: loc(t, l) })),
  remoteMedia: remoteMedia(s.media, locale),
  wikiSource: locale === 'en' ? wikiSource(s.wikiSource) : undefined,
  accentColor: locale === 'en' ? (s.accentColor ?? null) : undefined,
  featured: locale === 'en' ? s.featured : undefined,
})

const named = (items: { name: LocalizedText; description?: LocalizedText }[], locale: Locale) =>
  locArray(items, locale, (a, l) => ({ name: loc(a.name, l), description: loc(a.description, l) }))

const buildFaction = (s: FactionSeed) => (locale: Locale) => ({
  ...identity(s, locale),
  ...common(s, locale),
  side: locale === 'en' ? s.side : undefined,
  description: richText(s.description, locale),
  lore: richText(s.lore, locale),
})

const buildMode = (s: GameModeSeed) => (locale: Locale) => ({
  ...identity(s, locale),
  ...common(s, locale),
  family: locale === 'en' ? s.family : undefined,
  maxPlayers: locale === 'en' ? (s.maxPlayers ?? null) : undefined,
  description: richText(s.description, locale),
  lore: richText(s.lore, locale),
  rules: locArray(s.rules, locale, (r, l) => ({ text: loc(r, l) })),
})

const buildMap = (s: MapSeed) => (locale: Locale) => ({
  ...identity(s, locale),
  ...common(s, locale),
  location: locale === 'en' ? (s.location ?? null) : undefined,
  description: richText(s.description, locale),
})

const buildWeapon = (s: WeaponSeed) => (locale: Locale) => ({
  ...identity(s, locale),
  ...common(s, locale),
  category: locale === 'en' ? s.category : undefined,
  grade: locale === 'en' ? s.grade : undefined,
  origin: locale === 'en' ? (s.origin ?? null) : undefined,
  manufacturer: locale === 'en' ? (s.manufacturer ?? null) : undefined,
  caliber: locale === 'en' ? (s.caliber ?? null) : undefined,
  price: locale === 'en' ? (s.price ?? null) : undefined,
  fireModes: locale === 'en' ? s.fireModes : undefined,
  stats: locale === 'en' ? s.stats : undefined,
  statNotes: locale === 'en' ? s.statNotes : undefined,
  ammo: locale === 'en' ? s.ammo : undefined,
  description: richText(s.description, locale),
  obtainMethod: loc(s.obtainMethod, locale),
  abilities: named(s.abilities, locale),
})

const buildCharacter = (s: CharacterSeed) => (locale: Locale) => ({
  ...identity(s, locale),
  ...common(s, locale),
  kind: locale === 'en' ? s.kind : undefined,
  side: locale === 'en' ? s.side : undefined,
  grade: locale === 'en' ? s.grade : undefined,
  classType: locale === 'en' ? (s.classType ?? null) : undefined,
  profile: {
    ...(locale === 'en'
      ? {
          gender: s.profile.gender ?? null,
          age: s.profile.age ?? null,
          height: s.profile.height ?? null,
          weight: s.profile.weight ?? null,
          birthplace: s.profile.birthplace ?? null,
          nationality: s.profile.nationality ?? null,
          birthday: s.profile.birthday ?? null,
          bloodType: s.profile.bloodType ?? null,
        }
      : {}),
    occupation: loc(s.profile.occupation, locale),
  },
  story: richText(s.story, locale),
  quotes: locArray(s.quotes, locale, (q, l) => ({
    text: loc(q.text, l),
    context: loc(q.context, l),
  })),
  abilities: named(s.abilities, locale),
  scenarioStats: locale === 'en' ? s.scenarioStats : undefined,
  costumes: locArray(s.costumes, locale, (c, l) => ({
    name: loc(c.name, l),
    description: loc(c.description, l),
    imageUrl: l === 'en' ? (c.imageUrl ?? null) : undefined,
  })),
  voiceActors: locale === 'en' ? s.voiceActors : undefined,
})

const buildScenario = (s: ScenarioSeed) => (locale: Locale) => ({
  ...identity(s, locale),
  ...common(s, locale),
  season: locale === 'en' ? (s.season ?? null) : undefined,
  chapter: locale === 'en' ? (s.chapter ?? null) : undefined,
  difficulties: locale === 'en' ? s.difficulties : undefined,
  story: richText(s.story, locale),
  objectives: locArray(s.objectives, locale, (o, l) => ({ text: loc(o, l) })),
  rewards: locArray(s.rewards, locale, (r, l) => ({ text: loc(r, l) })),
  gameMode: locale === 'en' ? relId('game-modes', s.gameMode) : undefined,
})

const buildMusic = (s: MusicSeed) => (locale: Locale) => ({
  title: s.title,
  name: s.title,
  tagline: loc(s.tagline, locale),
  summary: loc(s.summary, locale),
  ...common(s, locale),
  composer: locale === 'en' ? (s.composer ?? null) : undefined,
  album: locale === 'en' ? (s.album ?? null) : undefined,
  durationSeconds: locale === 'en' ? (s.durationSeconds ?? null) : undefined,
  description: richText(s.description, locale),
  remoteMedia: [
    ...remoteMedia(s.media, locale),
    ...(s.audio && /^https?:\/\//.test(s.audio)
      ? [{ url: s.audio, kind: 'audio' as const, caption: s.title, credit: 'Nexon' }]
      : []),
  ],
})

/* -------------------------------------------------------------------------- */
/*  Main                                                                       */
/* -------------------------------------------------------------------------- */

async function main() {
  const payload = await getPayload({ config })
  const editorConfig = await editorConfigFactory.default({ config: payload.config })
  md2lexical = (markdown: string) => convertMarkdownToLexical({ editorConfig, markdown })

  const bundle = SeedBundle.parse({
    factions: await loadBundle('factions'),
    gameModes: await loadBundle('game-modes'),
    maps: await loadBundle('maps'),
    characters: await loadBundle('characters'),
    weapons: await loadBundle('weapons'),
    scenarios: await loadBundle('scenarios'),
    music: await loadBundle('music'),
  })
  const storyline = StorylineSeed.safeParse(await readJson('storyline.json', null))

  if (RESET) {
    for (const collection of [
      'scenarios',
      'characters',
      'weapons',
      'music',
      'maps',
      'game-modes',
      'factions',
      'tags',
    ] as const) {
      const result = await payload.delete({ collection, where: { id: { exists: true } } })
      log(`reset ${collection}: removed`, result.docs.length)
    }
  }

  // Admin user
  const users = await payload.find({ collection: 'users', limit: 1, depth: 0 })
  if (users.totalDocs === 0) {
    const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@csow.local'
    const password = process.env.SEED_ADMIN_PASSWORD ?? 'change-me'
    await payload.create({
      collection: 'users',
      data: { email, password, role: 'admin', name: 'Archivist' },
    })
    log(`created admin user ${email}`)
  }

  // Pass 1 — entities without cross-references (order matters for gameMode → scenarios)
  log('pass 1: entities')
  for (const s of bundle.factions) await upsert(payload, 'factions', s.slug, buildFaction(s), s)
  for (const s of bundle.gameModes) await upsert(payload, 'game-modes', s.slug, buildMode(s), s)
  for (const s of bundle.maps) await upsert(payload, 'maps', s.slug, buildMap(s), s)
  for (const s of bundle.weapons) await upsert(payload, 'weapons', s.slug, buildWeapon(s), s)
  for (const s of bundle.characters)
    await upsert(payload, 'characters', s.slug, buildCharacter(s), s)
  for (const s of bundle.scenarios) await upsert(payload, 'scenarios', s.slug, buildScenario(s), s)
  for (const s of bundle.music) await upsert(payload, 'music', s.slug, buildMusic(s), s)
  log(
    `  ${Object.entries(ids)
      .map(([k, v]) => `${k}=${v.size}`)
      .join(' ')}`,
  )

  // Pass 2 — relations
  log('pass 2: relations')
  for (const s of bundle.factions) {
    await payload.update({
      collection: 'factions',
      id: idOf('factions', s.slug),
      data: { leaders: relIds('characters', s.leaders), members: relIds('characters', s.members) },
      depth: 0,
    })
  }
  for (const s of bundle.maps) {
    await payload.update({
      collection: 'maps',
      id: idOf('maps', s.slug),
      data: {
        gameModes: relIds('game-modes', s.gameModes),
        scenario: relId('scenarios', s.scenario),
      },
      depth: 0,
    })
  }
  for (const s of bundle.weapons) {
    await payload.update({
      collection: 'weapons',
      id: idOf('weapons', s.slug),
      data: {
        variants: relIds('weapons', s.variants),
        characters: relIds('characters', s.characters),
      },
      depth: 0,
    })
  }
  for (const s of bundle.characters) {
    await payload.update({
      collection: 'characters',
      id: idOf('characters', s.slug),
      data: {
        factions: relIds('factions', s.factions),
        signatureWeapon: relId('weapons', s.signatureWeapon),
        weapons: relIds('weapons', s.weapons),
        scenarios: relIds('scenarios', s.scenarios),
        gameModes: relIds('game-modes', s.gameModes),
        maps: relIds('maps', s.maps),
        relatedCharacters: relIds('characters', s.relatedCharacters),
      },
      depth: 0,
    })
  }
  for (const s of bundle.scenarios) {
    await payload.update({
      collection: 'scenarios',
      id: idOf('scenarios', s.slug),
      data: {
        bosses: relIds('characters', s.bosses),
        characters: relIds('characters', s.characters),
        maps: relIds('maps', s.maps),
        nextChapter: relId('scenarios', s.nextChapter),
      },
      depth: 0,
    })
  }
  for (const s of bundle.music) {
    await payload.update({
      collection: 'music',
      id: idOf('music', s.slug),
      data: {
        usedIn: {
          gameModes: relIds('game-modes', s.usedIn.gameModes),
          scenarios: relIds('scenarios', s.usedIn.scenarios),
          maps: relIds('maps', s.usedIn.maps),
        },
      },
      depth: 0,
    })
  }

  // Local media (AI art, downloaded files) → media collection → gallery / hero / 3D figure.
  log('pass 3: local media')
  for (const [collection, items] of [
    ['characters', bundle.characters],
    ['weapons', bundle.weapons],
  ] as const) {
    for (const s of items) {
      const uploaded = await uploadLocalMedia(payload, s.media, s.name)
      const model = s.model3d
        ? await uploadLocalMedia(
            payload,
            [{ kind: 'model-3d', src: s.model3d }],
            `${s.name} 3D figure`,
          )
        : []
      if (!uploaded.length && !model.length) continue
      const gallery = uploaded
        .filter((m) => m.kind !== 'audio' && m.kind !== 'model-3d')
        .map((m) => m.id)
      const hero = uploaded.find((m) => m.kind === 'render' || m.kind === 'portrait') ?? uploaded[0]
      await payload.update({
        collection,
        id: idOf(collection, s.slug),
        data: {
          gallery,
          heroImage: hero?.id ?? null,
          ...(model[0] ? { model3d: model[0].id } : {}),
        } as never,
        depth: 0,
      })
    }
  }

  // Optional: localise the first portrait/render of each character & weapon into the media collection.
  if (DOWNLOAD) {
    log('pass 3: media download')
    for (const s of bundle.characters) {
      const first =
        s.media.find((m) => ['portrait', 'render', 'artwork'].includes(m.kind)) ?? s.media[0]
      if (!first) continue
      const mediaId = await downloadMedia(payload, first, s.name)
      if (mediaId)
        await payload.update({
          collection: 'characters',
          id: idOf('characters', s.slug),
          data: { heroImage: mediaId },
          depth: 0,
        })
    }
    for (const s of bundle.weapons) {
      const first = s.media[0]
      if (!first) continue
      const mediaId = await downloadMedia(payload, first, s.name)
      if (mediaId)
        await payload.update({
          collection: 'weapons',
          id: idOf('weapons', s.slug),
          data: { heroImage: mediaId },
          depth: 0,
        })
    }
  }

  // Globals
  log('globals')
  await payload.updateGlobal({
    slug: 'homepage',
    data: {
      featuredCharacters: relIds(
        'characters',
        bundle.characters.filter((c) => c.featured).map((c) => c.slug),
      ).slice(0, 6),
      featuredWeapons: relIds(
        'weapons',
        bundle.weapons.filter((w) => w.featured).map((w) => w.slug),
      ).slice(0, 8),
      featuredScenarios: relIds(
        'scenarios',
        bundle.scenarios.filter((s) => s.featured).map((s) => s.slug),
      ).slice(0, 4),
    },
    depth: 0,
  })
  const settings = await payload.findGlobal({ slug: 'site-settings', depth: 0 })
  if (!settings?.siteName) {
    await payload.updateGlobal({
      slug: 'site-settings',
      data: { siteName: 'Counter-Strike Online World' },
      depth: 0,
    })
  }
  if (storyline.success) {
    const st = storyline.data
    for (const locale of LOCALES) {
      if (locale !== 'en' && !hasLocale(st, locale)) continue
      await payload.updateGlobal({
        slug: 'storyline',
        locale,
        draft: false,
        data: {
          title: loc(st.title, locale),
          intro: loc(st.intro, locale),
          eras: st.eras.map((e) => ({
            title: loc(e.title, locale),
            subtitle: loc(e.subtitle ?? undefined, locale),
            period: locale === 'en' ? (e.period ?? null) : undefined,
            body: richText(e.body ?? undefined, locale),
            characters: locale === 'en' ? relIds('characters', e.characters) : undefined,
            scenarios: locale === 'en' ? relIds('scenarios', e.scenarios) : undefined,
            factions: locale === 'en' ? relIds('factions', e.factions) : undefined,
            imageUrl: locale === 'en' ? (e.imageUrl ?? null) : undefined,
            sources: locale === 'en' ? e.sources.map((url) => ({ url })) : undefined,
          })),
          _status: 'published',
        } as never,
        depth: 0,
      })
    }
    log(`storyline: ${st.eras.length} eras`)
  }

  log('done ✔')
  // Close DB handles, flush stdout (piped output is async), then exit — libsql can keep the loop alive.
  await payload.destroy()
  await new Promise<void>((resolve) => process.stdout.write('', () => resolve()))
  process.exit(0)
}

main().catch(async (err) => {
  console.error('[seed] failed', err)
  await new Promise<void>((resolve) => process.stderr.write('', () => resolve()))
  process.exit(1)
})
