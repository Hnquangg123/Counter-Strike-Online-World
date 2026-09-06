'use client'

import { useEffect, useState } from 'react'
import { pad2 } from '@/lib/utils'

type Labels = {
  days: string
  hours: string
  minutes: string
  seconds: string
  until: string
  since: string
}

const split = (ms: number) => {
  const abs = Math.abs(ms)
  return {
    days: Math.floor(abs / 86_400_000),
    hours: Math.floor((abs % 86_400_000) / 3_600_000),
    minutes: Math.floor((abs % 3_600_000) / 60_000),
    seconds: Math.floor((abs % 60_000) / 1000),
  }
}

/** A round-timer style countdown to (or since) the end of service. */
export function Countdown({ target, labels }: { target: string; labels: Labels }) {
  const targetMs = new Date(target).getTime()
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const diff = now === null ? 0 : targetMs - now
  const past = diff < 0
  const { days, hours, minutes, seconds } = split(diff)
  const cells: [string, string][] = [
    [String(days), labels.days],
    [pad2(hours), labels.hours],
    [pad2(minutes), labels.minutes],
    [pad2(seconds), labels.seconds],
  ]

  return (
    <div>
      <p className="kicker mb-3">{past ? labels.since : labels.until}</p>
      <div className="flex items-end gap-3 md:gap-5" role="timer" aria-live="off">
        {cells.map(([value, label], i) => (
          <div key={label} className="flex items-end gap-3 md:gap-5">
            <div className="flex flex-col">
              <span
                className="hud-numerals text-4xl leading-none text-flare md:text-6xl"
                style={{ minWidth: i === 0 ? '2ch' : '2.2ch' }}
              >
                {now === null ? '--' : value}
              </span>
              <span className="mt-2 font-display text-[0.62rem] uppercase tracking-[0.3em] text-ash">
                {label}
              </span>
            </div>
            {i < cells.length - 1 && (
              <span aria-hidden className="hud-numerals mb-6 text-3xl text-ember/60 md:text-5xl">
                :
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
