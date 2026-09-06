import fs from 'node:fs/promises'
import path from 'node:path'
import type { AiGeneration } from '@csow/schema'
import { generateImage } from 'ai'
import { DEFAULTS, type ImageProvider, imageModel } from './config'

export type ArtRequest = {
  prompt: string
  negativePrompt?: string
  aspectRatio?: `${number}:${number}`
  seed?: number
  provider?: ImageProvider
  model?: string
  /** Reference images (URLs or data) for character consistency; uses the provider's edit/redux model. */
  referenceImages?: string[]
  n?: number
}

export type ArtResult = {
  files: { path: string; mediaType: string; bytes: number }[]
  generation: AiGeneration
}

const ext = (mediaType: string) =>
  mediaType.includes('png') ? 'png' : mediaType.includes('webp') ? 'webp' : 'jpg'

const fetchBytes = async (url: string) => new Uint8Array(await (await fetch(url)).arrayBuffer())

/**
 * Generate one or more images and save them under `outDir`, returning the
 * provenance record that goes into the media collection's `aiGeneration` group.
 */
export async function generateArt(
  request: ArtRequest,
  outDir: string,
  baseName: string,
): Promise<ArtResult> {
  const provider = request.provider ?? DEFAULTS.image.provider
  const useEdit = Boolean(request.referenceImages?.length) && provider === 'fal'
  const modelId =
    request.model ?? (useEdit ? DEFAULTS.image.models.falEdit : DEFAULTS.image.models[provider])
  const model = imageModel(provider, modelId)

  const prompt = request.referenceImages?.length
    ? { text: request.prompt, images: await Promise.all(request.referenceImages.map(fetchBytes)) }
    : request.prompt

  const providerOptions: Record<string, Record<string, string | number | boolean>> = {}
  if (request.negativePrompt && (provider === 'fal' || provider === 'replicate')) {
    providerOptions[provider] = { negative_prompt: request.negativePrompt }
  }
  if (provider === 'openai') providerOptions.openai = { quality: 'high', background: 'auto' }

  const { images, warnings } = await generateImage({
    model,
    prompt,
    n: request.n ?? 1,
    aspectRatio: request.aspectRatio ?? '3:4',
    seed: request.seed,
    providerOptions,
  })
  for (const w of warnings) console.error(`[ai/images] ${provider}:`, JSON.stringify(w))

  await fs.mkdir(outDir, { recursive: true })
  const files = []
  for (const [i, img] of images.entries()) {
    const file = path.join(
      outDir,
      `${baseName}${images.length > 1 ? `-${i + 1}` : ''}.${ext(img.mediaType)}`,
    )
    await fs.writeFile(file, img.uint8Array)
    files.push({ path: file, mediaType: img.mediaType, bytes: img.uint8Array.byteLength })
  }

  return {
    files,
    generation: {
      provider,
      model: modelId,
      prompt: request.prompt,
      negativePrompt: request.negativePrompt,
      seed: request.seed,
      referenceImages: request.referenceImages,
      generatedAt: new Date().toISOString(),
    },
  }
}
