import { type Locale, ModeFamily } from '@csow/schema'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Reveal } from '@/components/fx/reveal'
import { SectionHeader } from '@/components/ui/section-header'
import { ModeCard } from '@/components/world/cards'
import { listEntities } from '@/lib/world'

export const revalidate = 300

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'modes' })
  return { title: t('title'), description: t('intro') }
}

export default async function ModesPage({ params }: Props) {
  const { locale: rawLocale } = await params
  setRequestLocale(rawLocale)
  const locale = rawLocale as Locale
  const t = await getTranslations()
  const { docs } = await listEntities('game-modes', { locale, limit: 200, sort: 'name' })

  const families = ModeFamily.options.filter((f) => docs.some((d) => d.family === f))

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
      <SectionHeader
        as="h1"
        kicker={t('modes.kicker')}
        title={t('modes.title')}
        description={t('modes.intro')}
      />
      {docs.length === 0 && <p className="py-20 text-center text-ash">{t('common.noEntries')}</p>}
      <div className="space-y-14">
        {families.map((family) => (
          <section key={family}>
            <div className="mb-6 flex items-center gap-4">
              <h2 className="font-display text-2xl text-bone">{t(`family.${family}`)}</h2>
              <span aria-hidden className="h-px flex-1 bg-line" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {docs
                .filter((d) => d.family === family)
                .map((m, i) => (
                  <Reveal key={m.id} delay={Math.min(i, 6) * 0.04}>
                    <ModeCard mode={m} familyLabel={t(`family.${m.family}`)} />
                  </Reveal>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
