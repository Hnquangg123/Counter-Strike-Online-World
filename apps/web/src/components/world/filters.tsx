import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

type Option = { value: string; label: string }

/**
 * Server-rendered filter chips. Each chip is a link that toggles one query
 * parameter, so filters are shareable URLs and work without JavaScript.
 */
export function FilterGroup({
  label,
  param,
  options,
  current,
  pathname,
  query,
  allLabel,
}: {
  label: string
  param: string
  options: Option[]
  current?: string
  pathname: string
  query: Record<string, string | undefined>
  allLabel: string
}) {
  const build = (value?: string) => {
    const next: Record<string, string> = {}
    for (const [k, v] of Object.entries(query)) if (v && k !== param && k !== 'page') next[k] = v
    if (value) next[param] = value
    return { pathname, query: next }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 font-display text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-dust">
        {label}
      </span>
      <Link
        href={build(undefined)}
        className={cn(
          'chamfer-sm px-2.5 py-1 font-display text-[0.65rem] font-semibold uppercase tracking-[0.16em] ring-1 ring-inset transition-colors',
          !current
            ? 'bg-ember text-void ring-ember'
            : 'text-ash ring-line hover:text-bone hover:ring-line-strong',
        )}
      >
        {allLabel}
      </Link>
      {options.map((o) => (
        <Link
          key={o.value}
          href={build(o.value)}
          className={cn(
            'chamfer-sm px-2.5 py-1 font-display text-[0.65rem] font-semibold uppercase tracking-[0.16em] ring-1 ring-inset transition-colors',
            current === o.value
              ? 'bg-ember text-void ring-ember'
              : 'text-ash ring-line hover:text-bone hover:ring-line-strong',
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  )
}

export function Pagination({
  page,
  totalPages,
  pathname,
  query,
  labels,
}: {
  page: number
  totalPages: number
  pathname: string
  query: Record<string, string | undefined>
  labels: { prev: string; next: string; page: string }
}) {
  if (totalPages <= 1) return null
  const build = (p: number) => {
    const next: Record<string, string> = {}
    for (const [k, v] of Object.entries(query)) if (v && k !== 'page') next[k] = v
    if (p > 1) next.page = String(p)
    return { pathname, query: next }
  }
  const linkCls =
    'chamfer-sm px-3 py-2 font-display text-[0.68rem] font-semibold uppercase tracking-[0.18em] ring-1 ring-inset ring-line text-ash hover:text-bone hover:ring-ember/60 aria-disabled:pointer-events-none aria-disabled:opacity-30'
  return (
    <nav className="mt-10 flex items-center justify-between gap-4" aria-label="Pagination">
      <Link href={build(page - 1)} aria-disabled={page <= 1} className={linkCls}>
        ← {labels.prev}
      </Link>
      <span className="hud-numerals text-xs text-ember">{labels.page}</span>
      <Link href={build(page + 1)} aria-disabled={page >= totalPages} className={linkCls}>
        {labels.next} →
      </Link>
    </nav>
  )
}
