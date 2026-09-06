import type { MediaKind, MediaRef } from '@csow/schema'
import type { Media } from '@/payload-types'
import { populated, populatedMany } from './utils'

type RemoteItem = {
  url: string
  kind?: MediaKind | string | null
  caption?: string | null
  credit?: string | null
  id?: string | null
}

type WithMedia = {
  heroImage?: (number | null) | Media
  gallery?: (number | Media)[] | null
  remoteMedia?: RemoteItem[] | null
}

const IMAGE_KINDS = new Set<string>([
  'icon',
  'render',
  'portrait',
  'artwork',
  'screenshot',
  'hud',
  'minimap',
  'other',
])

const absolute = (url: string | null | undefined): string => {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}${url}`
}

/** Convert a Payload media document into the public MediaRef shape. */
export const mediaRef = (value: Media | number | string | null | undefined): MediaRef | null => {
  const doc = populated(value as Media | number | null)
  if (!doc?.url) return null
  const sizes: MediaRef['sizes'] = {}
  for (const [name, size] of Object.entries(doc.sizes ?? {})) {
    if (size?.url)
      sizes[name] = {
        url: absolute(size.url),
        width: size.width ?? undefined,
        height: size.height ?? undefined,
      }
  }
  return {
    id: String(doc.id),
    kind: (doc.kind as MediaKind) ?? 'other',
    url: absolute(doc.url),
    width: doc.width ?? undefined,
    height: doc.height ?? undefined,
    alt: doc.alt ?? undefined,
    caption: doc.caption ?? undefined,
    credit: doc.credit ?? undefined,
    mimeType: doc.mimeType ?? undefined,
    sizes: Object.keys(sizes).length ? sizes : undefined,
    aiGeneration:
      doc.license === 'ai-generated' &&
      doc.aiGeneration?.provider &&
      doc.aiGeneration?.model &&
      doc.aiGeneration?.prompt
        ? {
            provider: doc.aiGeneration.provider,
            model: doc.aiGeneration.model,
            prompt: doc.aiGeneration.prompt,
            negativePrompt: doc.aiGeneration.negativePrompt ?? undefined,
            seed: doc.aiGeneration.seed ?? undefined,
            generatedAt: doc.aiGeneration.generatedAt ?? undefined,
          }
        : undefined,
  }
}

/** A wiki-hosted asset, referenced remotely until the ingestion pipeline localises it. */
export const remoteRef = (item: RemoteItem): MediaRef => ({
  id: `remote:${item.id ?? hash(item.url)}`,
  kind: (item.kind as MediaKind) ?? 'artwork',
  url: item.url,
  alt: item.caption ?? undefined,
  caption: item.caption ?? undefined,
  credit: item.credit ?? 'Counter-Strike Online Wiki / Nexon',
})

const hash = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

const isImage = (ref: MediaRef) =>
  IMAGE_KINDS.has(ref.kind) && !/\.(ogg|mp3|wav|glb|gltf|mp4|webm)$/i.test(ref.url)

/** Local gallery first, then remote wiki images. */
export const galleryOf = (doc: WithMedia): MediaRef[] => {
  const local = populatedMany(doc.gallery)
    .map(mediaRef)
    .filter((m): m is MediaRef => Boolean(m))
  const remote = (doc.remoteMedia ?? []).map(remoteRef).filter(isImage)
  return [...local, ...remote]
}

export const audioOf = (doc: WithMedia): MediaRef[] =>
  (doc.remoteMedia ?? [])
    .map(remoteRef)
    .filter((m) => m.kind === 'audio' || /\.(ogg|mp3|wav)$/i.test(m.url))

const HERO_PRIORITY: MediaKind[] = ['render', 'portrait', 'artwork', 'screenshot', 'icon', 'other']

/** Explicit hero → best gallery image by kind priority → null. */
export const heroOf = (doc: WithMedia): MediaRef | null => {
  const explicit = mediaRef(doc.heroImage as Media | number | null)
  if (explicit) return explicit
  const gallery = galleryOf(doc)
  for (const kind of HERO_PRIORITY) {
    const hit = gallery.find((g) => g.kind === kind)
    if (hit) return hit
  }
  return gallery[0] ?? null
}

/** Pick the best available URL for a given rendering width. */
export const srcFor = (
  ref: MediaRef | null | undefined,
  size: 'thumbnail' | 'card' | 'hero' = 'card',
) => ref?.sizes?.[size]?.url ?? ref?.url ?? null
