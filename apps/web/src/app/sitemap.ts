import type { MetadataRoute } from 'next'
import { routing } from '@/i18n/routing'
import { ENTITY_PATH, type EntityType, localePrefix } from '@/lib/href'
import { listAllSlugs } from '@/lib/world'

export const revalidate = 3600

const TYPES: EntityType[] = ['characters', 'weapons', 'scenarios', 'game-modes', 'maps', 'factions']
const STATIC = [
  '',
  '/characters',
  '/weapons',
  '/scenarios',
  '/modes',
  '/lore',
  '/music',
  '/factions',
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const entries: MetadataRoute.Sitemap = []
  const perType = await Promise.all(
    TYPES.map(async (type) => [type, await listAllSlugs(type).catch(() => [])] as const),
  )

  for (const locale of routing.locales) {
    const prefix = localePrefix(locale)
    for (const path of STATIC) {
      entries.push({
        url: `${base}${prefix}${path || '/'}`,
        changeFrequency: 'weekly',
        priority: path ? 0.8 : 1,
      })
    }
    for (const [type, slugs] of perType) {
      for (const slug of slugs) {
        entries.push({
          url: `${base}${prefix}/${ENTITY_PATH[type]}/${slug}`,
          changeFrequency: 'monthly',
          priority: 0.6,
        })
      }
    }
  }
  return entries
}
