import { z } from 'zod'

/**
 * Locales the world speaks. `en` is the source language; `vi` is the first
 * translation. Add a locale here and in `apps/web/src/payload.config.ts`.
 */
export const Locale = z.enum(['en', 'vi'])
export type Locale = z.infer<typeof Locale>
export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALES = Locale.options

/** Which side of the eternal war a character or item belongs to. */
export const Side = z.enum(['ct', 'tr', 'zombie', 'neutral'])
export type Side = z.infer<typeof Side>

/** The nature of a character entry. */
export const CharacterKind = z.enum(['human', 'zombie', 'boss', 'npc'])
export type CharacterKind = z.infer<typeof CharacterKind>

/**
 * Item grades as used by Counter-Strike Online for weapons, characters and
 * costumes. Grade colours are part of the design system (see DESIGN_SYSTEM.md).
 */
export const Grade = z.enum(['common', 'rare', 'unique', 'epic', 'transcendent', 'unknown'])
export type Grade = z.infer<typeof Grade>

export const WeaponCategory = z.enum([
  'pistol',
  'shotgun',
  'submachine-gun',
  'assault-rifle',
  'sniper-rifle',
  'machine-gun',
  'melee',
  'grenade',
  'equipment',
  'special',
  'zombie',
])
export type WeaponCategory = z.infer<typeof WeaponCategory>

/**
 * Regional services of Counter-Strike Online. Each had its own publisher,
 * release cadence and exclusives, so release information is tracked per region.
 */
export const Region = z.enum(['kr', 'cn', 'tw', 'jp', 'id', 'vn', 'sg', 'th', 'tr', 'ru', 'csn'])
export type Region = z.infer<typeof Region>

export const REGION_LABELS: Record<Region, { name: string; publisher: string }> = {
  kr: { name: 'South Korea', publisher: 'Nexon Korea' },
  cn: { name: 'China', publisher: 'Tiancity' },
  tw: { name: 'Taiwan / Hong Kong', publisher: 'Beanfun! (Gamania)' },
  jp: { name: 'Japan', publisher: 'Nexon Japan' },
  id: { name: 'Indonesia', publisher: 'Megaxus' },
  vn: { name: 'Vietnam', publisher: 'VTC Game' },
  sg: { name: 'Singapore / Malaysia', publisher: 'Asiasoft' },
  th: { name: 'Thailand', publisher: 'Asiasoft Thailand' },
  tr: { name: 'Turkey', publisher: 'Joygame' },
  ru: { name: 'Russia / CIS', publisher: '101XP' },
  csn: { name: 'Global (Steam)', publisher: 'Nexon — Counter-Strike Nexon' },
}

/** Families of game modes; each family tells a different kind of story. */
export const ModeFamily = z.enum([
  'original',
  'zombie',
  'scenario',
  'fun',
  'pve',
  'competitive',
  'other',
])
export type ModeFamily = z.infer<typeof ModeFamily>

/** Kinds of media assets stored in the world. */
export const MediaKind = z.enum([
  'icon',
  'render',
  'portrait',
  'artwork',
  'screenshot',
  'hud',
  'minimap',
  'audio',
  'model-3d',
  'video',
  'other',
])
export type MediaKind = z.infer<typeof MediaKind>

export const Difficulty = z.enum(['easy', 'normal', 'hard', 'very-hard', 'nightmare', 'unknown'])
export type Difficulty = z.infer<typeof Difficulty>
