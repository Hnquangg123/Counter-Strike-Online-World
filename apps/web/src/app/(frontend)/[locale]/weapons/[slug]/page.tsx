import { GRADE_META, type Locale, WEAPON_CATEGORY_META } from '@csow/schema'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Reveal } from '@/components/fx/reveal'
import { GradeBadge, Tag } from '@/components/ui/badge'
import { EntityImage } from '@/components/ui/entity-image'
import { Panel } from '@/components/ui/panel'
import { Kicker } from '@/components/ui/section-header'
import { StatBar } from '@/components/ui/stat-bar'
import { Attribution } from '@/components/world/attribution'
import { CharacterCard, WeaponCard } from '@/components/world/cards'
import { Dossier, NamedList, ReleaseList, TriviaList } from '@/components/world/details'
import { FigureViewer } from '@/components/world/figure-viewer'
import { Gallery } from '@/components/world/gallery'
import { RichText } from '@/components/world/rich-text'
import { galleryOf, heroOf, mediaRef, srcFor } from '@/lib/media'
import { populated, populatedMany } from '@/lib/utils'
import { getEntityBySlug, listAllSlugs } from '@/lib/world'

export const revalidate = 300

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateStaticParams() {
  const slugs = await listAllSlugs('weapons').catch(() => [])
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const doc = await getEntityBySlug('weapons', slug, locale as Locale)
  if (!doc) return {}
  const hero = heroOf(doc)
  return {
    title: doc.localizedName || doc.name,
    description: doc.summary ?? doc.tagline ?? undefined,
    openGraph: hero ? { images: [{ url: srcFor(hero, 'hero') ?? hero.url }] } : undefined,
  }
}

const STAT_KEYS = [
  'damage',
  'accuracy',
  'recoil',
  'rateOfFire',
  'weight',
  'knockback',
  'stun',
] as const

