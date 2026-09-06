import type { Locale } from '@csow/schema'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Reveal } from '@/components/fx/reveal'
import { SectionHeader } from '@/components/ui/section-header'
import { FactionCard } from '@/components/world/cards'
import { listEntities } from '@/lib/world'

export const revalidate = 300

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'factions' })
  return { title: t('title'), description: t('intro') }
}

export default async function FactionsPage({ params }: Props) {
  const { locale: rawLocale } = await params
  setRequestLocale(rawLocale)
  const locale = rawLocale as Locale
  const t = await getTranslations()
  const { docs } = await listEntities('factions', { locale, limit: 100 })
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
      <SectionHeader
        as="h1"
        kicker={t('factions.kicker')}
        title={t('factions.title')}
        description={t('factions.intro')}
      />
      {docs.length === 0 && <p className="py-20 text-center text-ash">{t('common.noEntries')}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {docs.map((f, i) => (
          <Reveal key={f.id} delay={Math.min(i, 6) * 0.05}>
            <FactionCard faction={f} sideLabel={t(`side.${f.side ?? 'neutral'}`)} />
          </Reveal>
        ))}
      </div>
    </div>
  )
}
