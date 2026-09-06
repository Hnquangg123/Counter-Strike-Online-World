import { cn } from '@/lib/utils'

type StatBarProps = {
  label: string
  value: number | null | undefined
  max?: number
  note?: string | null
  /** Show numeric readout in HUD numerals. */
  readout?: 'value' | 'fraction' | 'percent' | 'none'
  className?: string
}

/**
 * HUD-style stat bar, segmented like the in-game weapon panel. A null value
 * renders an "unknown" dashed track instead of an empty bar.
 */
export function StatBar({
  label,
  value,
  max = 100,
  note,
  readout = 'fraction',
  className,
}: StatBarProps) {
  const has = typeof value === 'number' && Number.isFinite(value)
  const pct = has ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  const segments = 14
  const lit = Math.round((pct / 100) * segments)

  return (
    <div className={cn('group/stat', className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="font-display text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ash">
          {label}
        </span>
        <span className="hud-numerals text-sm text-(--accent)">
          {!has
            ? '--'
            : readout === 'percent'
              ? `${Math.round(pct)}%`
              : readout === 'value'
                ? value
                : readout === 'fraction'
                  ? `${value} / ${max}`
                  : null}
        </span>
      </div>
      {/* biome-ignore lint/a11y/useSemanticElements: the native <meter> cannot render segmented HUD bars */}
      <div
        className="flex gap-[3px]"
        role="meter"
        aria-valuenow={has ? value : undefined}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className={cn(
              'h-2 flex-1 skew-x-[-18deg] transition-colors duration-500',
              !has && 'border border-dashed border-line-strong bg-transparent',
              has &&
                i < lit &&
                'bg-(--accent) shadow-[0_0_8px_color-mix(in_srgb,var(--accent)_60%,transparent)]',
              has && i >= lit && 'bg-smoke/70',
            )}
            style={has && i < lit ? { transitionDelay: `${i * 30}ms` } : undefined}
          />
        ))}
      </div>
      {note && <p className="mt-1.5 text-xs leading-snug text-dust">{note}</p>}
    </div>
  )
}
