import { describe, expect, it } from 'vitest'
import { CharacterSeed, PaginationQuery, SeedBundle, Slug, WeaponSeed } from './index'

describe('@csow/schema', () => {
  it('accepts kebab-case slugs only', () => {
    expect(Slug.safeParse('anemone').success).toBe(true)
    expect(Slug.safeParse('thanatos-7').success).toBe(true)
    expect(Slug.safeParse('Anemone').success).toBe(false)
    expect(Slug.safeParse('double--gate').success).toBe(false)
  })

  it('fills defaults for a minimal character', () => {
    const parsed = CharacterSeed.parse({ slug: 'anemone', name: 'Anemone' })
    expect(parsed.kind).toBe('human')
    expect(parsed.side).toBe('neutral')
    expect(parsed.quotes).toEqual([])
    expect(parsed.profile).toEqual({})
  })

  it('requires a weapon category', () => {
    expect(WeaponSeed.safeParse({ slug: 'ak-47', name: 'AK-47' }).success).toBe(false)
    expect(
      WeaponSeed.safeParse({ slug: 'ak-47', name: 'AK-47', category: 'assault-rifle' }).success,
    ).toBe(true)
  })

  it('coerces pagination query strings', () => {
    const q = PaginationQuery.parse({ page: '2', limit: '50' })
    expect(q).toMatchObject({ page: 2, limit: 50, locale: 'en' })
    expect(PaginationQuery.safeParse({ limit: '500' }).success).toBe(false)
  })

  it('parses an empty seed bundle', () => {
    expect(SeedBundle.parse({}).characters).toEqual([])
  })
})
