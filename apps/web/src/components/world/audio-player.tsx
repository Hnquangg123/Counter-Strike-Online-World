'use client'

import { Pause, Play, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  src: string
  title: string
  caption?: string | null
  className?: string
  labels: { play: string; pause: string }
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** A compact HUD-style audio player for voice lines and soundtrack cues. */
export function AudioPlayer({ src, title, caption, className, labels }: Props) {
  const ref = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onTime = () => setProgress(el.currentTime)
    const onMeta = () => setDuration(el.duration || 0)
    const onEnd = () => setPlaying(false)
    const onErr = () => setError(true)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('ended', onEnd)
    el.addEventListener('error', onErr)
    return () => {
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('ended', onEnd)
      el.removeEventListener('error', onErr)
    }
  }, [])

  const toggle = async () => {
    const el = ref.current
    if (!el) return
    if (playing) {
      el.pause()
      setPlaying(false)
    } else {
      try {
        await el.play()
        setPlaying(true)
      } catch {
        setError(true)
      }
    }
  }

  const pct = duration ? (progress / duration) * 100 : 0
  const bars = 28

  return (
    <div
      className={cn(
        'flex items-center gap-4 chamfer-sm bg-steel/70 p-3 ring-1 ring-inset ring-line',
        className,
      )}
    >
      {/* biome-ignore lint/a11y/useMediaCaption: voice lines are short clips; the transcript is rendered next to the player */}
      <audio ref={ref} src={src} preload="metadata" crossOrigin="anonymous" />
      <button
        type="button"
        onClick={toggle}
        disabled={error}
        aria-label={playing ? labels.pause : labels.play}
        className="flex h-11 w-11 shrink-0 items-center justify-center chamfer-sm bg-ember text-void transition hover:bg-flare disabled:opacity-40"
      >
        {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="truncate font-display text-sm font-semibold uppercase tracking-wide text-bone">
            {title}
          </p>
          <span className="hud-numerals text-xs text-ember">
            {error ? 'OFFLINE' : `${fmt(progress)} / ${duration ? fmt(duration) : '--:--'}`}
          </span>
        </div>
        <div className="mt-2 flex h-4 items-end gap-[2px]" aria-hidden>
          {Array.from({ length: bars }, (_, i) => {
            const lit = (i / bars) * 100 <= pct
            const h = 30 + ((i * 37) % 70)
            return (
              <span
                key={i}
                className={cn('flex-1 transition-colors', lit ? 'bg-ember' : 'bg-smoke')}
                style={{ height: `${playing || lit ? h : 30}%` }}
              />
            )
          })}
        </div>
        {caption && <p className="mt-1.5 truncate text-xs text-dust">{caption}</p>}
      </div>
      <Volume2 className="hidden h-4 w-4 shrink-0 text-dust sm:block" />
    </div>
  )
}
