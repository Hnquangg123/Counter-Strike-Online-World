import { GRADE_META, SIDE_META } from '@csow/schema'
import { Link } from '@/i18n/navigation'
import { heroOf } from '@/lib/media'
import { cn, populated, truncate } from '@/lib/utils'
import type { Character, Faction, GameMode, Music, Scenario, Weapon } from '@/payload-types'
import { GradeBadge, SideBadge, Tag } from '../ui/badge'
import { EntityImage } from '../ui/entity-image'

const displayName = (d: { name: string; localizedName?: string | null }) =>
  d.localizedName || d.name

/* ---------------------------------- Character --------------------------------- */

export function CharacterCard({
  character,
  priority,
  labels,
}: {
  character: Character
  priority?: boolean
  labels?: { pending?: string }
}) {
  const accent =
    character.accentColor ??
    (character.grade && character.grade !== 'unknown'
      ? GRADE_META[character.grade].color
      : SIDE_META[character.side ?? 'neutral'].color)
  const name = displayName(character)
  return (
    <Link
      href={`/characters/${character.slug}`}
      className="group/card block chamfer bg-line-strong p-px transition-all duration-300 ease-(--ease-cso) hover:bg-(--accent) hover:shadow-[0_0_40px_-10px_var(--accent)]"
      style={{ '--accent': accent } as React.CSSProperties}
    >
      <article className="relative chamfer bg-carbon">
        <div className="hud-brackets relative aspect-[3/4] overflow-hidden">
          <EntityImage
            media={heroOf(character)}
            alt={name}
            initial={name}
            priority={priority}
            className="absolute inset-0"
            imgClassName="object-top group-hover/card:scale-[1.04]"
            pendingLabel={labels?.pending}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, transparent 45%, rgba(7,8,10,0.55) 75%, rgba(7,8,10,0.96) 100%)',
            }}
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {character.side && character.side !== 'neutral' && <SideBadge side={character.side} />}
            {character.kind === 'boss' && <Tag className="text-blood">Boss</Tag>}
          </div>
          <div className="absolute inset-x-4 bottom-4">
            {character.grade && character.grade !== 'unknown' && (
              <GradeBadge grade={character.grade} className="mb-2" />
            )}
            <h3 className="font-display text-xl font-bold leading-none text-bone transition-colors group-hover/card:text-(--accent) md:text-2xl">
              {name}
            </h3>
            {character.tagline && (
              <p className="mt-1.5 line-clamp-2 text-xs text-ash">{character.tagline}</p>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}

/* ----------------------------------- Weapon ----------------------------------- */

export function WeaponCard({
  weapon,
  categoryLabel,
  labels,
}: {
  weapon: Weapon
  categoryLabel: string
  labels?: { pending?: string }
}) {
  const grade = weapon.grade ?? 'unknown'
  const accent = weapon.accentColor ?? GRADE_META[grade].color
  const name = displayName(weapon)
  const icon = populated(weapon.icon)
  const hero = heroOf(weapon)
  return (
    <Link
      href={`/weapons/${weapon.slug}`}
      className="group/card block chamfer-sm bg-line-strong p-px transition-all duration-300 ease-(--ease-cso) hover:bg-(--accent) hover:shadow-[0_0_36px_-10px_var(--accent)]"
      style={{ '--accent': accent } as React.CSSProperties}
    >
      <article className="relative flex h-full flex-col chamfer-sm bg-carbon">
        <div className="relative aspect-[16/9] overflow-hidden bg-steel/60">
          <div aria-hidden className="tac-grid absolute inset-0 opacity-70" />
          <EntityImage
            media={
              icon ? { id: String(icon.id), kind: 'icon', url: icon.url ?? '', alt: name } : hero
            }
            alt={name}
            initial={name}
            fit="contain"
            className="absolute inset-0 bg-transparent p-4"
            imgClassName="drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)] group-hover/card:scale-[1.06]"
            pendingLabel={labels?.pending}
          />
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-px"
            style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
          />
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex items-center justify-between gap-2">
            <Tag>{categoryLabel}</Tag>
            {grade !== 'unknown' && <GradeBadge grade={grade} />}
          </div>
          <h3 className="font-display text-lg font-bold leading-tight text-bone transition-colors group-hover/card:text-(--accent)">
            {name}
          </h3>
          {weapon.tagline && <p className="line-clamp-2 text-xs text-ash">{weapon.tagline}</p>}
          {typeof weapon.stats?.damage === 'number' && (
            <p className="mt-auto hud-numerals pt-2 text-xs text-(--accent)">
              DMG {weapon.stats.damage}
            </p>
          )}
        </div>
      </article>
    </Link>
  )
}

/* ---------------------------------- Scenario ---------------------------------- */

export function ScenarioCard({
  scenario,
  labels,
}: {
  scenario: Scenario
  labels: { season: string; chapter: string; pending?: string }
}) {
  const accent = scenario.accentColor ?? '#ffd400'
  const name = displayName(scenario)
  const bosses = (scenario.bosses ?? []).map((b) => populated(b)).filter(Boolean)
  return (
    <Link
      href={`/scenarios/${scenario.slug}`}
      className="group/card block chamfer bg-line-strong p-px transition-all duration-300 ease-(--ease-cso) hover:bg-(--accent) hover:shadow-[0_0_40px_-10px_var(--accent)]"
      style={{ '--accent': accent } as React.CSSProperties}
    >
      <article className="relative grid chamfer bg-carbon md:grid-cols-[1.1fr_1fr]">
        <div className="relative aspect-[16/10] overflow-hidden md:aspect-auto md:min-h-[220px]">
          <EntityImage
            media={heroOf(scenario)}
            alt={name}
            initial={name}
            className="absolute inset-0"
            imgClassName="group-hover/card:scale-[1.04]"
            pendingLabel={labels.pending}
          />
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-2 hazard-stripes opacity-70" />
        </div>
        <div className="flex flex-col gap-3 p-5">
          <div className="flex items-center gap-3 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-(--accent)">
            {scenario.season && <span>{scenario.season}</span>}
            {typeof scenario.chapter === 'number' && (
              <span className="text-ash">
                {labels.chapter} {String(scenario.chapter).padStart(2, '0')}
              </span>
            )}
          </div>
          <h3 className="font-display text-2xl font-bold leading-none text-bone transition-colors group-hover/card:text-(--accent)">
            {name}
          </h3>
          <p className="line-clamp-3 text-sm text-ash">{scenario.summary ?? scenario.tagline}</p>
          {bosses.length > 0 && (
            <p className="mt-auto pt-2 text-xs text-dust">
              <span className="stamp text-[0.55rem] text-blood">Boss</span>{' '}
              <span className="text-ash">{bosses.map((b) => b?.name).join(' · ')}</span>
            </p>
          )}
        </div>
      </article>
    </Link>
  )
}

/* ----------------------------------- Mode ------------------------------------- */

const FAMILY_ACCENT: Record<GameMode['family'], string> = {
  original: '#f58a07',
  zombie: '#7cff3f',
  scenario: '#ffd400',
  fun: '#b36bff',
  pve: '#5cf2ff',
  competitive: '#3f8cff',
  other: '#9aa0a8',
}

export function ModeCard({
  mode,
  familyLabel,
  className,
}: {
  mode: GameMode
  familyLabel: string
  className?: string
}) {
  const accent = mode.accentColor ?? FAMILY_ACCENT[mode.family]
  const name = displayName(mode)
  return (
    <Link
      href={`/modes/${mode.slug}`}
      className={cn(
        'group/card block chamfer-sm bg-line-strong p-px transition-all duration-300 ease-(--ease-cso) hover:bg-(--accent) hover:shadow-[0_0_36px_-10px_var(--accent)]',
        className,
      )}
      style={{ '--accent': accent } as React.CSSProperties}
    >
      <article className="relative flex h-full flex-col gap-3 chamfer-sm bg-carbon p-5">
        <span
          aria-hidden
          className="absolute right-0 top-0 h-10 w-10 bg-(--accent)/10 [clip-path:polygon(100%_0,0_0,100%_100%)]"
        />
        <span className="stamp text-[0.58rem] text-(--accent)">{familyLabel}</span>
        <h3 className="font-display text-xl font-bold leading-tight text-bone transition-colors group-hover/card:text-(--accent)">
          {name}
        </h3>
        <p className="line-clamp-3 text-sm text-ash">
          {truncate(mode.summary ?? mode.tagline, 140)}
        </p>
        {typeof mode.maxPlayers === 'number' && (
          <p className="mt-auto hud-numerals pt-2 text-xs text-(--accent)">
            {mode.maxPlayers} PLAYERS
          </p>
        )}
      </article>
    </Link>
  )
}

/* ---------------------------------- Faction ----------------------------------- */

export function FactionCard({ faction, sideLabel }: { faction: Faction; sideLabel: string }) {
  const accent = faction.accentColor ?? SIDE_META[faction.side ?? 'neutral'].color
  const name = displayName(faction)
  const emblem = heroOf({
    heroImage: faction.emblem,
    gallery: faction.gallery,
    remoteMedia: faction.remoteMedia,
  })
  return (
    <Link
      href={`/factions/${faction.slug}`}
      className="group/card block chamfer bg-line-strong p-px transition-all duration-300 ease-(--ease-cso) hover:bg-(--accent)"
      style={{ '--accent': accent } as React.CSSProperties}
    >
      <article className="flex h-full items-start gap-5 chamfer bg-carbon p-5">
        <div className="hud-brackets h-20 w-20 shrink-0">
          <EntityImage
            media={emblem}
            alt={name}
            initial={name}
            fit="contain"
            className="h-full w-full p-2"
          />
        </div>
        <div className="min-w-0">
          <SideBadge side={faction.side ?? 'neutral'} label={sideLabel} />
          <h3 className="mt-2 font-display text-xl font-bold leading-tight text-bone group-hover/card:text-(--accent)">
            {name}
          </h3>
          <p className="mt-1 line-clamp-3 text-sm text-ash">{faction.summary ?? faction.tagline}</p>
        </div>
      </article>
    </Link>
  )
}

/* ----------------------------------- Music ------------------------------------ */

export function MusicRow({
  track,
  index,
  composerLabel,
}: {
  track: Music
  index: number
  composerLabel: string
}) {
  return (
    <div className="group/row flex items-center gap-4 border-b border-line py-4 last:border-0">
      <span className="hud-numerals w-8 text-sm text-ember/70">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base font-semibold uppercase tracking-wide text-bone">
          {track.title}
        </p>
        <p className="truncate text-xs text-ash">
          {track.composer
            ? `${composerLabel}: ${track.composer}`
            : (track.summary ?? track.tagline)}
        </p>
      </div>
      {typeof track.durationSeconds === 'number' && (
        <span className="hud-numerals text-xs text-dust">
          {Math.floor(track.durationSeconds / 60)}:
          {String(track.durationSeconds % 60).padStart(2, '0')}
        </span>
      )}
    </div>
  )
}
