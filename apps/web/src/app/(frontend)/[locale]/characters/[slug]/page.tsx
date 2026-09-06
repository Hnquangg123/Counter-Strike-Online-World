import { GRADE_META, type Locale, SIDE_META } from '@csow/schema'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Dust } from '@/components/fx/dust'
import { Reveal } from '@/components/fx/reveal'
import { GradeBadge, SideBadge, Tag } from '@/components/ui/badge'
import { EntityImage } from '@/components/ui/entity-image'
import { Panel } from '@/components/ui/panel'
import { Kicker } from '@/components/ui/section-header'
import { StatBar } from '@/components/ui/stat-bar'
import { Attribution } from '@/components/world/attribution'
import { AudioPlayer } from '@/components/world/audio-player'
import { CharacterCard } from '@/components/world/cards'
import {
  ChipLinks,
  Dossier,
  NamedList,
  QuoteList,
  ReleaseList,
  TriviaList,
} from '@/components/world/details'
import { FigureViewer } from '@/components/world/figure-viewer'
import { Gallery } from '@/components/world/gallery'
import { RichText } from '@/components/world/rich-text'
import { Link } from '@/i18n/navigation'
import { entityHref } from '@/lib/href'
import { audioOf, galleryOf, heroOf, mediaRef, srcFor } from '@/lib/media'
import { populated, populatedMany } from '@/lib/utils'
import { getEntityBySlug, listAllSlugs } from '@/lib/world'

export const revalidate = 300

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateStaticParams() {
  const slugs = await listAllSlugs('characters').catch(() => [])
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const doc = await getEntityBySlug('characters', slug, locale as Locale)
  if (!doc) return {}
  const hero = heroOf(doc)
  return {
    title: doc.localizedName || doc.name,
    description: doc.summary ?? doc.tagline ?? undefined,
    openGraph: hero ? { images: [{ url: srcFor(hero, 'hero') ?? hero.url }] } : undefined,
  }
}

