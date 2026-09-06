import { cn } from '@/lib/utils'

/** The CSOW mark: a chamfered plate with a radar sweep and crosshair. Original artwork. */
export function Mark({ className, animate = true }: { className?: string; animate?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" className={cn('h-9 w-9', className)} aria-hidden>
      <defs>
        <linearGradient id="csow-plate" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1f242b" />
          <stop offset="1" stopColor="#0e1013" />
        </linearGradient>
        <linearGradient id="csow-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f58a07" stopOpacity="0" />
          <stop offset="1" stopColor="#ffb13b" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <path
        d="M4 2h34l6 6v38H10l-6-6z"
        fill="url(#csow-plate)"
        stroke="#f58a07"
        strokeOpacity="0.7"
      />
      <circle cx="24" cy="24" r="13" fill="none" stroke="#e8e4da" strokeOpacity="0.25" />
      <circle cx="24" cy="24" r="7" fill="none" stroke="#e8e4da" strokeOpacity="0.25" />
      <path d="M24 8v6M24 34v6M8 24h6M34 24h6" stroke="#f58a07" strokeWidth="1.5" />
      <g
        className={animate ? 'origin-center animate-radar' : undefined}
        style={{ transformOrigin: '24px 24px' }}
      >
        <path d="M24 24 L37 24 A13 13 0 0 0 30.5 12.7 Z" fill="url(#csow-sweep)" />
        <path d="M24 24 L37 24" stroke="#ffb13b" strokeWidth="1.2" />
      </g>
      <circle cx="24" cy="24" r="1.8" fill="#ffb13b" />
      <circle cx="31" cy="18" r="1.3" fill="#7cff3f" />
    </svg>
  )
}

export function Wordmark({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('flex items-center gap-3', className)}>
      <Mark />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[0.95rem] font-bold uppercase tracking-[0.08em] text-bone">
          Counter-Strike
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 font-display text-[0.62rem] font-semibold uppercase tracking-[0.34em]">
          <span className="text-ember-gradient">Online</span>
          <span
            aria-hidden
            className={cn('inline-block h-px w-3 bg-ember', compact && 'hidden sm:inline-block')}
          />
          <span className={cn('text-ash', compact && 'hidden sm:inline')}>World</span>
        </span>
      </span>
    </span>
  )
}
