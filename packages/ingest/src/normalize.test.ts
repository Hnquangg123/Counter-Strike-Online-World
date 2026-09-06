import { describe, expect, it } from 'vitest'
import { gradeOf, weaponCategoryOf } from './mappers'
import { isoDate, listOf, parseReleases, regionOf, slugify, statNumber } from './normalize'
import { parseWikitext } from './wiki/parse'

describe('normalize', () => {
  it('slugifies names with diacritics', () => {
    expect(slugify('Choi Ji Yoon')).toBe('choi-ji-yoon')
    expect(slugify('BALROG-VII')).toBe('balrog-vii')
    expect(slugify('Thanatos-7')).toBe('thanatos-7')
    expect(slugify('Đội Đặc Nhiệm')).toBe('doi-dac-nhiem')
  })

  it('parses dates in the wiki’s many formats', () => {
    expect(isoDate('July 1, 2021')).toBe('2021-07-01')
    expect(isoDate('1 July 2021')).toBe('2021-07-01')
    expect(isoDate('2021-07-14')).toBe('2021-07-14')
    expect(isoDate('2021.07.14')).toBe('2021-07-14')
    expect(isoDate('June 2024')).toBe('2024-06')
    expect(isoDate('sometime in 2009')).toBe('2009')
    expect(isoDate('unknown')).toBeUndefined()
  })

  it('detects regions and release blocks', () => {
    expect(regionOf('South Korea')).toBe('kr')
    expect(regionOf('Taiwan/Hong Kong')).toBe('tw')
    expect(regionOf('CSN:Z')).toBe('csn')
    expect(parseReleases('South Korea: 1 July 2021\nTaiwan/Hong Kong: 14 July 2021')).toEqual([
      { region: 'kr', date: '2021-07-01' },
      { region: 'tw', date: '2021-07-14' },
    ])
  })

  it('reads stat bars but not prose', () => {
    expect(statNumber('83%')).toBe(83)
    expect(statNumber('28 (Normal) / 40-47 (Zombie)')).toBe(28)
    expect(statNumber('High')).toBeUndefined()
    expect(statNumber('433')).toBeUndefined()
  })

  it('splits lists without breaking parentheses', () => {
    expect(listOf('AK-47, M4A1 (Silencer), AWP')).toEqual(['AK-47', 'M4A1 (Silencer)', 'AWP'])
  })

  it('infers grades and categories', () => {
    expect(gradeOf('Transcendent class')).toBe('transcendent')
    expect(gradeOf('Epic weapon')).toBe('epic')
    expect(weaponCategoryOf('Sniper rifle', [])).toBe('sniper-rifle')
    expect(weaponCategoryOf(undefined, ['Machine guns'])).toBe('machine-gun')
  })
})

describe('parseWikitext', () => {
  it('extracts infobox, intro and sections', () => {
    const page = parseWikitext(
      'Anemone',
      `{{Infobox character
| name = Anemone
| gender = Female
| faction = Terrorist
| date added = July 1, 2021
}}
'''Anemone''' is a pro gamer of [[Krono World]].

== Overview ==
She protects her twin sister [[Mirage]].

== Trivia ==
* Anemone is a genus of flowering plants.

[[Category:Terrorist]]
[[Category:Characters]]`,
    )
    expect(page.infobox.name).toBe('Anemone')
    expect(page.infobox.gender).toBe('Female')
    expect(page.infobox.dateadded).toBe('July 1, 2021')
    expect(page.intro).toContain('pro gamer of Krono World')
    expect(page.sections.map((s) => s.title)).toEqual(['Overview', 'Trivia'])
    expect(page.categories).toEqual(['Terrorist', 'Characters'])
    expect(page.markdown).toContain('## Overview')
  })
})
