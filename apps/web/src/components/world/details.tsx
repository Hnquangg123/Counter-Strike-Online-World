import { REGION_LABELS, type Region } from '@csow/schema'
import type * as React from 'react'
import { formatPartialDate } from '@/lib/utils'
import { Panel } from '../ui/panel'

/** Key/value dossier rows, like an in-game info card. */
export function Dossier({
  title,
  rows,
  className,
}: {
  title?: string
  rows: { label: string; value: React.ReactNode }[]
  className?: string
}) {
  const visible = rows.filter((r) => r.value !== null && r.value !== undefined && r.value !== '')
  if (!visible.length) return null
  return (
    <Panel className={className}>
      <div className="p-5">
        {title && <p className="kicker mb-4">{title}</p>}
        <dl className="grid gap-3">
          {visible.map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[minmax(0,110px)_1fr] gap-3 border-b border-line pb-3 last:border-0 last:pb-0"
            >
              <dt className="font-display text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-dust">
                {row.label}
              </dt>
              <dd className="text-sm text-bone">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Panel>
  )
}

export function ReleaseList({
  release,
  title,
  locale,
}: {
  release: { region: Region; date?: string | null; note?: string | null }[] | null | undefined
  title: string
  locale: string
}) {
  if (!release?.length) return null
  const sorted = [...release].sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))
  return (
    <Panel>
      <div className="p-5">
        <p className="kicker mb-4">{title}</p>
        <ul className="grid gap-2">
          {sorted.map((r, i) => (
            <li
              key={`${r.region}-${i}`}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex items-center gap-2">
                <span className="font-mono text-[0.65rem] uppercase text-ember">{r.region}</span>
                <span className="text-bone">{REGION_LABELS[r.region]?.name ?? r.region}</span>
              </span>
              <span className="hud-numerals text-xs text-ash">
                {r.date ? formatPartialDate(r.date, locale) : '—'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  )
}

export function QuoteList({
  quotes,
  title,
}: {
  quotes: { text: string; context?: string | null }[]
  title: string
}) {
  if (!quotes.length) return null
  return (
    <section>
      <p className="kicker mb-4">{title}</p>
      <ul className="grid gap-3 md:grid-cols-2">
        {quotes.map((q, i) => (
          <li key={i} className="relative chamfer-sm bg-steel/60 p-5 ring-1 ring-inset ring-line">
            <span
              aria-hidden
              className="absolute left-4 top-2 font-display text-4xl leading-none text-(--accent)/40"
            >
              “
            </span>
            <p className="relative font-headline text-xl font-semibold leading-snug text-bone">
              {q.text}
            </p>
            {q.context && <p className="mt-2 text-xs text-dust">{q.context}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function NamedList({
  items,
  title,
}: {
  items: { name: string; description?: string | null }[]
  title: string
}) {
  if (!items.length) return null
  return (
    <section>
      <p className="kicker mb-4">{title}</p>
      <ul className="grid gap-3">
        {items.map((a, i) => (
          <li key={i} className="grid gap-1 border-l-2 border-(--accent) pl-4">
            <p className="font-display text-sm font-bold uppercase tracking-wide text-bone">
              {a.name}
            </p>
            {a.description && <p className="text-sm text-ash">{a.description}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function TriviaList({ items, title }: { items: string[]; title: string }) {
  if (!items.length) return null
  return (
    <section>
      <p className="kicker mb-4">{title}</p>
      <ul className="grid gap-2">
        {items.map((t, i) => (
          <li key={i} className="flex gap-3 text-sm text-ash">
            <span className="hud-numerals mt-0.5 text-[0.65rem] text-ember">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ChipLinks({
  title,
  items,
}: {
  title: string
  items: { href: string; label: string; meta?: string }[]
}) {
  if (!items.length) return null
  return (
    <div>
      <p className="kicker mb-3">{title}</p>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              className="inline-flex items-center gap-2 chamfer-sm bg-steel px-3 py-1.5 font-display text-xs font-semibold uppercase tracking-[0.12em] text-bone ring-1 ring-inset ring-line hover:text-(--accent) hover:ring-(--accent)"
            >
              {item.label}
              {item.meta && <span className="font-mono text-[0.6rem] text-dust">{item.meta}</span>}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
