import type * as React from 'react'
import { cn } from '@/lib/utils'

type PanelProps = React.ComponentProps<'div'> & {
  /** Draw the fading accent hairline along the top edge. */
  hairline?: boolean
  /** Corner size. */
  cut?: 'sm' | 'md' | 'lg'
  interactive?: boolean
}

/**
 * The CSO lobby panel: dark surface, hairline border and chamfered corners.
 * Uses a wrapper so the 1px border survives the clip-path.
 */
export function Panel({
  className,
  children,
  hairline = true,
  cut = 'md',
  interactive,
  ...props
}: PanelProps) {
  const clip = cut === 'sm' ? 'chamfer-sm' : cut === 'lg' ? 'chamfer-lg' : 'chamfer'
  return (
    <div
      className={cn(
        'group/panel relative bg-line-strong p-px transition-all duration-300 ease-(--ease-cso)',
        clip,
        interactive && 'hover:bg-(--accent)/60 hover:shadow-[0_0_32px_-8px_var(--accent)]',
        className,
      )}
      {...props}
    >
      <div className={cn('relative h-full w-full bg-carbon shadow-panel', clip)}>
        {hairline && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 hairline opacity-80"
          />
        )}
        {children}
      </div>
    </div>
  )
}
