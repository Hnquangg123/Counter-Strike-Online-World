import type * as React from 'react'
import { cn } from '@/lib/utils'

export function Kicker({ className, children, ...props }: React.ComponentProps<'p'>) {
  return (
    <p className={cn('kicker flex items-center gap-3', className)} {...props}>
      <span aria-hidden className="inline-block h-px w-6 bg-(--accent)" />
      {children}
    </p>
  )
}

type SectionHeaderProps = {
  kicker?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  align?: 'left' | 'center'
  as?: 'h1' | 'h2' | 'h3'
  className?: string
}

export function SectionHeader({
  kicker,
  title,
  description,
  action,
  align = 'left',
  as: Heading = 'h2',
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-3 md:mb-10 md:flex-row md:items-end md:justify-between',
        align === 'center' && 'items-center text-center md:flex-col md:items-center',
        className,
      )}
    >
      <div className={cn('max-w-2xl', align === 'center' && 'flex flex-col items-center')}>
        {kicker && <Kicker className="mb-3">{kicker}</Kicker>}
        <Heading
          className={cn(
            'text-bone leading-[0.95]',
            Heading === 'h1' ? 'text-4xl md:text-6xl' : 'text-2xl md:text-4xl',
          )}
        >
          {title}
        </Heading>
        {description && <p className="mt-3 max-w-xl text-ash leading-relaxed">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/** A stencil "stamp" label, e.g. CLASSIFIED / TRANSCENDENT. */
export function Stamp({ className, children, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'stamp inline-flex items-center gap-2 border border-(--accent)/60 px-2.5 py-1 text-(--accent)',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
