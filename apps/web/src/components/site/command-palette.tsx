'use client'

import type { SearchHit } from '@csow/schema'
import { Command } from 'cmdk'
import { Search } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { Dialog } from 'radix-ui'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { ENTITY_PATH } from '@/lib/href'

const TYPE_LABEL: Record<SearchHit['type'], string> = {
  characters: 'Character',
  weapons: 'Weapon',
  scenarios: 'Scenario',
  'game-modes': 'Mode',
  maps: 'Map',
  factions: 'Faction',
  music: 'Music',
}

export function CommandPalette() {
  const t = useTranslations('nav')
  const locale = useLocale()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        const target = e.target as HTMLElement | null
        if (e.key === '/' && target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/v1/search?q=${encodeURIComponent(q)}&locale=${locale}&limit=12`,
          {
            signal: controller.signal,
          },
        )
        const json = (await res.json()) as { data: SearchHit[] }
        setHits(json.data ?? [])
      } catch {
        /* aborted or offline */
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 160)
    return () => clearTimeout(timer)
  }, [query, open, locale])

  const go = (hit: SearchHit) => {
    setOpen(false)
    router.push(`/${ENTITY_PATH[hit.type]}/${hit.slug}`)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-10 items-center gap-3 chamfer-sm bg-steel/80 px-3 text-ash ring-1 ring-inset ring-line hover:text-bone hover:ring-ember/60"
        aria-label={t('search')}
      >
        <Search className="h-4 w-4" />
        <span className="hidden text-sm md:inline">{t('searchHint')}</span>
        <kbd className="hidden font-mono text-[0.65rem] text-dust md:inline">⌘K</kbd>
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-void/80 backdrop-blur-sm data-[state=open]:animate-in" />
          <Dialog.Content
            className="fixed left-1/2 top-[12vh] z-50 w-[min(92vw,680px)] -translate-x-1/2 focus:outline-none"
            aria-describedby={undefined}
          >
            <Dialog.Title className="sr-only">{t('search')}</Dialog.Title>
            <div className="chamfer bg-line-strong p-px">
              <Command className="chamfer bg-carbon" shouldFilter={false} label={t('search')}>
                <div className="flex items-center gap-3 border-b border-line px-4">
                  <Search className="h-4 w-4 text-ember" />
                  <Command.Input
                    autoFocus
                    value={query}
                    onValueChange={setQuery}
                    placeholder={t('searchHint')}
                    className="h-14 w-full bg-transparent font-sans text-base text-bone placeholder:text-dust focus:outline-none"
                  />
                  <span
                    className={
                      loading
                        ? 'hud-numerals text-xs text-ember animate-blink'
                        : 'hud-numerals text-xs text-dust'
                    }
                  >
                    {loading ? '…' : `${hits.length}`}
                  </span>
                </div>
                <Command.List className="max-h-[52vh] overflow-y-auto p-2">
                  {query.trim().length >= 2 && !loading && hits.length === 0 && (
                    <Command.Empty className="px-4 py-8 text-center text-sm text-dust">
                      No results in the world.
                    </Command.Empty>
                  )}
                  {hits.map((hit) => (
                    <Command.Item
                      key={`${hit.type}:${hit.slug}`}
                      value={`${hit.type}:${hit.slug}`}
                      onSelect={() => go(hit)}
                      className="flex cursor-pointer items-center gap-3 chamfer-sm px-3 py-2.5 text-bone data-[selected=true]:bg-ember/12 data-[selected=true]:text-flare"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden bg-steel">
                        {hit.image ? (
                          <img src={hit.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="font-display text-lg font-bold text-ember/70">
                            {hit.name.slice(0, 1)}
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-display text-sm font-semibold uppercase tracking-wide">
                          {hit.name}
                        </span>
                        {hit.summary && (
                          <span className="block truncate text-xs text-ash">{hit.summary}</span>
                        )}
                      </span>
                      <span className="stamp text-[0.55rem] text-dust">{TYPE_LABEL[hit.type]}</span>
                    </Command.Item>
                  ))}
                </Command.List>
                <div className="flex items-center justify-between border-t border-line px-4 py-2 font-mono text-[0.65rem] text-dust">
                  <span>↑↓ navigate · ↵ open · esc close</span>
                  <span className="text-ember/70">CSOW SEARCH</span>
                </div>
              </Command>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
