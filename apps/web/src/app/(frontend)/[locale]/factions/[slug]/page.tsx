import { type Locale, SIDE_META } from '@csow/schema'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Reveal } from '@/components/fx/reveal'
import { SideBadge } from '@/components/ui/badge'
import { EntityImage } from '@/components/ui/entity-image'
import { Kicker } from '@/components/ui/section-header'
import { Attribution } from '@/components/world/attribution'
import { CharacterCard } from '@/components/world/cards'
import { TriviaList } from '@/components/world/details'
import { Gallery } from '@/components/world/gallery'
import { RichText } from '@/components/world/rich-text'
import { galleryOf, heroOf } from '@/lib/media'
import { populatedMany } from '@/lib/utils'
import { getEntityBySlug, listAllSlugs, listEntities } from '@/lib/world'

export const revalidate = 300

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateStaticParams() {
  const slugs = await listAllSlugs('factions').catch(() => [])
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const doc = await getEntityBySlug('factions', slug, locale as Locale)
  if (!doc) return {}
  return {
    title: doc.localizedName || doc.name,
    description: doc.summary ?? doc.tagline ?? undefined,
  }
}

export default async function FactionPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params
  setRequestLocale(rawLocale)
  const locale = rawLocale as Locale
  const doc = await getEntityBySlug('factions', slug, locale, 2)
  if (!doc) notFound()
  const t = await getTranslations()
  const name = doc.localizedName || doc.name
  const side = doc.side ?? 'neutral'
  const accent = doc.accentColor ?? SIDE_META[side].color
  const emblem = heroOf({
    heroImage: doc.emblem,
    gallery: doc.gallery,
    remoteMedia: doc.remoteMedia,
  })
  const gallery = galleryOf(doc)
  const leaders = populatedMany(doc.leaders)
  const explicitMembers = populatedMany(doc.members)
  const members = explicitMembers.length
    ? explicitMembers
    : (
        await listEntities('characters', {
          locale,
          limit: 12,
          where: { factions: { equals: doc.id } },
        })
      ).docs

  return (
    <article style={{ '--accent': accent } as React.CSSProperties}>
      <section className="relative isolate overflow-hidden border-b border-line">
        <div aria-hidden className="tac-grid absolute inset-0 opacity-50" />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 60% 80% at 80% 30%, color-mix(in srgb, ${accent} 22%, transparent), transparent 70%)`,
          }}
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-14 pt-14 md:grid-cols-[1fr_260px] md:px-6 lg:pb-20 lg:pt-20">
          <div>
            <Reveal>
              <SideBadge side={side} label={t(`side.${side}`)} />
            </Reveal>
            <Reveal delay={0.06}>
              <h1 className="mt-5 font-display text-5xl font-bold leading-[0.9] text-bone sm:text-6xl lg:text-[5rem]">
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
          </div>
          <Reveal delay={0.1}>
            <div className="hud-brackets mx-auto aspect-square w-52 chamfer-lg bg-line-strong p-px md:w-full">
              <EntityImage
                media={emblem}
                alt={name}
                initial={name}
                fit="contain"
                className="h-full w-full chamfer-lg bg-carbon p-8"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-14 md:px-6">
        {doc.description && (
          <Reveal as="section" className="max-w-3xl">
            <Kicker className="mb-5">{t('common.story')}</Kicker>
            <RichText data={doc.description} />
          </Reveal>
        )}
        {doc.lore && (
          <Reveal as="section" className="max-w-3xl">
            <RichText data={doc.lore} />
          </Reveal>
        )}
        {leaders.length > 0 && (
          <Reveal as="section">
            <Kicker className="mb-6">{t('factions.leaders')}</Kicker>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {leaders.map((c) => (
                <CharacterCard
                  key={c.id}
                  character={c}
                  labels={{ pending: t('common.imagePending') }}
                />
              ))}
            </div>
          </Reveal>
        )}
        {members.length > 0 && (
          <Reveal as="section">
            <Kicker className="mb-6">{t('factions.members')}</Kicker>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {members.map((c) => (
                <CharacterCard
                  key={c.id}
                  character={c}
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
        <Attribution source={doc.wikiSource} />
      </div>
    </article>
  )
}
