import sharp from 'sharp'

/**
 * Remote media health + tone check used by `pnpm ingest -- verify-media`.
 *
 * Tone mirrors apps/web/src/lib/image-tone.ts: the border ring of a small
 * rendition decides whether an image is a transparent cutout, a light studio
 * capture (candidate for `pnpm ai -- restore`), or dark/busy art.
 */

export type MediaTone = 'light' | 'dark' | 'transparent' | 'unknown'

export type MediaCheck = {
  url: string
  ok: boolean
  status: number
  contentType?: string
  bytes?: number
  width?: number
  height?: number
  tone?: MediaTone
  error?: string
  ms: number
}

const WIKI_HOST = 'static.wikia.nocookie.net'
const SAMPLE = 24
const RING = 2
const USER_AGENT = 'CSOW-ingest/0.1 (fan archive; media verification)'

/** Border-ring classifier — identical thresholds to the client-side probe. */
export const classifyTone = (rgba: ArrayLike<number>, size = SAMPLE): MediaTone => {
  let ring = 0
  let transparent = 0
  let lumSum = 0
  let lumSq = 0
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!(x < RING || y < RING || x >= size - RING || y >= size - RING)) continue
      const i = (y * size + x) * 4
      ring++
      if ((rgba[i + 3] ?? 0) < 40) {
        transparent++
        continue
      }
      const lum =
        (0.2126 * (rgba[i] ?? 0) + 0.7152 * (rgba[i + 1] ?? 0) + 0.0722 * (rgba[i + 2] ?? 0)) / 255
      lumSum += lum
      lumSq += lum * lum
    }
  }
  if (!ring) return 'unknown'
  if (transparent / ring > 0.5) return 'transparent'
  const opaque = ring - transparent
  const mean = lumSum / opaque
  const variance = lumSq / opaque - mean * mean
  return mean > 0.8 && variance < 0.03 ? 'light' : 'dark'
}

/** Wiki CDN: ask for a small rendition so verification stays cheap. */
export const sampleUrl = (url: string) => {
  if (!url.includes(WIKI_HOST)) return url
  const clean = url.replace(/\/revision\/latest.*$/, '')
  if (/\.(gif|svg|ogg|mp3|wav|glb)$/i.test(clean)) return `${clean}/revision/latest`
  return `${clean}/revision/latest/scale-to-width-down/128`
}

export const originalUrl = (url: string) =>
  url.includes(WIKI_HOST) ? `${url.replace(/\/revision\/latest.*$/, '')}/revision/latest` : url

export async function checkMedia(url: string, { tone = true } = {}): Promise<MediaCheck> {
  const t0 = Date.now()
  try {
    const res = await fetch(sampleUrl(url), {
      headers: { 'user-agent': USER_AGENT, accept: 'image/*,audio/*,*/*' },
      redirect: 'follow',
    })
    const contentType = res.headers.get('content-type') ?? undefined
    const out: MediaCheck = { url, ok: res.ok, status: res.status, contentType, ms: 0 }
    if (!res.ok) {
      out.ms = Date.now() - t0
      return out
    }
    const bytes = Buffer.from(await res.arrayBuffer())
    out.bytes = bytes.byteLength
    if (tone && contentType?.startsWith('image/') && !/gif|svg/.test(contentType)) {
      try {
        const meta = await sharp(bytes).metadata()
        out.width = meta.width
        out.height = meta.height
        const { data } = await sharp(bytes)
          .ensureAlpha()
          .resize(SAMPLE, SAMPLE, { fit: 'fill' })
          .raw()
          .toBuffer({ resolveWithObject: true })
        out.tone = classifyTone(data, SAMPLE)
      } catch (err) {
        out.tone = 'unknown'
        out.error = `decode: ${(err as Error).message}`
      }
    }
    out.ms = Date.now() - t0
    return out
  } catch (err) {
    return { url, ok: false, status: 0, error: (err as Error).message, ms: Date.now() - t0 }
  }
}

/** Run checks with bounded concurrency and a polite gap between requests per worker. */
export async function checkAll(
  urls: string[],
  {
    concurrency = 4,
    delayMs = 150,
    tone = true,
    onResult,
  }: {
    concurrency?: number
    delayMs?: number
    tone?: boolean
    onResult?: (check: MediaCheck, index: number, total: number) => void
  } = {},
): Promise<MediaCheck[]> {
  const results: MediaCheck[] = new Array(urls.length)
  let next = 0
  const worker = async () => {
    while (next < urls.length) {
      const i = next++
      const check = await checkMedia(urls[i]!, { tone })
      results[i] = check
      onResult?.(check, i, urls.length)
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker))
  return results
}
