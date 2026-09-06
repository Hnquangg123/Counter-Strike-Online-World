import fs from 'node:fs/promises'
import path from 'node:path'
import { fal } from '@fal-ai/client'
import sharp from 'sharp'
import { DEFAULTS } from './config'

/**
 * RESTORE track of the media pipeline (docs/MEDIA_PIPELINE.md).
 *
 * Takes a wiki capture — typically Nexon's shop/in-game model shot on a white
 * or grey studio background — and turns it into a clean, transparent,
 * high-resolution cutout we host ourselves:
 *
 *   source → [AuraSR ×2/×4 upscale] → background removal → trim + pad → PNG
 *
 * Nothing is invented: upscaling is a faithful super-resolution pass and the
 * cutout only removes background pixels, so the result stays canon and keeps
 * its `fair-use` licence with attribution. Generative re-imagining lives in
 * images.ts (`pnpm ai -- art`).
 */

export type RestoreStep = {
  step: 'fetch-source' | 'upload' | 'upscale' | 'remove-background' | 'trim'
  model?: string
  requestId?: string
  ms: number
}

export type RestoreRequest = {
  /** http(s) URL (wiki) or a local path. */
  source: string
  outDir: string
  baseName: string
  /** Run the super-resolution pass first (default false — many portraits are already large). */
  upscale?: boolean
  /** 2 or 4 (AuraSR is trained for ×4). */
  upscaleFactor?: number
  /** Cut the subject out (default true). */
  removeBackground?: boolean
  /** Transparent margin added around the trimmed subject, as a fraction of the longest side. */
  padRatio?: number
  models?: Partial<{ removeBackground: string; upscale: string }>
}

export type RestoreResult = {
  path: string
  sourcePath: string
  source: string
  bytes: number
  width: number
  height: number
  sourceWidth?: number
  sourceHeight?: number
  steps: RestoreStep[]
  restoredAt: string
}

type FalImage = { url: string; width?: number; height?: number; content_type?: string }

const USER_AGENT = 'CounterStrikeOnlineWorld/0.1 (+https://cso.world; archive tooling)'

