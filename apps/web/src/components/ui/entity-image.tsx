'use client'

import type { MediaRef } from '@csow/schema'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  media: MediaRef | null | undefined
  alt?: string
  /** Fallback initial (e.g. first letter of the name). */
  initial?: string
  className?: string
  imgClassName?: string
  sizes?: string
  priority?: boolean
  fit?: 'cover' | 'contain'
  /** Caption shown while artwork is pending. */
  pendingLabel?: string
}

const WIKI_HOST = 'static.wikia.nocookie.net'
const WIDTHS = [320, 640, 960, 1280, 1920]

/** Fandom's CDN can resize on the fly; local media ships pre-generated sizes. */
const buildSrcSet = (media: MediaRef): string | undefined => {
  if (media.url.includes(WIKI_HOST)) {
    const clean = media.url.replace(/\/revision\/latest.*$/, '')
    if (/\.(gif|svg)$/i.test(clean)) return undefined
    return WIDTHS.map((w) => `${clean}/revision/latest/scale-to-width-down/${w} ${w}w`).join(', ')
  }
  const sizes = media.sizes
  if (!sizes) return undefined
  const entries = Object.values(sizes).filter((s) => s.url && s.width)
  if (!entries.length) return undefined
  return [
    ...entries.map((s) => `${s.url} ${s.width}w`),
    media.width ? `${media.url} ${media.width}w` : null,
  ]
    .filter(Boolean)
    .join(', ')
}

/**
 * Renders a MediaRef with responsive sources and a designed fallback — an
 * illuminated initial on a tactical grid — for entries whose art is pending
 * or whose remote source is unreachable.
 */
export function EntityImage({
  media,
  alt,
  initial,
  className,
  imgClassName,
  sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
  priority,
  fit = 'cover',
  pendingLabel,
}: Props) {
  const ref = useRef<HTMLImageElement>(null)
  const [failed, setFailed] = useState(false)

  // The error event can fire before React hydrates; check the element's state on mount.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (el.complete && el.naturalWidth === 0) setFailed(true)
  }, [])

  const show = Boolean(media) && !failed

  return (
    <div className={cn('relative overflow-hidden bg-steel', className)}>
      {media && !failed && (
        <img
          ref={ref}
          src={media.url}
          srcSet={buildSrcSet(media)}
          sizes={sizes}
          alt={alt ?? media.alt ?? ''}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          onError={() => setFailed(true)}
          className={cn(
            'h-full w-full transition-transform duration-700 ease-(--ease-cso)',
            fit === 'cover' ? 'object-cover' : 'object-contain',
            imgClassName,
          )}
        />
      )}
      {!show && (
        <div
          className="tac-grid absolute inset-0 flex flex-col items-center justify-center gap-3"
          aria-hidden={Boolean(alt)}
        >
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 50% 35%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 60%)',
            }}
          />
          <span className="relative font-display text-[5rem] font-bold leading-none text-(--accent) opacity-60 md:text-[7rem]">
            {(initial ?? alt ?? '?').trim().slice(0, 1).toUpperCase() || '?'}
          </span>
          {pendingLabel && (
            <span className="relative stamp text-[0.58rem] text-dust">{pendingLabel}</span>
          )}
          {alt && <span className="sr-only">{alt}</span>}
        </div>
      )}
    </div>
  )
}
