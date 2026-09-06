import type { Locale } from '@csow/schema'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Reveal } from '@/components/fx/reveal'
import { Panel } from '@/components/ui/panel'
import { Kicker, Stamp } from '@/components/ui/section-header'
import { Attribution } from '@/components/world/attribution'
import { ScenarioCard } from '@/components/world/cards'
import { ReleaseList, TriviaList } from '@/components/world/details'
import { Gallery } from '@/components/world/gallery'
import { RichText } from '@/components/world/rich-text'
import { galleryOf } from '@/lib/media'
import { getEntityBySlug, listAllSlugs, listEntities } from '@/lib/world'

export const revalidate = 300

type Props = { params: Promise<{ locale: string; slug: string }> }

const FAMILY_ACCENT: Record<string, string> = {
  original: '#f58a07',
  zombie: '#7cff3f',
  scenario: '#ffd400',
  fun: '#b36bff',
  pve: '#5cf2ff',
  competitive: '#3f8cff',
  other: '#9aa0a8',
}

export async function generateStaticParams() {
  const slugs = await listAllSlugs('game-modes').catch(() => [])
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const doc = await getEntityBySlug('game-modes', slug, locale as Locale)
  if (!doc) return {}
  return {
    title: doc.localizedName || doc.name,
    description: doc.summary ?? doc.tagline ?? undefined,
  }
}

export default async function ModePage({ params }: Props) {
  const { locale: rawLocale, slug } = await params
  setRequestLocale(rawLocale)
  const locale = rawLocale as Locale
  const doc = await getEntityBySlug('game-modes', slug, locale, 1)
  if (!doc) notFound()
  const t = await getTranslations()
  const chapters = (
    await listEntities('scenarios', {
      locale,
      limit: 100,
      sort: 'chapter',
      where: { gameMode: { equals: doc.id } },
    })
  ).docs
  const name = doc.localizedName || doc.name
  const accent = doc.accentColor ?? FAMILY_ACCENT[doc.family] ?? '#f58a07'
  const gallery = galleryOf(doc)

  return (
    <article style={{ '--accent': accent } as React.CSSProperties}>
      <section className="relative isolate overflow-hidden border-b border-line">
        <div aria-hidden className="tac-grid absolute inset-0 opacity-50" />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 60% 80% at 20% 20%, color-mix(in srgb, ${accent} 20%, transparent), transparent 70%)`,
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-14 md:px-6 lg:pb-20 lg:pt-20">
          <Reveal>
            <Stamp>{t(`family.${doc.family}`)}</Stamp>
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
          {typeof doc.maxPlayers === 'number' && (
            <Reveal delay={0.24}>
              <p className="mt-8 hud-numerals text-sm text-(--accent)">
                {t('modes.maxPlayers')}: {doc.maxPlayers}
              </p>
            </Reveal>
          )}
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 md:px-6 lg:grid-cols-[1fr_360px] lg:gap-16">
        <div className="min-w-0 space-y-14">
          {doc.lore && (
            <Reveal as="section">
              <Kicker className="mb-5">{t('modes.lore')}</Kicker>
              <RichText data={doc.lore} />
            </Reveal>
          )}
          {doc.description && (
            <Reveal as="section">
              <Kicker className="mb-5">{t('common.story')}</Kicker>
              <RichText data={doc.description} />
            </Reveal>
          )}
          {chapters.length > 0 && (
            <Reveal as="section">
              <Kicker className="mb-6">{t('modes.chapters')}</Kicker>
              <div className="grid gap-4 lg:grid-cols-2">
                {chapters.map((s) => (
                  <ScenarioCard
                    key={s.id}
                    scenario={s}
                    labels={{
                      season: t('scenarios.season'),
                      chapter: t('scenarios.chapter'),
                      pending: t('common.imagePending'),
                    }}
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
          {doc.rules && doc.rules.length > 0 && (
            <Reveal>
              <Panel>
                <div className="p-5">
                  <p className="kicker mb-4">{t('modes.rules')}</p>
                  <ul className="space-y-2">
                    {doc.rules.map((r, i) => (
                      <li key={r.id ?? i} className="flex gap-3 text-sm text-bone">
                        <span className="hud-numerals mt-0.5 text-[0.65rem] text-(--accent)">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span>{r.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Panel>
            </Reveal>
          )}
          <Reveal>
            <ReleaseList release={doc.release} title={t('common.releasedIn')} locale={locale} />
          </Reveal>
        </aside>
      </div>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <Attribution source={doc.wikiSource} />
      </div>
    </article>
  )
}
