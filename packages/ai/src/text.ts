import type { Locale } from '@csow/schema'
import { generateObject } from 'ai'
import { z } from 'zod'
import { DEFAULTS, type TextProvider, textModel } from './config'
import { ENRICH_SYSTEM, TRANSLATE_SYSTEM } from './prompts'

export const Enrichment = z.object({
  tagline: z.string().max(140).describe('One line that captures the essence, no trailing period'),
  summary: z.string().max(600).describe('2–3 sentences for cards and search results'),
  story: z
    .string()
    .describe(
      'The story rewritten as polished Markdown prose, faithful to the facts; keep headings',
    ),
  seoDescription: z.string().max(160),
  tags: z
    .array(z.string())
    .max(8)
    .describe('Lowercase kebab-case topical tags, e.g. transcendent, krono-world, twin'),
  hooks: z
    .array(z.string())
    .max(3)
    .describe('Short intriguing facts a visitor would want to click on'),
})
export type Enrichment = z.infer<typeof Enrichment>

export type EnrichInput = {
  kind: string
  name: string
  tagline?: string
  summary?: string
  story?: string
  facts?: Record<string, unknown>
}

/** Rewrite one entity's English text with structured output. */
export async function enrich(
  input: EnrichInput,
  options: { provider?: TextProvider; model?: string; premium?: boolean } = {},
): Promise<{ result: Enrichment; usage: { inputTokens?: number; outputTokens?: number } }> {
  const model = textModel(
    options.provider,
    options.model ?? (options.premium ? DEFAULTS.text.premiumModel : DEFAULTS.text.model),
  )
  const { object, usage } = await generateObject({
    model,
    schema: Enrichment,
    schemaName: 'Enrichment',
    system: ENRICH_SYSTEM,
    prompt: JSON.stringify(input, null, 2),
    temperature: 0.6,
  })
  return {
    result: object,
    usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens },
  }
}

/**
 * Translate a flat record of English strings (or Markdown) into another locale.
 * Keys are preserved so the caller can write them back into LocalizedText.
 */
export async function translateRecord(
  strings: Record<string, string>,
  locale: Locale,
  options: { provider?: TextProvider; model?: string } = {},
): Promise<{
  result: Record<string, string>
  usage: { inputTokens?: number; outputTokens?: number }
}> {
  const keys = Object.keys(strings)
  if (!keys.length) return { result: {}, usage: {} }
  const shape = Object.fromEntries(keys.map((k) => [k, z.string()])) as Record<string, z.ZodString>
  const { object, usage } = await generateObject({
    model: textModel(options.provider, options.model),
    schema: z.object(shape),
    system: TRANSLATE_SYSTEM(locale),
    prompt: JSON.stringify(strings, null, 2),
    temperature: 0.3,
  })
  return {
    result: object as Record<string, string>,
    usage: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens },
  }
}
