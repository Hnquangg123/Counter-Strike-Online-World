import { z } from 'zod'
import {
  AiGeneration,
  LocalizedText,
  MediaInput,
  MediaRef,
  NamedDescription,
  Quote,
  RegionalRelease,
  Slug,
  WikiSource,
} from './common'
import { CharacterKind, Difficulty, Grade, ModeFamily, Side, WeaponCategory } from './enums'

/* -------------------------------------------------------------------------- */
/*  Seed / ingest shapes (what lives in data/seed and data/wiki)               */
/* -------------------------------------------------------------------------- */

const SeedBase = z.object({
  slug: Slug,
  name: z.string().min(1),
  /** Localized display name when it differs per region (e.g. Korean original). */
  localizedName: LocalizedText.optional(),
  aliases: z.array(z.string()).default([]),
  tagline: LocalizedText.optional(),
  summary: LocalizedText.optional(),
  tags: z.array(z.string()).default([]),
  release: z.array(RegionalRelease).default([]),
  trivia: z.array(LocalizedText).default([]),
  media: z.array(MediaInput).default([]),
  wikiSource: WikiSource.optional(),
  /** Tailwind-friendly accent colour used on this entry's pages. */
  accentColor: z.string().optional(),
  featured: z.boolean().default(false),
})

export const CharacterSeed = SeedBase.extend({
  kind: CharacterKind.default('human'),
  side: Side.default('neutral'),
  grade: Grade.default('unknown'),
  /** e.g. "Transcendent class", "Zombie hero", "Boss" */
  classType: z.string().optional(),
  /** Slugs of factions/organisations. */
  factions: z.array(Slug).default([]),
  profile: z
    .object({
      gender: z.string().optional(),
      age: z.string().optional(),
      height: z.string().optional(),
      weight: z.string().optional(),
      birthplace: z.string().optional(),
      nationality: z.string().optional(),
      occupation: LocalizedText.optional(),
      bloodType: z.string().optional(),
      birthday: z.string().optional(),
    })
    .default({}),
  /** Markdown; converted to rich text on seed. */
  story: LocalizedText.optional(),
  quotes: z.array(Quote).default([]),
  abilities: z.array(NamedDescription).default([]),
  /** Relations by slug */
  weapons: z.array(Slug).default([]),
  scenarios: z.array(Slug).default([]),
  gameModes: z.array(Slug).default([]),
  maps: z.array(Slug).default([]),
  relatedCharacters: z.array(Slug).default([]),
  voiceActors: z.array(z.object({ region: z.string(), name: z.string() })).default([]),
  /** Zombie Scenario class stats, each on the game's x/28 scale. */
  scenarioStats: z
    .object({
      health: z.number().int().min(0).max(28).optional(),
      attack: z.number().int().min(0).max(28).optional(),
      mobility: z.number().int().min(0).max(28).optional(),
      armor: z.number().int().min(0).max(28).optional(),
      ammo: z.number().int().min(0).max(28).optional(),
    })
    .default({}),
  costumes: z
    .array(
      z.object({
        name: LocalizedText,
        description: LocalizedText.optional(),
        imageUrl: z.string().optional(),
      }),
    )
    .default([]),
  /** Slug of the pairing / signature weapon. */
  signatureWeapon: Slug.optional(),
  /** Path to a glTF/GLB model relative to data/, if one exists. */
  model3d: z.string().optional(),
})
export type CharacterSeed = z.infer<typeof CharacterSeed>

export const WeaponStats = z
  .object({
    damage: z.number().optional(),
    accuracy: z.number().optional(),
    recoil: z.number().optional(),
    rateOfFire: z.number().optional(),
    weight: z.number().optional(),
    knockback: z.number().optional(),
    stun: z.number().optional(),
  })
  .meta({
    description: 'In-game stat bars (0-100 unless noted), including zombie-mode knockback/stun',
  })
export type WeaponStats = z.infer<typeof WeaponStats>

