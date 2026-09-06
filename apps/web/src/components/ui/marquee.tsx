import { cn } from '@/lib/utils'

/** Infinite ticker used for the lobby-style news strip. */
export function Marquee({ items, className }: { items: string[]; className?: string }) {
  const row = [...items, ...items]
  return (
    <div
      className={cn('relative overflow-hidden border-y border-line bg-carbon/70', className)}
      aria-hidden
    >
      <div className="flex w-max animate-marquee gap-10 py-2 pr-10 font-display text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-ash">
        {row.map((item, i) => (
          <span key={i} className="flex items-center gap-10">
            <span>{item}</span>
            <span className="inline-block h-1.5 w-1.5 rotate-45 bg-ember" />
          </span>
        ))}
      </div>
    </div>
  )
}
