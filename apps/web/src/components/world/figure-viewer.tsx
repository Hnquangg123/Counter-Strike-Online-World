'use client'

import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'

const FigureScene = dynamic(() => import('./figure-scene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <span className="hud-numerals text-xs text-ember animate-blink">LOADING FIGURE…</span>
    </div>
  ),
})

type Props = {
  modelUrl?: string | null
  accent: string
  name: string
  variant?: 'character' | 'weapon'
  labels: { title: string; hint: string; pending: string }
  className?: string
}

/** The character/weapon 3D stage: a real glTF when available, a hologram stand-in otherwise. */
export function FigureViewer({
  modelUrl,
  accent,
  name,
  variant = 'character',
  labels,
  className,
}: Props) {
  return (
    <div
      className={cn('relative chamfer bg-line-strong p-px', className)}
      style={{ '--accent': accent } as React.CSSProperties}
    >
      <div className="relative h-full w-full chamfer bg-carbon scanlines">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 50% 70%, color-mix(in srgb, ${accent} 18%, transparent), transparent 65%)`,
          }}
        />
        <div className="absolute inset-0">
          <FigureScene modelUrl={modelUrl} accent={accent} variant={variant} />
        </div>
        <div className="pointer-events-none absolute inset-x-4 top-4 flex items-start justify-between">
          <div>
            <p className="kicker">{labels.title}</p>
            <p className="mt-1 font-display text-sm font-semibold uppercase tracking-[0.12em] text-bone">
              {name}
            </p>
          </div>
          <span className="stamp text-[0.55rem] text-(--accent)">
            {modelUrl ? 'GLTF' : labels.pending}
          </span>
        </div>
        <p className="pointer-events-none absolute inset-x-4 bottom-4 text-center font-mono text-[0.65rem] uppercase tracking-[0.2em] text-dust">
          {labels.hint}
        </p>
      </div>
    </div>
  )
}
