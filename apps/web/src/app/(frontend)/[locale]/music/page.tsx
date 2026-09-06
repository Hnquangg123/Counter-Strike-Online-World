import type { Locale } from '@csow/schema'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Reveal } from '@/components/fx/reveal'
import { Panel } from '@/components/ui/panel'
import { SectionHeader } from '@/components/ui/section-header'
import { Attribution } from '@/components/world/attribution'
import { AudioPlayer } from '@/components/world/audio-player'
import { audioOf, mediaRef } from '@/lib/media'
import { populatedMany } from '@/lib/utils'
import { listEntities } from '@/lib/world'

export const revalidate = 300

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'music' })
  return { title: t('title'), description: t('intro') }
}

export default async function MusicPage({ params }: Props) {
  const { locale: rawLocale } = await params
  setRequestLocale(rawLocale)
  const locale = rawLocale as Locale
  const t = await getTranslations()
  const { docs } = await listEntities('music', { locale, limit: 200, sort: 'title' })

  return (
    <div
      className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-16"
      style={{ '--accent': '#b36bff' } as React.CSSProperties}
    >
      <SectionHeader
        as="h1"
        kicker={t('music.kicker')}
        title={t('music.title')}
        description={t('music.intro')}
      />
      {docs.length === 0 && <p className="py-20 text-center text-ash">{t('common.noEntries')}</p>}
      <ol className="grid gap-4 lg:grid-cols-2">
        {docs.map((track, i) => {
          const audio = mediaRef(track.audio) ?? audioOf(track)[0] ?? null
          const usedIn = [
            ...populatedMany(track.usedIn?.gameModes).map((m) => m.localizedName || m.name),
            ...populatedMany(track.usedIn?.scenarios).map((s) => s.localizedName || s.name),
            ...populatedMany(track.usedIn?.maps).map((m) => m.localizedName || m.name),
          ]
          return (
            <Reveal key={track.id} delay={Math.min(i, 8) * 0.04} as="li">
              <Panel className="h-full">
                <div className="flex h-full flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="hud-numerals text-[0.65rem] text-(--accent)">
                        TRACK {String(i + 1).padStart(2, '0')}
                      </p>
                      <h2 className="mt-1 font-display text-xl font-bold leading-tight text-bone">
                        {track.title}
                      </h2>
                      {track.composer && (
                        <p className="mt-1 text-xs text-ash">
                          {t('music.composer')}: {track.composer}
                        </p>
                      )}
                    </div>
                    {track.album && (
                      <span className="stamp shrink-0 text-[0.55rem] text-dust">{track.album}</span>
                    )}
                  </div>
                  {(track.summary ?? track.tagline) && (
                    <p className="text-sm text-ash">{track.summary ?? track.tagline}</p>
                  )}
                  {usedIn.length > 0 && (
                    <p className="text-xs text-dust">
                      <span className="font-display uppercase tracking-[0.2em]">
                        {t('music.usedIn')}:
                      </span>{' '}
                      {usedIn.join(' · ')}
                    </p>
                  )}
                  <div className="mt-auto">
                    {audio ? (
                      <AudioPlayer
                        src={audio.url}
                        title={track.title}
                        caption={audio.credit}
                        labels={{ play: t('music.play'), pause: t('music.pause') }}
                      />
                    ) : (
                      <p className="chamfer-sm bg-steel/50 p-3 text-center font-mono text-[0.65rem] uppercase tracking-[0.2em] text-dust ring-1 ring-inset ring-line">
                        {t('music.audioPending')}
                      </p>
                    )}
                  </div>
                  <Attribution source={track.wikiSource} />
                </div>
              </Panel>
            </Reveal>
          )
        })}
      </ol>
    </div>
  )
}