export default async function CharacterPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params
  setRequestLocale(rawLocale)
  const locale = rawLocale as Locale
  const doc = await getEntityBySlug('characters', slug, locale, 2)
  if (!doc) notFound()
  const t = await getTranslations()

  const name = doc.localizedName || doc.name
  const grade = doc.grade ?? 'unknown'
  const side = doc.side ?? 'neutral'
  const accent =
    doc.accentColor ?? (grade !== 'unknown' ? GRADE_META[grade].color : SIDE_META[side].color)
  const hero = heroOf(doc)
  const gallery = galleryOf(doc)
  const voiceLines = audioOf(doc)
  const factions = populatedMany(doc.factions)
  const signature = populated(doc.signatureWeapon)
  const weapons = populatedMany(doc.weapons)
  const related = populatedMany(doc.relatedCharacters)
  const scenarios = populatedMany(doc.scenarios)
  const modes = populatedMany(doc.gameModes)
  const model = mediaRef(doc.model3d)
  const stats = doc.scenarioStats ?? {}
  const hasStats = Object.values(stats).some((v) => typeof v === 'number')

  return (
    <article style={{ '--accent': accent } as React.CSSProperties}>
      {/* ───────────── Spotlight hero ───────────── */}
      <section className="relative isolate overflow-hidden border-b border-line">
        <div aria-hidden className="tac-grid absolute inset-0 opacity-50" />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 55% 80% at 30% 30%, color-mix(in srgb, ${accent} 24%, transparent), transparent 70%)`,
          }}
        />
        <Dust
          className="absolute inset-0 h-full w-full opacity-60"
          color={hexToRgb(accent)}
          density={60}
        />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-10 md:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:pb-20 lg:pt-14">
          <Reveal className="relative order-2 lg:order-1">
            <div className="hud-brackets relative mx-auto aspect-[3/4] w-full max-w-md chamfer-lg bg-line-strong p-px lg:max-w-none">
              <div className="relative h-full w-full chamfer-lg bg-carbon scanlines">
                <EntityImage
                  media={hero}
                  alt={name}
                  initial={name}
                  priority
                  className="absolute inset-0"
                  imgClassName="object-top"
                  sizes="(min-width: 1024px) 45vw, 90vw"
                  pendingLabel={t('common.imagePending')}
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: 'linear-gradient(180deg, transparent 60%, rgba(7,8,10,0.85) 100%)',
                  }}
                />
                <div className="absolute inset-x-5 bottom-5 flex items-center justify-between font-mono text-[0.62rem] uppercase tracking-[0.2em] text-dust">
                  <span>ID {String(doc.id).padStart(4, '0')}</span>
                  <span className="text-(--accent)">{doc.kind.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </Reveal>

          <div className="order-1 lg:order-2">
            <Reveal>
              <div className="flex flex-wrap items-center gap-2">
                {side !== 'neutral' && <SideBadge side={side} label={t(`side.${side}`)} />}
                {grade !== 'unknown' && <GradeBadge grade={grade} label={t(`grade.${grade}`)} />}
                <Tag>{t(`kind.${doc.kind}`)}</Tag>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <h1 className="mt-5 font-display text-5xl font-bold leading-[0.9] text-bone sm:text-6xl lg:text-[5.5rem]">
                {name}
              </h1>
              {doc.localizedName && doc.localizedName !== doc.name && (
                <p className="mt-2 font-display text-sm uppercase tracking-[0.3em] text-dust">
                  {doc.name}
                </p>
              )}
            </Reveal>
            {doc.tagline && (
              <Reveal delay={0.12}>
                <p className="mt-5 max-w-xl font-headline text-2xl font-medium leading-snug text-(--accent)">
                  {doc.tagline}
                </p>
              </Reveal>
            )}
            {doc.summary && (
              <Reveal delay={0.18}>
                <p className="mt-5 max-w-xl text-lg leading-relaxed text-ash">{doc.summary}</p>
              </Reveal>
            )}
            <Reveal delay={0.24}>
              <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-6 sm:grid-cols-3">
                {doc.classType && <Fact label={t('kind.human')} value={doc.classType} />}
                {doc.profile?.occupation && <Fact label="Role" value={doc.profile.occupation} />}
                {factions.length > 0 && (
                  <Fact
                    label={t('characters.factions')}
                    value={
                      <span className="flex flex-wrap gap-x-2">
                        {factions.map((f) => (
                          <Link
                            key={f.id}
                            href={`/factions/${f.slug}`}
                            className="hover:text-(--accent)"
                          >
                            {f.localizedName || f.name}
                          </Link>
                        ))}
                      </span>
                    }
                  />
                )}
                {signature && (
                  <Fact
                    label={t('characters.signatureWeapon')}
                    value={
                      <Link
                        href={`/weapons/${signature.slug}`}
                        className="text-(--accent) hover:text-flare"
                      >
                        {signature.localizedName || signature.name} →
                      </Link>
                    }
                  />
                )}
              </dl>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ───────────── Body ───────────── */}
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 md:px-6 lg:grid-cols-[1fr_380px] lg:gap-16">
        <div className="min-w-0 space-y-14">
          {doc.story && (
            <Reveal as="section">
              <Kicker className="mb-5">{t('common.story')}</Kicker>
              <RichText data={doc.story} />
            </Reveal>
          )}

          {voiceLines.length > 0 && (
            <Reveal as="section">
              <Kicker className="mb-5">{t('common.quotes')}</Kicker>
              <div className="grid gap-3 md:grid-cols-2">
                {voiceLines.map((a) => (
                  <AudioPlayer
                    key={a.id}
                    src={a.url}
                    title={a.caption ?? name}
                    caption={a.credit}
                    labels={{ play: t('music.play'), pause: t('music.pause') }}
                  />
                ))}
              </div>
            </Reveal>
          )}

          {doc.quotes && doc.quotes.length > 0 && (
            <Reveal>
              <QuoteList
                quotes={doc.quotes}
                title={voiceLines.length ? 'Transcript' : t('common.quotes')}
              />
            </Reveal>
          )}

          {doc.abilities && doc.abilities.length > 0 && (
            <Reveal>
              <NamedList items={doc.abilities} title={t('common.abilities')} />
            </Reveal>
          )}

          {doc.costumes && doc.costumes.length > 0 && (
            <Reveal as="section">
              <Kicker className="mb-4">Costumes</Kicker>
              <ul className="grid gap-3 sm:grid-cols-2">
                {doc.costumes.map((c) => (
                  <li
                    key={c.id ?? c.name}
                    className="flex gap-4 chamfer-sm bg-steel/60 p-4 ring-1 ring-inset ring-line"
                  >
                    {c.imageUrl && (
                      <EntityImage
                        media={{ id: c.imageUrl, kind: 'artwork', url: c.imageUrl }}
                        alt={c.name}
                        initial={c.name}
                        fit="contain"
                        className="h-20 w-20 shrink-0 chamfer-sm"
                      />
                    )}
                    <div>
                      <p className="font-display text-sm font-bold uppercase tracking-wide text-bone">
                        {c.name}
                      </p>
                      {c.description && <p className="mt-1 text-sm text-ash">{c.description}</p>}
                    </div>
                  </li>
                ))}
              </ul>
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

        {/* ───────────── Sidebar ───────────── */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Reveal>
            <FigureViewer
              modelUrl={model?.url}
              accent={accent}
              name={name}
              className="aspect-[4/5]"
              labels={{
                title: t('common.figure3d'),
                hint: t('common.figureHint'),
                pending: t('common.figurePending'),
              }}
            />
          </Reveal>

          {hasStats && (
            <Reveal>
              <Panel>
                <div className="space-y-4 p-5">
                  <p className="kicker">{t('characters.scenarioStats')}</p>
                  {(['health', 'attack', 'mobility', 'armor', 'ammo'] as const).map((k) => (
                    <StatBar key={k} label={k} value={stats[k]} max={28} />
                  ))}
                </div>
              </Panel>
            </Reveal>
          )}

          <Reveal>
            <Dossier
              title={t('common.profile')}
              rows={[
                { label: 'Gender', value: doc.profile?.gender },
                { label: 'Age', value: doc.profile?.age },
                { label: 'Height', value: doc.profile?.height },
                { label: 'Weight', value: doc.profile?.weight },
                { label: 'Birthplace', value: doc.profile?.birthplace },
                { label: 'Nationality', value: doc.profile?.nationality },
                { label: 'Birthday', value: doc.profile?.birthday },
                { label: 'Blood type', value: doc.profile?.bloodType },
                {
                  label: t('characters.voiceActors'),
                  value: doc.voiceActors?.length ? (
                    <ul className="space-y-1">
                      {doc.voiceActors.map((v) => (
                        <li key={v.id ?? v.name}>
                          <span className="text-dust">{v.region}</span> · {v.name}
                        </li>
                      ))}
                    </ul>
                  ) : null,
                },
              ]}
            />
          </Reveal>

          <Reveal>
            <ReleaseList release={doc.release} title={t('common.releasedIn')} locale={locale} />
          </Reveal>

          {(weapons.length > 0 || scenarios.length > 0 || modes.length > 0) && (
            <Reveal>
              <Panel>
                <div className="space-y-5 p-5">
                  <ChipLinks
                    title={t('weapons.title')}
                    items={weapons.map((w) => ({
                      href: entityHref('weapons', w.slug, locale),
                      label: w.localizedName || w.name,
                    }))}
                  />
                  <ChipLinks
                    title={t('characters.appearsIn')}
                    items={[
                      ...scenarios.map((s) => ({
                        href: entityHref('scenarios', s.slug, locale),
                        label: s.localizedName || s.name,
                      })),
                      ...modes.map((m) => ({
                        href: entityHref('game-modes', m.slug, locale),
                        label: m.localizedName || m.name,
                      })),
                    ]}
                  />
                </div>
              </Panel>
            </Reveal>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-10 md:px-6">
          <Kicker className="mb-6">{t('characters.related')}</Kicker>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.slice(0, 4).map((c) => (
              <CharacterCard
                key={c.id}
                character={c}
                labels={{ pending: t('common.imagePending') }}
              />
            ))}
          </div>
        </section>
      )}

      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <Attribution source={doc.wikiSource} />
      </div>
    </article>
  )
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="font-display text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-dust">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-bone">{value}</dd>
    </div>
  )
}

function hexToRgb(hex: string): string {
  const m = hex.replace('#', '')
  const full =
    m.length === 3
      ? m
          .split('')
          .map((c) => c + c)
          .join('')
      : m
  const n = Number.parseInt(full, 16)
  if (Number.isNaN(n)) return '245, 138, 7'
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}
