import { CharacterSeed, WeaponSeed } from '@csow/schema'
import { describe, expect, it } from 'vitest'
import { ART_DIRECTION, characterPrompt, weaponPrompt } from './prompts'

describe('prompt library', () => {
  it('builds a character hero prompt with the shared art direction and grade lighting', () => {
    const anemone = CharacterSeed.parse({
      slug: 'anemone',
      name: 'Anemone',
      side: 'tr',
      grade: 'transcendent',
      profile: { gender: 'Female', occupation: { en: 'Pro gamer of Krono World' } },
      tagline: { en: "Krono World's record-breaking pro gamer." },
    })
    const spec = characterPrompt(anemone, 'hero')
    expect(spec.prompt.startsWith(ART_DIRECTION)).toBe(true)
    expect(spec.prompt).toContain('Anemone')
    expect(spec.prompt).toContain('Terrorist-side operator')
    expect(spec.prompt).toContain('cyan')
    expect(spec.aspectRatio).toBe('3:4')
    expect(spec.negativePrompt).toContain('watermark')
  })

  it('builds a side-profile weapon prompt', () => {
    const ak = WeaponSeed.parse({
      slug: 'ak-47',
      name: 'AK-47',
      category: 'assault-rifle',
      grade: 'common',
      origin: 'Soviet Union',
    })
    const spec = weaponPrompt(ak)
    expect(spec.prompt).toContain('AK-47')
    expect(spec.prompt).toContain('assault rifle')
    expect(spec.prompt).toContain('side profile')
    expect(spec.aspectRatio).toBe('16:9')
  })
})
