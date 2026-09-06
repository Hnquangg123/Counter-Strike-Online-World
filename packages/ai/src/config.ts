/**
 * Provider and model registry. Every pipeline reads its defaults from here so a
 * newer model is a one-line change (or an env override) — see docs/AI_PROVIDERS.md.
 */
import { createAnthropic } from '@ai-sdk/anthropic'
import { createFal } from '@ai-sdk/fal'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createReplicate } from '@ai-sdk/replicate'
import type { EmbeddingModel, ImageModel, LanguageModel } from 'ai'

export type TextProvider = 'anthropic' | 'openai' | 'google'
export type ImageProvider = 'fal' | 'openai' | 'google' | 'replicate'
export type EmbeddingProvider = 'openai' | 'google'

const env = (key: string) => process.env[key]?.trim() || undefined

export const DEFAULTS = {
  text: {
    provider: (env('AI_TEXT_PROVIDER') as TextProvider) ?? 'anthropic',
    /** Bulk enrichment: fast and inexpensive. */
    model: env('AI_TEXT_MODEL') ?? 'claude-sonnet-5',
    /** Final-pass lore prose where quality matters most. */
    premiumModel: env('AI_TEXT_PREMIUM_MODEL') ?? 'claude-opus-5',
  },
  image: {
    provider: (env('AI_IMAGE_PROVIDER') as ImageProvider) ?? 'fal',
    models: {
      fal: env('AI_IMAGE_MODEL_FAL') ?? 'fal-ai/flux-pro/v1.1-ultra',
      /** Reference-guided edits keep a character consistent across images. */
      falEdit: env('AI_IMAGE_EDIT_MODEL_FAL') ?? 'fal-ai/flux-pro/kontext/max',
      openai: env('AI_IMAGE_MODEL_OPENAI') ?? 'gpt-image-2',
      google: env('AI_IMAGE_MODEL_GOOGLE') ?? 'gemini-3.1-flash-image-preview',
      replicate: env('AI_IMAGE_MODEL_REPLICATE') ?? 'black-forest-labs/flux-2-pro',
    },
  },
  threeD: {
    /** fal.ai image-to-3D endpoint (verify the current id at fal.ai/models). */
    model: env('AI_3D_MODEL') ?? 'fal-ai/hunyuan3d/v2',
  },
  /** Deterministic clean-up of wiki captures — no generation involved (docs/MEDIA_PIPELINE.md). */
  restore: {
    /** Cutout model. Alternative: 'fal-ai/birefnet/v2' (finer hair/strap edges). */
    removeBackground: env('AI_BG_REMOVE_MODEL') ?? 'fal-ai/bria/background/remove',
    /** Faithful GAN upscaler (no invented detail). Creative alternative: 'fal-ai/clarity-upscaler'. */
    upscale: env('AI_UPSCALE_MODEL') ?? 'fal-ai/aura-sr',
  },
  embeddings: {
    provider: (env('AI_EMBEDDING_PROVIDER') as EmbeddingProvider) ?? 'openai',
    models: {
      openai: env('AI_EMBEDDING_MODEL_OPENAI') ?? 'text-embedding-3-large',
      google: env('AI_EMBEDDING_MODEL_GOOGLE') ?? 'gemini-embedding-2',
    },
  },
} as const

export const hasKey = {
  anthropic: () => Boolean(env('ANTHROPIC_API_KEY')),
  openai: () => Boolean(env('OPENAI_API_KEY')),
  google: () => Boolean(env('GOOGLE_GENERATIVE_AI_API_KEY')),
  fal: () => Boolean(env('FAL_KEY')),
  replicate: () => Boolean(env('REPLICATE_API_TOKEN')),
}

/**
 * Optional: route everything through Vercel AI Gateway with a single key by
 * setting AI_GATEWAY_API_KEY (each provider SDK accepts a baseURL override).
 */
const gateway = env('AI_GATEWAY_API_KEY')

export const providers = {
  anthropic: () =>
    createAnthropic(
      gateway
        ? { apiKey: gateway, baseURL: 'https://ai-gateway.vercel.sh/v1/anthropic' }
        : { apiKey: env('ANTHROPIC_API_KEY') },
    ),
  openai: () =>
    createOpenAI(
      gateway
        ? { apiKey: gateway, baseURL: 'https://ai-gateway.vercel.sh/v1/openai' }
        : { apiKey: env('OPENAI_API_KEY') },
    ),
  google: () => createGoogleGenerativeAI({ apiKey: env('GOOGLE_GENERATIVE_AI_API_KEY') }),
  fal: () => createFal({ apiKey: env('FAL_KEY') }),
  replicate: () => createReplicate({ apiToken: env('REPLICATE_API_TOKEN') }),
}

export const textModel = (
  provider: TextProvider = DEFAULTS.text.provider,
  model = DEFAULTS.text.model,
): LanguageModel => {
  switch (provider) {
    case 'anthropic':
      return providers.anthropic()(model)
    case 'openai':
      return providers.openai()(model)
    case 'google':
      return providers.google()(model)
  }
}

export const imageModel = (
  provider: ImageProvider = DEFAULTS.image.provider,
  model?: string,
): ImageModel => {
  switch (provider) {
    case 'fal':
      return providers.fal().image(model ?? DEFAULTS.image.models.fal)
    case 'openai':
      return providers.openai().image(model ?? DEFAULTS.image.models.openai)
    case 'google':
      return providers.google().image(model ?? DEFAULTS.image.models.google)
    case 'replicate':
      return providers.replicate().image(model ?? DEFAULTS.image.models.replicate)
  }
}

export const embeddingModel = (
  provider: EmbeddingProvider = DEFAULTS.embeddings.provider,
  model?: string,
): EmbeddingModel => {
  switch (provider) {
    case 'openai':
      return providers.openai().textEmbeddingModel(model ?? DEFAULTS.embeddings.models.openai)
    case 'google':
      return providers.google().textEmbeddingModel(model ?? DEFAULTS.embeddings.models.google)
  }
}