export default async function WeaponPage({ params }: Props) {
  const { locale: rawLocale, slug } = await params
  setRequestLocale(rawLocale)
  const locale = rawLocale as Locale
  const doc = await getEntityBySlug('weapons', slug, locale, 2)
  if (!doc) notFound()
  const t = await getTranslations()

  const name = doc.localizedName || doc.name
  const grade = doc.grade ?? 'unknown'
  const accent = doc.accentColor ?? (grade !== 'unknown' ? GRADE_META[grade].color : '#f58a07')
  const icon = populated(doc.icon)
  const hero = heroOf(doc)
  const gallery = galleryOf(doc)
  const variants = populatedMany(doc.variants)
  const characters = populatedMany(doc.characters)
  const model = mediaRef(doc.model3d)
  const notes = (doc.statNotes ?? {}) as Record<string, string>
  const stats = doc.stats ?? {}
  const hasNumeric = STAT_KEYS.some((k) => typeof stats[k] === 'number')

  return (
    <article style={{ '--accent': accent } as React.CSSProperties}>
      <section className="relative isolate overflow-hidden border-b border-line">
        <div aria-hidden className="tac-grid absolute inset-0 opacity-50" />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 60% 70% at 70% 50%, color-mix(in srgb, ${accent} 20%, transparent), transparent 70%)`,
          }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-10 md:px-6 lg:grid-cols-[1fr_1fr] lg:items-center lg:pb-20 lg:pt-14">
          <div>
            <Reveal>
              <div className="flex flex-wrap items-center gap-2">
                <Tag>{WEAPON_CATEGORY_META[doc.category].label}</Tag>
                {grade !== 'unknown' && <GradeBadge grade={grade} label={t(`grade.${grade}`)} />}
                {doc.origin && <Tag>{doc.origin}</Tag>}
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <h1 className="mt-5 font-display text-5xl font-bold leading-[0.9] text-bone sm:text-6xl lg:text-[5rem]">
                {name}
              </h1>
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
              <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-line pt-6 sm:grid-cols-4">
                {[
                  [t('weapons.magazine'), doc.ammo?.magazine],
                  [t('weapons.reserve'), doc.ammo?.reserve],
                  [
                    t('weapons.price'),
                    typeof doc.price === 'number' ? `$${doc.price.toLocaleString()}` : null,
                  ],
                  [t('weapons.ammoType'), doc.ammo?.type ?? doc.caliber],
                ]
                  .filter(([, v]) => v !== null && v !== undefined && v !== '')
                  .map(([label, value]) => (
                    <div key={String(label)}>
                      <dt className="font-display text-[0.6rem] uppercase tracking-[0.24em] text-dust">
                        {label}
                      </dt>
                      <dd className="hud-numerals mt-1 text-xl text-(--accent)">{String(value)}</dd>
                    </div>
                  ))}
              </dl>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div className="hud-brackets relative aspect-[16/10] chamfer-lg bg-line-strong p-px">
              <div className="relative h-full w-full chamfer-lg bg-carbon scanlines">
                <div aria-hidden className="tac-grid absolute inset-0 opacity-80" />
                <EntityImage
                  media={
                    icon
                      ? { id: String(icon.id), kind: 'icon', url: icon.url ?? '', alt: name }
                      : hero
                  }
                  alt={name}
                  initial={name}
                  fit="contain"
                  priority
                  className="absolute inset-0 bg-transparent p-8 md:p-12"
                  imgClassName="drop-shadow-[0_24px_40px_rgba(0,0,0,0.7)]"
                  sizes="(min-width: 1024px) 45vw, 90vw"
                  pendingLabel={t('common.imagePending')}
                />
                <div className="absolute inset-x-5 bottom-4 flex items-center justify-between font-mono text-[0.62rem] uppercase tracking-[0.2em] text-dust">
                  <span>{doc.manufacturer ?? doc.origin ?? 'CSO ARMORY'}</span>
                  <span className="text-(--accent)">
                    {doc.fireModes?.join(' / ') || doc.category}
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-14 md:px-6 lg:grid-cols-[1fr_380px] lg:gap-16">
        <div className="min-w-0 space-y-14">
          <Reveal as="section">
            <Kicker className="mb-5">{t('common.stats')}</Kicker>
            <Panel>
              <div className="grid gap-5 p-5 md:grid-cols-2 md:p-6">
                {STAT_KEYS.map((k) => (
                  <StatBar
                    key={k}
                    label={t(`weapons.${k}`)}
                    value={typeof stats[k] === 'number' ? stats[k] : null}
                    max={100}
                    readout={typeof stats[k] === 'number' ? 'percent' : 'none'}
                    note={notes[k] ?? null}
                  />
                ))}
              </div>
              {!hasNumeric && (
                <p className="border-t border-line px-6 py-3 text-xs text-dust">
                  {t('weapons.statNotes')} — values pending ingestion from the wiki infobox.
                </p>
              )}
            </Panel>
          </Reveal>

          {doc.description && (
            <Reveal as="section">
              <Kicker className="mb-5">{t('common.story')}</Kicker>
              <RichText data={doc.description} />
            </Reveal>
          )}

          {doc.abilities && doc.abilities.length > 0 && (
            <Reveal>
              <NamedList items={doc.abilities} title={t('common.abilities')} />
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
          <Reveal>
            <FigureViewer
              modelUrl={model?.url}
              accent={accent}
              name={name}
              variant="weapon"
              className="aspect-[4/3]"
              labels={{
                title: t('common.figure3d'),
                hint: t('common.figureHint'),
                pending: t('common.figurePending'),
              }}
            />
          </Reveal>
          <Reveal>
            <Dossier
              title="Spec"
              rows={[
                { label: t('weapons.origin'), value: doc.origin },
                { label: t('weapons.manufacturer'), value: doc.manufacturer },
                { label: 'Caliber', value: doc.caliber },
                { label: t('weapons.fireModes'), value: doc.fireModes?.join(', ') },
                { label: t('weapons.obtain'), value: doc.obtainMethod },
              ]}
            />
          </Reveal>
          <Reveal>
            <ReleaseList release={doc.release} title={t('common.releasedIn')} locale={locale} />
          </Reveal>
        </aside>
      </div>

      {(variants.length > 0 || characters.length > 0) && (
        <section className="mx-auto max-w-7xl space-y-10 px-4 pb-10 md:px-6">
          {variants.length > 0 && (
            <div>
              <Kicker className="mb-6">{t('weapons.variants')}</Kicker>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {variants.slice(0, 4).map((w) => (
                  <WeaponCard
                    key={w.id}
                    weapon={w}
                    categoryLabel={WEAPON_CATEGORY_META[w.category].label}
                  />
                ))}
              </div>
            </div>
          )}
          {characters.length > 0 && (
            <div>
              <Kicker className="mb-6">{t('weapons.usedBy')}</Kicker>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {characters.slice(0, 4).map((c) => (
                  <CharacterCard key={c.id} character={c} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <Attribution source={doc.wikiSource} />
      </div>
    </article>
  )
}
