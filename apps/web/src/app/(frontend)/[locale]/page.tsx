import { GRADE_META, type Locale, SIDE_META, WEAPON_CATEGORY_META } from '@csow/schema'
import { ArrowRight, Code2 } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Dust } from '@/components/fx/dust'
import { Reveal } from '@/components/fx/reveal'
import { Countdown } from '@/components/site/countdown'
import { Button } from '@/components/ui/button'
import { EntityImage } from '@/components/ui/entity-image'
import { Marquee } from '@/components/ui/marquee'
import { Panel } from '@/components/ui/panel'
import { Kicker, SectionHeader, Stamp } from '@/components/ui/section-header'
import { CharacterCard, ModeCard, ScenarioCard, WeaponCard } from '@/components/world/cards'
import { Link } from '@/i18n/navigation'
import { heroOf } from '@/lib/media'
import { getPayloadClient } from '@/lib/payload'
import { populatedMany } from '@/lib/utils'
import { getHomepage, getSiteSettings, listEntities } from '@/lib/world'
import type { Character, Scenario, Weapon } from '@/payload-types'

export const revalidate = 300

type Props = { params: Promise<{ locale: string }> }

export default async function HomePage({ params }: Props) {
  const { locale: rawLocale } = await params
  setRequestLocale(rawLocale)
  const locale = rawLocale as Locale
  const t = await getTranslations()
  const payload = await getPayloadClient()

  const [home, settings, counts] = await Promise.all([
    getHomepage(locale).catch(() => null),
    getSiteSettings(locale).catch(() => null),
    Promise.all(
      (['characters', 'weapons', 'scenarios', 'game-modes'] as const).map((c) =>
        payload.count({ collection: c, overrideAccess: false }).then((r) => r.totalDocs),
      ),
    ),
  ])

  let characters = populatedMany(home?.featuredCharacters as (Character | number)[] | null)
  if (characters.length < 3) {
    const res = await listEntities('characters', {
      locale,
      limit: 6,
      where: { featured: { equals: true } },
    })
    characters = res.docs.length
      ? res.docs
      : (await listEntities('characters', { locale, limit: 6 })).docs
  }
  let weapons = populatedMany(home?.featuredWeapons as (Weapon | number)[] | null)
  if (weapons.length < 4) {
    const res = await listEntities('weapons', {
      locale,
      limit: 8,
      where: { featured: { equals: true } },
    })
    weapons = res.docs.length
      ? res.docs
      : (await listEntities('weapons', { locale, limit: 8 })).docs
  }
  let scenarios = populatedMany(home?.featuredScenarios as (Scenario | number)[] | null)
  if (scenarios.length < 2) {
    scenarios = (await listEntities('scenarios', { locale, limit: 3, sort: 'chapter' })).docs
  }
  const modes = (await listEntities('game-modes', { locale, limit: 8, sort: 'family' })).docs

  const heroCharacter = characters[0] ?? null
  const heroMedia = heroCharacter ? heroOf(heroCharacter) : null
  const heroAccent =
    heroCharacter?.accentColor ??
    (heroCharacter?.grade && heroCharacter.grade !== 'unknown'
      ? GRADE_META[heroCharacter.grade].color
      : SIDE_META[heroCharacter?.side ?? 'neutral'].color)

  const eosDate = settings?.endOfService?.date ?? '2026-09-30T14:59:00.000Z'
  const ticker = [
    ...characters.map((c) => c.name),
    ...weapons.map((w) => w.name),
    ...scenarios.map((s) => s.name),
    'Zombie Scenario',
    'Counter-Strike Online 2008–2026',
  ]

  const [nCharacters, nWeapons, nScenarios, nModes] = counts

  return (
    <>
      {/* ───────────────────────────── Hero ───────────────────────────── */}
      <section
        className="relative isolate overflow-hidden border-b border-line"
        style={{ '--accent': heroAccent } as React.CSSProperties}
      >
        <div aria-hidden className="tac-grid absolute inset-0 opacity-60" />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 60% 70% at 72% 40%, color-mix(in srgb, ${heroAccent} 22%, transparent), transparent 70%)`,
          }}
        />
        <Dust className="absolute inset-0 h-full w-full opacity-70" />

        <div className="relative mx-auto grid min-h-[86vh] max-w-7xl items-center gap-10 px-4 pb-16 pt-14 md:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-20">
          <div className="relative z-10">
            <Reveal>
              <Kicker>{t('home.kicker')}</Kicker>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="mt-5 font-display text-[2.6rem] font-bold leading-[0.92] tracking-tight text-bone sm:text-6xl lg:text-[5.2rem]">
                {t('home.headline')
                  .split(' ')
                  .map((word, i, arr) => (
                    <span
                      key={i}
                      className={i >= arr.length - 2 ? 'text-ember-gradient' : undefined}
                    >
                      {word}{' '}
                    </span>
                  ))}
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ash">
                {t('home.subheadline')}
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/characters">
                    {t('home.ctaCharacters')} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/weapons">{t('home.ctaArmory')}</Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <a href="/api/v1/docs">
                    <Code2 className="h-4 w-4" /> {t('home.ctaApi')}
                  </a>
                </Button>
              </div>
            </Reveal>
            <Reveal delay={0.32}>
              <dl className="mt-12 grid max-w-lg grid-cols-4 gap-4 border-t border-line pt-6">
                {[
                  [nCharacters, t('nav.characters')],
                  [nWeapons, t('nav.weapons')],
                  [nScenarios, t('nav.scenarios')],
                  [nModes, t('nav.modes')],
                ].map(([n, label]) => (
                  <div key={String(label)}>
                    <dt className="font-display text-[0.6rem] uppercase tracking-[0.24em] text-dust">
                      {label}
                    </dt>
                    <dd className="hud-numerals mt-1 text-2xl text-flare">
                      {String(n).padStart(2, '0')}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>

          {/* Spotlit figure */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <Reveal delay={0.2} className="relative">
              <div className="hud-brackets relative aspect-[3/4] chamfer-lg bg-line-strong p-px">
                <div className="relative h-full w-full chamfer-lg bg-carbon scanlines">
                  <EntityImage
                    media={heroMedia}
                    alt={heroCharacter?.name ?? ''}
                    initial={heroCharacter?.name ?? 'C'}
                    priority
                    className="absolute inset-0"
                    imgClassName="object-top"
                    sizes="(min-width: 1024px) 40vw, 90vw"
                    pendingLabel={t('common.imagePending')}
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(180deg, transparent 55%, rgba(7,8,10,0.92) 100%)',
                    }}
                  />
                  {heroCharacter && (
                    <div className="absolute inset-x-6 bottom-6 flex items-end justify-between gap-4">
                      <div>
                        <Stamp className="mb-3">
                          {heroCharacter.classType ?? heroCharacter.kind}
                        </Stamp>
                        <p className="font-display text-3xl font-bold leading-none text-bone md:text-4xl">
                          {heroCharacter.localizedName || heroCharacter.name}
                        </p>
                        {heroCharacter.tagline && (
                          <p className="mt-2 max-w-xs text-sm text-ash">{heroCharacter.tagline}</p>
                        )}
                      </div>
                      <Link
                        href={`/characters/${heroCharacter.slug}`}
                        className="hud-numerals shrink-0 text-xs text-(--accent) hover:text-flare"
                      >
                        FILE →
                      </Link>
                    </div>
                  )}
                </div>
              </div>
              {/* HUD side strip */}
              <div
                aria-hidden
                className="absolute -right-3 top-8 hidden flex-col gap-4 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-dust lg:flex"
                style={{ writingMode: 'vertical-rl' }}
              >
                <span>SEC 07 · GRID 24-N</span>
                <span className="text-(--accent)">SIGNAL STABLE</span>
                <span>ARCHIVE ONLINE</span>
              </div>
            </Reveal>
          </div>
        </div>

        <Marquee items={ticker} className="relative" />
      </section>

      {/* ──────────────────────── End of service memorial ───────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20">
        <Reveal>
          <Panel cut="lg">
            <div className="grid gap-10 p-7 md:grid-cols-[1fr_auto] md:items-center md:p-10">
              <div>
                <Kicker>{t('home.eosKicker')}</Kicker>
                <h2 className="mt-3 text-3xl text-bone md:text-4xl">{t('home.eosTitle')}</h2>
                <p className="mt-4 max-w-xl text-ash">
                  {settings?.endOfService?.message ?? t('home.eosBody')}
                </p>
              </div>
              <Countdown
                target={eosDate}
                labels={{
                  days: t('home.days'),
                  hours: t('home.hours'),
                  minutes: t('home.minutes'),
                  seconds: t('home.seconds'),
                  until: t('home.eosUntil'),
                  since: t('home.eosSince'),
                }}
              />
            </div>
            <div aria-hidden className="h-1.5 hazard-stripes opacity-60" />
          </Panel>
        </Reveal>
      </section>

      {/* ───────────────────────── Featured characters ───────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <SectionHeader
          kicker={t('characters.kicker')}
          title={t('home.featuredCharacters')}
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/characters">
                {t('home.viewAll')} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {characters.slice(0, 6).map((c, i) => (
            <Reveal key={c.id} delay={i * 0.06}>
              <CharacterCard
                character={c}
                priority={i < 2}
                labels={{ pending: t('common.imagePending') }}
              />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────── Armory ──────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <SectionHeader
          kicker={t('weapons.kicker')}
          title={t('home.featuredWeapons')}
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/weapons">
                {t('home.viewAll')} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {weapons.slice(0, 8).map((w, i) => (
            <Reveal key={w.id} delay={i * 0.05}>
              <WeaponCard
                weapon={w}
                categoryLabel={WEAPON_CATEGORY_META[w.category].label}
                labels={{ pending: t('common.imagePending') }}
              />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ──────────────────────────── Zombie Scenario ────────────────────────── */}
      <section
        className="relative border-y border-line bg-carbon/50 py-16"
        style={{ '--accent': '#7cff3f' } as React.CSSProperties}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 20% 0%, rgba(124,255,63,0.10), transparent 60%)',
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 md:px-6">
          <SectionHeader
            kicker={t('home.scenarioKicker')}
            title={t('home.scenarioTitle')}
            description={t('scenarios.intro')}
            action={
              <Button asChild variant="accent" size="sm">
                <Link href="/scenarios">
                  {t('home.viewAll')} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            }
          />
          <div className="grid gap-4 lg:grid-cols-3">
            {scenarios.slice(0, 3).map((s, i) => (
              <Reveal key={s.id} delay={i * 0.08}>
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
        </div>
      </section>

      {/* ─────────────────────────────── Modes ───────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <SectionHeader
          kicker={t('home.modesKicker')}
          title={t('home.modesTitle')}
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/modes">
                {t('home.viewAll')} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modes.slice(0, 8).map((m, i) => (
            <Reveal key={m.id} delay={i * 0.04}>
              <ModeCard mode={m} familyLabel={t(`family.${m.family}`)} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────────────────────────── Open data ─────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-8 pt-8 md:px-6">
        <Reveal>
          <Panel cut="lg">
            <div className="grid gap-8 p-7 md:grid-cols-2 md:p-10">
              <div>
                <Kicker>{t('home.apiKicker')}</Kicker>
                <h2 className="mt-3 text-3xl text-bone md:text-4xl">{t('home.apiTitle')}</h2>
                <p className="mt-4 text-ash">{t('home.apiBody')}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild>
                    <a href="/api/v1/docs">{t('home.apiCta')}</a>
                  </Button>
                  <Button asChild variant="ghost">
                    <a href="/api/v1/openapi.json">openapi.json</a>
                  </Button>
                </div>
              </div>
              <pre className="chamfer-sm overflow-x-auto bg-void p-5 font-mono text-[0.78rem] leading-relaxed text-ash ring-1 ring-inset ring-line">
                <code>
                  <span className="text-dust">$ </span>
                  <span className="text-bone">curl</span>{' '}
                  {process.env.NEXT_PUBLIC_SITE_URL ?? 'https://csow.world'}
                  <span className="text-ember">/api/v1/characters/anemone</span>
                  {'\n\n'}
                  <span className="text-dust">{'{'}</span>
                  {'\n  '}
                  <span className="text-flare">"name"</span>:{' '}
                  <span className="text-toxic">"Anemone"</span>,{'\n  '}
                  <span className="text-flare">"grade"</span>:{' '}
                  <span className="text-toxic">"transcendent"</span>,{'\n  '}
                  <span className="text-flare">"side"</span>:{' '}
                  <span className="text-toxic">"tr"</span>,{'\n  '}
                  <span className="text-flare">"tagline"</span>:{' '}
                  <span className="text-toxic">"Krono World's record-breaking pro gamer…"</span>
                  {'\n  '}
                  <span className="text-dust">…</span>
                  {'\n'}
                  <span className="text-dust">{'}'}</span>
                </code>
              </pre>
            </div>
          </Panel>
        </Reveal>
      </section>
    </>
  )
}
