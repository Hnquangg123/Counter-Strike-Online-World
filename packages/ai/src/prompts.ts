/**
 * Prompt library. The art direction is the heart of "the soul of CSO": every
 * generated asset should look like it came from the same dark, orange-lit lobby.
 */
import type { CharacterSeed, WeaponSeed } from '@csow/schema'

export const WORLD_BRIEF = `Counter-Strike Online (CSO) is Nexon's 2008–2026 spin-off of Counter-Strike: a tactical shooter that grew a
sprawling zombie saga (the Rex Virus, the Aegis Institute, Vanguard Company, Kronos), original characters with
Transcendent-grade classes, and hundreds of original weapons. Its visual language: dark charcoal metal panels with
chamfered corners, CS orange (#F58A07) accents, cyan for Transcendent grade, toxic green for zombie modes, hazard
yellow for scenarios, spotlit character renders on black, side-profile weapon icons, HUD numerals.`

export const EDITORIAL_VOICE = `Write like the narrator of a beloved game's memorial archive: vivid, precise, warm, never cheesy.
Faithful to the wiki facts (never invent lore); short paragraphs; present tense for the world, past tense for release history.
British or American spelling is fine but be consistent. Do not mention "the wiki" in the prose.`

/** Shared art direction prefix for every image. */
export const ART_DIRECTION = `Counter-Strike Online official-style promotional render, Nexon 2020s key art quality. Dark charcoal
studio backdrop with subtle tactical grid, dramatic top spotlight, warm orange (#F58A07) rim light from the left and
cool steel-blue fill from the right, cinematic depth of field, ultra-detailed materials (fabric weave, worn metal,
polymer), volumetric dust, 8k, sharp focus, no text, no watermark, no logo.`

export const NEGATIVE =
  'text, watermark, logo, signature, blurry, deformed hands, extra fingers, low quality, cropped, cartoon, anime, chibi'

const GRADE_LIGHT: Record<string, string> = {
  transcendent: 'iridescent cyan (#5CF2FF) energy accents and faint holographic particles',
  epic: 'gold (#FFB13B) accents',
  unique: 'violet (#B36BFF) accents',
  rare: 'blue (#3F8CFF) accents',
  common: 'muted steel accents',
}

/** Full-figure hero render for a character page. */
export const characterPrompt = (
  c: CharacterSeed,
  variant: 'hero' | 'portrait' | 'action' = 'hero',
) => {
  const side =
    c.side === 'ct'
      ? 'Counter-Terrorist operator'
      : c.side === 'tr'
        ? 'Terrorist-side operator'
        : c.kind === 'boss'
          ? 'colossal zombie boss creature'
          : c.kind === 'zombie'
            ? 'mutated zombie'
            : 'character'
  const framing =
    variant === 'portrait'
      ? 'chest-up portrait, three-quarter view, eyes toward camera'
      : variant === 'action'
        ? 'dynamic mid-action pose, low angle, motion energy'
        : 'full body, confident standing pose on a dark chamfered pedestal, slight low angle'
  const profile = [c.profile.gender, c.profile.occupation?.en, c.classType]
    .filter(Boolean)
    .join(', ')
  return {
    prompt: `${ART_DIRECTION}
Subject: ${c.name}, ${side} from Counter-Strike Online. ${profile}. ${c.tagline?.en ?? ''}
${c.summary?.en ?? ''}
Framing: ${framing}. Wardrobe and gear faithful to the character's canonical design. ${GRADE_LIGHT[c.grade] ?? ''}.`
      .replace(/\s+\n/g, '\n')
      .trim(),
    negativePrompt: NEGATIVE,
    aspectRatio: (variant === 'portrait' ? '1:1' : '3:4') as '1:1' | '3:4',
  }
}

/** Side-profile "armory" render for a weapon page. */
export const weaponPrompt = (w: WeaponSeed, variant: 'profile' | 'hero' = 'profile') => ({
  prompt: `${ART_DIRECTION}
Subject: the ${w.name}, a ${w.category.replace('-', ' ')} from Counter-Strike Online${w.origin ? ` (${w.origin} design)` : ''}.
${w.tagline?.en ?? ''} ${w.summary?.en ?? ''}
Framing: ${variant === 'profile' ? 'exact side profile, left-facing, centred, floating above the pedestal, museum lighting' : 'three-quarter hero angle, dramatic, muzzle toward lower-left'}.
Materials: ${GRADE_LIGHT[w.grade] ?? 'gunmetal and polymer'}; every mechanical detail crisp.`
    .replace(/\s+\n/g, '\n')
    .trim(),
  negativePrompt: NEGATIVE,
  aspectRatio: '16:9' as const,
})

export const ENRICH_SYSTEM = `${WORLD_BRIEF}\n\n${EDITORIAL_VOICE}\n\nYou receive one entity as JSON. Return the requested fields only.`

export const TRANSLATE_SYSTEM = (
  locale: string,
) => `You translate an English archive about Counter-Strike Online into ${locale === 'vi' ? 'Vietnamese (tiếng Việt)' : locale}.
Keep proper nouns (character names, weapon names, map names, organisation names, mode names like "Zombie Scenario") in
their original form. Keep Markdown structure intact. Natural, fluent, respectful of gaming terminology used by the
${locale === 'vi' ? 'Vietnamese CSO community (e.g. "phe Cảnh sát/Khủng bố", "chế độ Zombie")' : 'local community'}.
Return the same JSON shape with translated string values.`