export const WeaponSeed = SeedBase.extend({
  category: WeaponCategory,
  grade: Grade.default('unknown'),
  origin: z.string().optional(),
  manufacturer: z.string().optional(),
  caliber: z.string().optional(),
  description: LocalizedText.optional(),
  stats: WeaponStats.default({}),
  /** Prose notes per stat when the wiki gives text instead of a bar value. */
  statNotes: z.record(z.string(), z.string()).default({}),
  ammo: z
    .object({
      magazine: z.number().int().optional(),
      reserve: z.number().int().optional(),
      type: z.string().optional(),
    })
    .default({}),
  price: z.number().int().optional(),
  fireModes: z.array(z.string()).default([]),
  obtainMethod: LocalizedText.optional(),
  /** Slugs of related weapons (variants, reskins, upgrades). */
  variants: z.array(Slug).default([]),
  /** Slugs of characters associated with this weapon. */
  characters: z.array(Slug).default([]),
  /** In-game special abilities (CSO-original weapons often have them). */
  abilities: z.array(NamedDescription).default([]),
  model3d: z.string().optional(),
})
export type WeaponSeed = z.infer<typeof WeaponSeed>

export const ScenarioSeed = SeedBase.extend({
  /** Slug of the game mode this chapter belongs to (e.g. zombie-scenario). */
  gameMode: Slug,
  season: z.string().optional(),
  chapter: z.number().int().optional(),
  /** Markdown story text. */
  story: LocalizedText.optional(),
  objectives: z.array(LocalizedText).default([]),
  bosses: z.array(Slug).default([]),
  characters: z.array(Slug).default([]),
  maps: z.array(Slug).default([]),
  difficulties: z.array(Difficulty).default([]),
  rewards: z.array(LocalizedText).default([]),
  /** Slug of the chapter that comes next in the storyline. */
  nextChapter: Slug.optional(),
})
export type ScenarioSeed = z.infer<typeof ScenarioSeed>

export const GameModeSeed = SeedBase.extend({
  family: ModeFamily,
  description: LocalizedText.optional(),
  /** The story this mode tells (Markdown). */
  lore: LocalizedText.optional(),
  rules: z.array(LocalizedText).default([]),
  maxPlayers: z.number().int().optional(),
})
export type GameModeSeed = z.infer<typeof GameModeSeed>

export const MapSeed = SeedBase.extend({
  description: LocalizedText.optional(),
  gameModes: z.array(Slug).default([]),
  scenario: Slug.optional(),
  location: z.string().optional(),
})
export type MapSeed = z.infer<typeof MapSeed>

export const FactionSeed = SeedBase.extend({
  side: Side.default('neutral'),
  description: LocalizedText.optional(),
  lore: LocalizedText.optional(),
  leaders: z.array(Slug).default([]),
  members: z.array(Slug).default([]),
})
export type FactionSeed = z.infer<typeof FactionSeed>

export const MusicSeed = SeedBase.extend({
  title: z.string().min(1),
  composer: z.string().optional(),
  album: z.string().optional(),
  durationSeconds: z.number().int().optional(),
  description: LocalizedText.optional(),
  usedIn: z
    .object({
      gameModes: z.array(Slug).default([]),
      scenarios: z.array(Slug).default([]),
      maps: z.array(Slug).default([]),
    })
    .default({ gameModes: [], scenarios: [], maps: [] }),
  audio: z.string().optional(),
})
export type MusicSeed = z.infer<typeof MusicSeed>

/** A whole seed bundle (data/seed/*.json are merged into one of these). */
export const SeedBundle = z.object({
  factions: z.array(FactionSeed).default([]),
  gameModes: z.array(GameModeSeed).default([]),
  maps: z.array(MapSeed).default([]),
  characters: z.array(CharacterSeed).default([]),
  weapons: z.array(WeaponSeed).default([]),
  scenarios: z.array(ScenarioSeed).default([]),
  music: z.array(MusicSeed).default([]),
})
export type SeedBundle = z.infer<typeof SeedBundle>

/* -------------------------------------------------------------------------- */
/*  Public API shapes (one locale resolved, relations summarised)              */
/* -------------------------------------------------------------------------- */

export const EntityRef = z
  .object({
    slug: Slug,
    name: z.string(),
    href: z.string().meta({ description: 'Canonical URL on the site' }),
  })
  .meta({ description: 'A lightweight reference to another entity' })
export type EntityRef = z.infer<typeof EntityRef>

const PublicBase = z.object({
  id: z.string(),
  slug: Slug,
  name: z.string(),
  aliases: z.array(z.string()),
  tagline: z.string().nullable(),
  summary: z.string().nullable(),
  tags: z.array(z.string()),
  release: z.array(RegionalRelease),
  trivia: z.array(z.string()),
  heroImage: MediaRef.nullable(),
  gallery: z.array(MediaRef),
  accentColor: z.string().nullable(),
  featured: z.boolean(),
  wikiSource: WikiSource.nullable(),
  href: z.string(),
  locale: z.string(),
  updatedAt: z.iso.datetime(),
})

