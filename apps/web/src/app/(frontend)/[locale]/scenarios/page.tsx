import type { Locale } from '@csow/schema'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Reveal } from '@/components/fx/reveal'
import { SectionHeader } from '@/components/ui/section-header'
import { ScenarioCard } from '@/components/world/cards'
import { listEntities } from '@/lib/world'

export const revalidate = 300

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'scenarios' })
  return { title: t('title'), description: t('intro') }
}

export default async function ScenariosPage({ params }: Props) {
  const { locale: rawLocale } = await params
  setRequestLocale(rawLocale)
  const locale = rawLocale as Locale
  const t = await getTranslations()
  const { docs } = await listEntities('scenarios', { locale, limit: 200, sort: 'chapter' })

  // Group by season, preserving the order chapters were released.
  const seasons = new Map<string, typeof docs>()
  for (const doc of docs) {
    const key = doc.season ?? 'Other'
    seasons.set(key, [...(seasons.get(key) ?? []), doc])
  }
  const ordered = [...seasons.entries()].sort(([a], [b]) =>
    a.localeCompare(b, undefined, { numeric: true }),
  )

  return (
    <div
      className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16"
      style={{ '--accent': '#ffd400' } as React.CSSProperties}
    >
      <SectionHeader
        as="h1"
        kicker={t('scenarios.kicker')}
        title={t('scenarios.title')}
        description={t('scenarios.intro')}
      />

      {docs.length === 0 && <p className="py-20 text-center text-ash">{t('common.noEntries')}</p>}

      <div className="space-y-16">
        {ordered.map(([season, chapters]) => (
          <section key={season}>
            <div className="mb-6 flex items-center gap-4">
              <h2 className="font-display text-2xl text-bone">{season}</h2>
              <span aria-hidden className="h-px flex-1 bg-line" />
              <span className="hud-numerals text-xs text-(--accent)">{chapters.length} CH</span>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {chapters.map((s, i) => (
                <Reveal key={s.id} delay={Math.min(i, 6) * 0.05}>
                  <ScenarioCard
                    scenario={s}
                    labels={{
                      season: t('scenarios.season'),
                      chapter: t('scenarios.chapter'),
                      pending: t('common.imagePending'),
                    }}
                  />
                </Reveal>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
