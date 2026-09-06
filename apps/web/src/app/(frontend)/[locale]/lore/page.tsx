import type { Locale } from '@csow/schema'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Reveal } from '@/components/fx/reveal'
import { EntityImage } from '@/components/ui/entity-image'
import { SectionHeader } from '@/components/ui/section-header'
import { ChipLinks } from '@/components/world/details'
import { RichText } from '@/components/world/rich-text'
import { entityHref } from '@/lib/href'
import { mediaRef } from '@/lib/media'
import { populatedMany } from '@/lib/utils'
import { getStoryline } from '@/lib/world'

export const revalidate = 300

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'lore' })
  return { title: t('title'), description: t('intro') }
}

export default async function LorePage({ params }: Props) {
  const { locale: rawLocale } = await params
  setRequestLocale(rawLocale)
  const locale = rawLocale as Locale
  const t = await getTranslations()
  const storyline = await getStoryline(locale).catch(() => null)
  const eras = storyline?.eras ?? []

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16">
      <SectionHeader
        as="h1"
        kicker={t('lore.kicker')}
        title={storyline?.title ?? t('lore.title')}
        description={storyline?.intro ?? t('lore.intro')}
      />

      {eras.length === 0 && <p className="py-20 text-center text-ash">{t('common.noEntries')}</p>}

      <ol className="relative mt-6 space-y-16 border-l border-line pl-8 md:pl-14">
        {eras.map((era, i) => {
          const image =
            mediaRef(era.image) ??
            (era.imageUrl
              ? { id: era.imageUrl, kind: 'artwork' as const, url: era.imageUrl }
              : null)
          const characters = populatedMany(era.characters)
          const scenarios = populatedMany(era.scenarios)
          const factions = populatedMany(era.factions)
          return (
            <Reveal key={era.id ?? i} as="li" className="relative">
              <span
                aria-hidden
                className="absolute -left-[2.05rem] top-2 flex h-4 w-4 rotate-45 items-center justify-center bg-void ring-1 ring-ember md:-left-[3.55rem]"
              >
                <span className="h-1.5 w-1.5 bg-ember" />
              </span>
              <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
                <div className="min-w-0">
                  <p className="hud-numerals text-xs text-ember">
                    {t('lore.era')} {String(i + 1).padStart(2, '0')}
                    {era.period ? ` · ${era.period}` : ''}
                  </p>
                  <h2 className="mt-2 font-display text-3xl font-bold leading-[0.95] text-bone md:text-4xl">
                    {era.title}
                  </h2>
                  {era.subtitle && (
                    <p className="mt-2 font-headline text-xl text-ash">{era.subtitle}</p>
                  )}
                  <div className="mt-6">
                    <RichText data={era.body} />
                  </div>
                  <div className="mt-6 space-y-4">
                    <ChipLinks
                      title={t('nav.characters')}
                      items={characters.map((c) => ({
                        href: entityHref('characters', c.slug, locale),
                        label: c.localizedName || c.name,
                      }))}
                    />
                    <ChipLinks
                      title={t('nav.scenarios')}
                      items={scenarios.map((s) => ({
                        href: entityHref('scenarios', s.slug, locale),
                        label: s.localizedName || s.name,
                      }))}
                    />
                    <ChipLinks
                      title={t('nav.factions')}
                      items={factions.map((f) => ({
                        href: entityHref('factions', f.slug, locale),
                        label: f.localizedName || f.name,
                      }))}
                    />
                  </div>
                  {era.sources && era.sources.length > 0 && (
                    <p className="mt-6 text-xs text-dust">
                      {t('common.source')}:{' '}
                      {era.sources.map((s, j) => (
                        <a
                          key={s.id ?? j}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-flare"
                        >
                          [{j + 1}]{' '}
                        </a>
                      ))}
                    </p>
                  )}
                </div>
                {image && (
                  <div className="hud-brackets aspect-[4/5] chamfer bg-line-strong p-px lg:sticky lg:top-24 lg:self-start">
                    <EntityImage
                      media={image}
                      alt={era.title}
                      initial={era.title}
                      className="h-full w-full chamfer"
                    />
                  </div>
                )}
              </div>
            </Reveal>
          )
        })}
      </ol>
    </div>
  )
}
