import type { Locale } from '@csow/schema'
import { routing } from '@/i18n/routing'

export type EntityType =
  | 'characters'
  | 'weapons'
  | 'scenarios'
  | 'game-modes'
  | 'maps'
  | 'factions'
  | 'music'

/** Path segment used on the public site for each entity type. */
export const ENTITY_PATH: Record<EntityType, string> = {
  characters: 'characters',
  weapons: 'weapons',
  scenarios: 'scenarios',
  'game-modes': 'modes',
  maps: 'maps',
  factions: 'factions',
  music: 'music',
}

export const localePrefix = (locale: Locale | string) =>
  locale === routing.defaultLocale ? '' : `/${locale}`

/** Canonical site path for an entity in a locale (English is unprefixed). */
export const entityHref = (type: EntityType, slug: string, locale: Locale | string = 'en') =>
  `${localePrefix(locale)}/${ENTITY_PATH[type]}/${slug}`

export const absoluteUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}${path}`
