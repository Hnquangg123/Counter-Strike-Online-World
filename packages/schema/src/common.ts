import { z } from 'zod'
import { type Locale, MediaKind, Region } from './enums'

/** URL-safe identifier: lowercase, digits and single hyphens. */
export const Slug = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case')
  .meta({ description: 'URL-safe identifier', example: 'anemone' })
export type Slug = z.infer<typeof Slug>

/**
 * Text that exists in several locales. `en` is required because it is the
 * source language of the archive; every other locale is optional.
 */
export const LocalizedText = z
  .object({
    en: z.string(),
    vi: z.string().optional(),
  })
  .meta({ description: 'Text in each supported locale (en is the source language)' })
export type LocalizedText = z.infer<typeof LocalizedText>

export const pickLocale = (text: LocalizedText | undefined, locale: Locale): string | undefined =>
  text ? (text[locale] ?? text.en) : undefined

/** Where a piece of knowledge came from. Attribution is a licence requirement (CC BY-SA 3.0). */
export const WikiSource = z
  .object({
    url: z.url().meta({ example: 'https://cso.fandom.com/wiki/Anemone' }),
    title: z.string().optional(),
    revisionId: z.number().int().optional(),
    fetchedAt: z.iso.datetime().optional(),
    license: z.literal('CC-BY-SA-3.0').default('CC-BY-SA-3.0'),
  })
  .meta({
    description: 'Source attribution for content adapted from the Counter-Strike Online Wiki',
  })
export type WikiSource = z.infer<typeof WikiSource>

/** A dated release in one regional service. Dates may be partial (year, or year-month). */
export const RegionalRelease = z.object({
  region: Region,
  date: z
    .string()
    .regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, 'YYYY, YYYY-MM or YYYY-MM-DD')
    .optional(),
  note: z.string().optional(),
})
export type RegionalRelease = z.infer<typeof RegionalRelease>

/** How an asset was produced by AI, kept for transparency and reproducibility. */
export const AiGeneration = z.object({
  provider: z.string().meta({ example: 'fal' }),
  model: z.string().meta({ example: 'fal-ai/flux-pro/v1.1-ultra' }),
  prompt: z.string(),
  negativePrompt: z.string().optional(),
  seed: z.number().int().optional(),
  referenceImages: z.array(z.string()).optional(),
  generatedAt: z.iso.datetime().optional(),
})
export type AiGeneration = z.infer<typeof AiGeneration>

/** A media asset reference as exposed by the public API. */
export const MediaRef = z
  .object({
    id: z.string(),
    kind: MediaKind,
    url: z.string(),
    width: z.number().int().optional(),
    height: z.number().int().optional(),
    alt: z.string().optional(),
    caption: z.string().optional(),
    credit: z.string().optional(),
    mimeType: z.string().optional(),
    sizes: z
      .record(
        z.string(),
        z.object({
          url: z.string(),
          width: z.number().int().optional(),
          height: z.number().int().optional(),
        }),
      )
      .optional(),
    aiGeneration: AiGeneration.optional(),
  })
  .meta({ description: 'A media asset (image, audio, 3D model)' })
export type MediaRef = z.infer<typeof MediaRef>

/** A media asset as described in seed/ingest data before upload. */
export const MediaInput = z.object({
  kind: MediaKind,
  /** Remote URL (wiki) or a path relative to the data/ directory. */
  src: z.string(),
  alt: z.string().optional(),
  caption: LocalizedText.optional(),
  credit: z.string().optional(),
  sourceUrl: z.string().optional(),
  aiGeneration: AiGeneration.optional(),
})
export type MediaInput = z.infer<typeof MediaInput>

export const Quote = z.object({
  text: LocalizedText,
  context: LocalizedText.optional(),
})
export type Quote = z.infer<typeof Quote>

export const NamedDescription = z.object({
  name: LocalizedText,
  description: LocalizedText.optional(),
})
export type NamedDescription = z.infer<typeof NamedDescription>

export const Timestamps = z.object({
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
