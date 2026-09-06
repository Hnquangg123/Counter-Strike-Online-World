import { GRADE_META, type Grade, SIDE_META, type Side } from '@csow/schema'
import type * as React from 'react'
import { cn } from '@/lib/utils'

export function Tag({ className, children, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 chamfer-sm bg-steel px-2 py-1 font-display text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ash',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export function GradeBadge({
  grade,
  label,
  className,
}: {
  grade: Grade
  label?: string
  className?: string
}) {
  const meta = GRADE_META[grade]
  const isTranscendent = grade === 'transcendent'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 chamfer-sm px-2 py-1 font-display text-[0.65rem] font-bold uppercase tracking-[0.18em]',
        isTranscendent && 'animate-pulse-soft',
        className,
      )}
      style={{
        color: meta.color,
        background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${meta.color} 55%, transparent)`,
      }}
    >
      <span
        aria-hidden
        className="inline-block h-1.5 w-1.5 rotate-45"
        style={{ background: meta.color }}
      />
      {label ?? meta.label}
    </span>
  )
}

export function SideBadge({
  side,
  label,
  className,
}: {
  side: Side
  label?: string
  className?: string
}) {
  const meta = SIDE_META[side]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 chamfer-sm px-2 py-1 font-display text-[0.65rem] font-bold uppercase tracking-[0.18em]',
        className,
      )}
      style={{
        color: meta.color,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${meta.color} 55%, transparent)`,
      }}
    >
      <span className="font-mono text-[0.6rem] opacity-80">[{meta.short}]</span>
      {label ?? meta.label}
    </span>
  )
}