const extensionFor = (source: string, contentType?: string | null) => {
  const fromType = contentType?.split(';')[0]?.trim()
  if (fromType === 'image/png') return 'png'
  if (fromType === 'image/jpeg') return 'jpg'
  if (fromType === 'image/webp') return 'webp'
  if (fromType === 'image/gif') return 'gif'
  const m = source.match(/\.(png|jpe?g|webp|gif)(?=$|[/?#])/i)
  return m ? m[1]!.toLowerCase().replace('jpeg', 'jpg') : 'png'
}

const mimeFor = (ext: string) =>
  ({ png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' })[ext] ??
  'application/octet-stream'

/** Full-resolution wiki URL: drop the `?cb=` cache-buster and any scale-to-width suffix. */
export const originalWikiUrl = (url: string) =>
  url.includes('static.wikia.nocookie.net')
    ? `${url.replace(/\/revision\/latest.*$/, '')}/revision/latest`
    : url

async function fetchSource(source: string): Promise<{ bytes: Buffer; ext: string }> {
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(originalWikiUrl(source), {
      headers: { 'user-agent': USER_AGENT, accept: 'image/*' },
    })
    if (!res.ok) throw new Error(`source fetch failed (${res.status}) for ${source}`)
    return {
      bytes: Buffer.from(await res.arrayBuffer()),
      ext: extensionFor(source, res.headers.get('content-type')),
    }
  }
  return { bytes: await fs.readFile(source), ext: extensionFor(source) }
}

const pickImage = (data: unknown, model: string): FalImage => {
  const d = (data ?? {}) as Record<string, unknown>
  const image =
    (d.image as FalImage | undefined) ??
    (Array.isArray(d.images) ? (d.images[0] as FalImage | undefined) : undefined)
  if (!image?.url)
    throw new Error(`no image in response from ${model}: keys ${JSON.stringify(Object.keys(d))}`)
  return image
}

const timed = async <T>(fn: () => Promise<T>): Promise<[T, number]> => {
  const t0 = Date.now()
  const value = await fn()
  return [value, Date.now() - t0]
}

export async function restoreImage(req: RestoreRequest): Promise<RestoreResult> {
  if (!process.env.FAL_KEY) throw new Error('FAL_KEY is required for restore (fal.ai)')
  fal.config({ credentials: process.env.FAL_KEY })

  const models = { ...DEFAULTS.restore, ...req.models }
  const steps: RestoreStep[] = []
  await fs.mkdir(req.outDir, { recursive: true })

  // 1. Keep the original next to the result — provenance and a cache for re-runs.
  const [{ bytes: sourceBytes, ext }, fetchMs] = await timed(() => fetchSource(req.source))
  steps.push({ step: 'fetch-source', ms: fetchMs })
  const sourcePath = path.join(req.outDir, `${req.baseName}.source.${ext}`)
  await fs.writeFile(sourcePath, sourceBytes)
  const sourceMeta = await sharp(sourceBytes).metadata()

  // 2. fal reads inputs by URL; upload the bytes so wiki and local sources behave the same.
  const [uploaded, uploadMs] = await timed(() =>
    fal.storage.upload(new Blob([new Uint8Array(sourceBytes)], { type: mimeFor(ext) })),
  )
  steps.push({ step: 'upload', ms: uploadMs })
  let current = uploaded

  // 3. Optional faithful upscale — before the cutout, so the matte is computed at full resolution
  //    (GAN upscalers work in RGB and would drop the alpha channel if run afterwards).
  if (req.upscale) {
    const factor = req.upscaleFactor ?? 4
    const isAuraSr = /aura-sr/i.test(models.upscale)
    const [result, ms] = await timed(() =>
      fal.subscribe(models.upscale, {
        input: {
          image_url: current,
          upscale_factor: factor,
          ...(isAuraSr ? { checkpoint: 'v2', overlapping_tiles: true } : {}),
        },
        logs: false,
      }),
    )
    current = pickImage(result.data, models.upscale).url
    steps.push({ step: 'upscale', model: models.upscale, requestId: result.requestId, ms })
  }

  // 4. Cut the subject out of the studio background.
  const removeBackground = req.removeBackground ?? true
  if (removeBackground) {
    const isBiRefNet = /birefnet/i.test(models.removeBackground)
    const [result, ms] = await timed(() =>
      fal.subscribe(models.removeBackground, {
        input: {
          image_url: current,
          ...(isBiRefNet
            ? {
                model: 'General Use (Heavy)',
                operating_resolution: '2048x2048',
                output_format: 'png',
                refine_foreground: true,
              }
            : {}),
        },
        logs: false,
      }),
    )
    current = pickImage(result.data, models.removeBackground).url
    steps.push({
      step: 'remove-background',
      model: models.removeBackground,
      requestId: result.requestId,
      ms,
    })
  }

  // 5. Trim empty margins, add breathing room, encode as PNG.
  const resultRes = await fetch(current)
  if (!resultRes.ok) throw new Error(`could not download result (${resultRes.status})`)
  let pipeline = sharp(Buffer.from(await resultRes.arrayBuffer()))
  const [trimmed, trimMs] = await timed(async () => {
    if (!removeBackground) return pipeline.png({ compressionLevel: 9 }).toBuffer()
    const transparent = { r: 0, g: 0, b: 0, alpha: 0 }
    const cut = await pipeline
      .ensureAlpha()
      .trim({ background: transparent, threshold: 12 })
      .toBuffer({ resolveWithObject: true })
    const pad = Math.round(Math.max(cut.info.width, cut.info.height) * (req.padRatio ?? 0.04))
    pipeline = sharp(cut.data).extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: transparent,
    })
    return pipeline.png({ compressionLevel: 9 }).toBuffer()
  })
  steps.push({ step: 'trim', ms: trimMs })

  const outPath = path.join(req.outDir, `${req.baseName}.png`)
  await fs.writeFile(outPath, trimmed)
  const meta = await sharp(trimmed).metadata()

  return {
    path: outPath,
    sourcePath,
    source: req.source,
    bytes: trimmed.byteLength,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    sourceWidth: sourceMeta.width,
    sourceHeight: sourceMeta.height,
    steps,
    restoredAt: new Date().toISOString(),
  }
}

/** Human-readable credit line for a restored asset. */
export const restoredCredit = (steps: RestoreStep[], factor?: number) => {
  const work: string[] = []
  if (steps.some((s) => s.step === 'upscale')) work.push(`upscaled ×${factor ?? 4}`)
  if (steps.some((s) => s.step === 'remove-background')) work.push('background removed')
  return `Nexon via Counter-Strike Online Wiki${work.length ? ` — restored (${work.join(', ')})` : ''}`
}
