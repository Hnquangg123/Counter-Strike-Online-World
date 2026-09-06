/**
 * Image tone detection for tiles.
 *
 * Many wiki assets are Nexon shop/in-game model captures on solid white or
 * light-grey backgrounds. Dropped into a dark, cropped tile they read as a
 * blank white block. We sample a tiny copy of the image in the browser and
 * classify its border:
 *
 *   transparent → an official cutout; render it as-is on the dark stage
 *   light       → a studio capture; show it on a light "plate" with multiply
 *                 blending so the white background dissolves into the plate
 *   dark        → artwork/screenshot; render as-is
 *   unknown     → probe failed (CORS, network, SSR); render as-is
 *
 * The probe is a ≤64px download and is cached per URL for the session.
 * The pipeline in docs/MEDIA_PIPELINE.md removes the need for this at the
 * source (`pnpm ai -- restore`); the client-side probe covers whatever has
 * not been restored yet.
 */
import type { MediaRef } from '@csow/schema'

export type ImageTone = 'light' | 'dark' | 'transparent' | 'unknown'

const WIKI_HOST = 'static.wikia.nocookie.net'
const SAMPLE = 24
const RING = 2
const PROBE_TIMEOUT_MS = 2500

/**
 * Classify RGBA pixel data of a SAMPLE×SAMPLE image by its border ring.
 * Pure — unit tested in image-tone.test.ts.
 */
export const classifyTone = (data: ArrayLike<number>, size = SAMPLE): ImageTone => {
  let ring = 0
  let transparent = 0
  let lumSum = 0
  let lumSq = 0
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const onRing = x < RING || y < RING || x >= size - RING || y >= size - RING
      if (!onRing) continue
      const i = (y * size + x) * 4
      ring++
      const alpha = data[i + 3] ?? 0
      if (alpha < 40) {
        transparent++
        continue
      }
      const lum =
        (0.2126 * (data[i] ?? 0) + 0.7152 * (data[i + 1] ?? 0) + 0.0722 * (data[i + 2] ?? 0)) / 255
      lumSum += lum
      lumSq += lum * lum
    }
  }
  if (!ring) return 'unknown'
  if (transparent / ring > 0.5) return 'transparent'
  const opaque = ring - transparent
  const mean = lumSum / opaque
  const variance = lumSq / opaque - mean * mean
  // A uniform, bright border = a studio sweep. Busy borders are art or gameplay.
  if (mean > 0.8 && variance < 0.03) return 'light'
  return 'dark'
}

/** Smallest available rendition of a media asset for the probe. */
export const probeUrlFor = (media: MediaRef): string => {
  if (media.url.includes(WIKI_HOST)) {
    const clean = media.url.replace(/\/revision\/latest.*$/, '')
    if (/\.(gif|svg)$/i.test(clean)) return media.url
    return `${clean}/revision/latest/scale-to-width-down/64`
  }
  const smallest = Object.values(media.sizes ?? {})
    .filter((s) => s.url && s.width)
    .sort((a, b) => (a.width ?? 0) - (b.width ?? 0))[0]
  return smallest?.url ?? media.url
}

const cache = new Map<string, Promise<ImageTone>>()

/** Probe an image's tone in the browser. Resolves 'unknown' on any failure. */
export const probeTone = (media: MediaRef): Promise<ImageTone> => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve('unknown')
  }
  const key = media.url
  const cached = cache.get(key)
  if (cached) return cached

  const promise = new Promise<ImageTone>((resolve) => {
    let settled = false
    const done = (tone: ImageTone) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      resolve(tone)
    }
    const timer = window.setTimeout(() => done('unknown'), PROBE_TIMEOUT_MS)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = SAMPLE
        canvas.height = SAMPLE
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return done('unknown')
        ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE)
        done(classifyTone(ctx.getImageData(0, 0, SAMPLE, SAMPLE).data))
      } catch {
        // Tainted canvas (no CORS headers) or decode failure.
        done('unknown')
      }
    }
    img.onerror = () => done('unknown')
    img.src = probeUrlFor(media)
  })
  cache.set(key, promise)
  return promise
}
