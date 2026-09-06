import type { Locale } from '@csow/schema'
import { ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Reveal } from '@/components/fx/reveal'
import { Tag } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EntityImage } from '@/components/ui/entity-image'
import { Panel } from '@/components/ui/panel'
import { Kicker } from '@/components/ui/section-header'
import { Attribution } from '@/components/world/attribution'
import { CharacterCard } from '@/components/world/cards'
import { ChipLinks, ReleaseList, TriviaList } from '@/components/world/details'
import { Gallery } from '@/components/world/gallery'
import { RichText } from '@/components/world/rich-text'
import { Link } from '@/i18n/navigation'
import { entityHref } from '@/lib/href'
import { galleryOf, heroOf, srcFor } from '@/lib/media'
import { populated, populatedMany } from '@/lib/utils'
import { getEntityBySlug, listAllSlugs } from '@/lib/world'

export const revalidate = 300

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateStaticParams() {
  const slugs = await listAllSlugs('scenarios').catch(() => [])
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const doc = await getEntityBySlug('scenarios', slug, locale as Locale)
  if (!doc) return {}
  const hero = heroOf(doc)
  return {
    title: doc.localizedName || doc.name,
    description: doc.summary ?? doc.tagline ?? undefined,
    openGraph: hero ? { images: [{ url: srcFor(hero, 'hero') ?? hero.url }] } : undefined,
  }
}

export default async function ScenarioPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params
  setRequestLocale(rawLocale)
  const locale = rawLocale as Locale
  const doc = await getEntityBySlug('scenarios', slug, locale, 2)
  if (!doc) notFound()
  const t = await getTranslations()

  const name = doc.localizedName || doc.name
  const accent = doc.accentColor ?? '#ffd400'
  const hero = heroOf(doc)
  const gallery = galleryOf(doc)
  const mode = populated(doc.gameMode)
  const bosses = populatedMany(doc.bosses)
  const cast = populatedMany(doc.characters)
  const maps = populatedMany(doc.maps)
  const next = populated(doc.nextChapter)

  return (
    <article style={{ '--accent': accent } as React.CSSProperties}>
      <section className="relative isolate overflow-hidden border-b border-line">
        <div className="absolute inset-0">
          <EntityImage
            media={hero}
            alt=""
            initial={name}
            className="h-full w-full opacity-40"
            imgClassName="blur-[2px] scale-105"
            sizes="100vw"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-b from-void/40 via-void/70 to-void"
          />
        </div>
        <div aria-hidden className="absolute inset-x-0 top-0 h-1.5 hazard-stripes opacity-70" />
        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-16 md:px-6 lg:pb-20 lg:pt-24">
          <Reveal>
            <div className="flex flex-wrap items-center gap-3 font-mono text-[0.72rem] uppercase tracking-[0.22em] text-(--accent)">
              {mode && (
                <Link href={`/modes/${mode.slug}`} className="hover:text-flare">
                  {mode.localizedName || mode.name}
                </Link>
              )}
              {doc.season && <span className="text-ash">· {doc.season}</span>}
              {typeof doc.chapter === 'number' && (
                <span className="text-ash">
                  · {t('scenarios.chapter')} {String(doc.chapter).padStart(2, '0')}
                </span>
              )}
            </div>
          </Reveal>
          <Reveal delay={0.06}>
            <h1 className="mt-5 max-w-4xl font-display text-5xl font-bold leading-[0.9] text-bone sm:text-6xl lg:text-[5.5rem]">
              {name}
            </h1>
          </Reveal>
          {doc.tagline && (
            <Reveal delay={0.12}>
              <p className="mt-5 max-w-2xl font-headline text-2xl font-medium leading-snug text-(--accent)">
                {doc.tagline}
              </p>
            </Reveal>
          )}
          {doc.summary && (
            <Reveal delay={0.18}>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ash">{doc.summary}</p>
            </Reveal>
          )}
          {doc.difficulties && doc.difficulties.length > 0 && (
            <Reveal delay={0.24}>
              <div className="mt-8 flex flex-wrap items-center gap-2">
                <span className="font-display text-[0.62rem] uppercase tracking-[0.24em] text-dust">
                  {t('scenarios.difficulty')}
                </span>
                {doc.difficulties.map((d) => (
                  <Tag key={d} className="text-(--accent)">
                    {d}
                  </Tag>
                ))}
              </div>
            </Reveal>
          )}
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 md:px-6 lg:grid-cols-[1fr_360px] lg:gap-16">
        <div className="min-w-0 space-y-14">
          {doc.story && (
            <Reveal as="section">
              <Kicker className="mb-5">{t('common.story')}</Kicker>
              <RichText data={doc.story} />
            </Reveal>
          )}

          {bosses.length > 0 && (
            <Reveal as="section">
              <Kicker className="mb-6">{t('scenarios.bosses')}</Kicker>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {bosses.map((b) => (
                  <CharacterCard
                    key={b.id}
                    character={b}
                    labels={{ pending: t('common.imagePending') }}
                  />
                ))}
              </div>
            </Reveal>
          )}

          {gallery.length > 0 && (
            <Reveal as="section">
              <Kicker className="mb-5">{t('common.gallery')}</Kicker>
              <Gallery items={gallery} title={name} />
            </Reveal>
          )}

          {doc.trivia && doc.trivia.length > 0 && (
            <Reveal>
              <TriviaList items={doc.trivia.map((x) => x.text)} title={t('common.trivia')} />
            </Reveal>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {doc.objectives && doc.objectives.length > 0 && (
            <Reveal>
              <Panel>
                <div className="p-5">
                  <p className="kicker mb-4">{t('scenarios.objectives')}</p>
                  <ol className="space-y-2">
                    {doc.objectives.map((o, i) => (
                      <li key={o.id ?? i} className="flex gap-3 text-sm text-bone">
                        <span className="hud-numerals mt-0.5 text-[0.65rem] text-(--accent)">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span>{o.text}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </Panel>
            </Reveal>
          )}
          {doc.rewards && doc.rewards.length > 0 && (
            <Reveal>
              <Panel>
                <div className="p-5">
                  <p className="kicker mb-4">{t('scenarios.rewards')}</p>
                  <ul className="space-y-1.5 text-sm text-ash">
                    {doc.rewards.map((r, i) => (
                      <li key={r.id ?? i}>› {r.text}</li>
                    ))}
                  </ul>
                </div>
              </Panel>
            </Reveal>
          )}
          {(cast.length > 0 || maps.length > 0) && (
            <Reveal>
              <Panel>
                <div className="space-y-5 p-5">
                  <ChipLinks
                    title={t('scenarios.cast')}
                    items={cast.map((c) => ({
                      href: entityHref('characters', c.slug, locale),
                      label: c.localizedName || c.name,
                    }))}
                  />
                  <ChipLinks
                    title={t('scenarios.maps')}
                    items={maps.map((m) => ({
                      href: entityHref('maps', m.slug, locale),
                      label: m.localizedName || m.name,
                    }))}
                  />
                </div>
              </Panel>
            </Reveal>
          )}
          <Reveal>
            <ReleaseList release={doc.release} title={t('common.releasedIn')} locale={locale} />
          </Reveal>
          {next && (
            <Reveal>
              <Button asChild variant="accent" className="w-full">
                <Link href={`/scenarios/${next.slug}`}>
                  {t('scenarios.nextChapter')}: {next.localizedName || next.name}{' '}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </Reveal>
          )}
        </aside>
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <Attribution source={doc.wikiSource} />
      </div>
    </article>
  )
}