export const CharacterPublic = PublicBase.extend({
  kind: CharacterKind,
  side: Side,
  grade: Grade,
  classType: z.string().nullable(),
  factions: z.array(EntityRef),
  profile: CharacterSeed.shape.profile.unwrap().extend({ occupation: z.string().nullable() }),
  /** Markdown */
  story: z.string().nullable(),
  quotes: z.array(z.object({ text: z.string(), context: z.string().nullable() })),
  abilities: z.array(z.object({ name: z.string(), description: z.string().nullable() })),
  weapons: z.array(EntityRef),
  scenarios: z.array(EntityRef),
  gameModes: z.array(EntityRef),
  maps: z.array(EntityRef),
  relatedCharacters: z.array(EntityRef),
  voiceActors: z.array(z.object({ region: z.string(), name: z.string() })),
  scenarioStats: CharacterSeed.shape.scenarioStats.unwrap(),
  costumes: z.array(
    z.object({
      name: z.string(),
      description: z.string().nullable(),
      imageUrl: z.string().nullable(),
    }),
  ),
  signatureWeapon: EntityRef.nullable(),
  model3d: MediaRef.nullable(),
}).meta({ description: 'A character of Counter-Strike Online' })
export type CharacterPublic = z.infer<typeof CharacterPublic>

export const WeaponPublic = PublicBase.extend({
  category: WeaponCategory,
  grade: Grade,
  origin: z.string().nullable(),
  manufacturer: z.string().nullable(),
  caliber: z.string().nullable(),
  description: z.string().nullable(),
  stats: WeaponStats,
  statNotes: z.record(z.string(), z.string()),
  ammo: WeaponSeed.shape.ammo.unwrap(),
  price: z.number().int().nullable(),
  fireModes: z.array(z.string()),
  obtainMethod: z.string().nullable(),
  variants: z.array(EntityRef),
  characters: z.array(EntityRef),
  abilities: z.array(z.object({ name: z.string(), description: z.string().nullable() })),
  icon: MediaRef.nullable(),
  model3d: MediaRef.nullable(),
}).meta({ description: 'A weapon of Counter-Strike Online' })
export type WeaponPublic = z.infer<typeof WeaponPublic>

export const ScenarioPublic = PublicBase.extend({
  gameMode: EntityRef.nullable(),
  season: z.string().nullable(),
  chapter: z.number().int().nullable(),
  story: z.string().nullable(),
  objectives: z.array(z.string()),
  bosses: z.array(EntityRef),
  characters: z.array(EntityRef),
  maps: z.array(EntityRef),
  difficulties: z.array(Difficulty),
  rewards: z.array(z.string()),
  nextChapter: EntityRef.nullable(),
}).meta({ description: 'A scenario chapter (e.g. Zombie Scenario)' })
export type ScenarioPublic = z.infer<typeof ScenarioPublic>

export const GameModePublic = PublicBase.extend({
  family: ModeFamily,
  description: z.string().nullable(),
  lore: z.string().nullable(),
  rules: z.array(z.string()),
  maxPlayers: z.number().int().nullable(),
  scenarios: z.array(EntityRef),
}).meta({ description: 'A game mode' })
export type GameModePublic = z.infer<typeof GameModePublic>

export const MapPublic = PublicBase.extend({
  description: z.string().nullable(),
  gameModes: z.array(EntityRef),
  scenario: EntityRef.nullable(),
  location: z.string().nullable(),
}).meta({ description: 'A map' })
export type MapPublic = z.infer<typeof MapPublic>

export const FactionPublic = PublicBase.extend({
  side: Side,
  description: z.string().nullable(),
  lore: z.string().nullable(),
  leaders: z.array(EntityRef),
  members: z.array(EntityRef),
}).meta({ description: 'A faction or organisation' })
export type FactionPublic = z.infer<typeof FactionPublic>

export const MusicPublic = PublicBase.extend({
  title: z.string(),
  composer: z.string().nullable(),
  album: z.string().nullable(),
  durationSeconds: z.number().int().nullable(),
  description: z.string().nullable(),
  usedIn: z.object({
    gameModes: z.array(EntityRef),
    scenarios: z.array(EntityRef),
    maps: z.array(EntityRef),
  }),
  audio: MediaRef.nullable(),
}).meta({ description: 'A soundtrack entry' })
export type MusicPublic = z.infer<typeof MusicPublic>

export { AiGeneration }
