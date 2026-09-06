# Design system — the soul of CSO

The goal is instant recognition: someone who spent their evenings in the Counter-Strike Online lobby should feel it in
the first second, before reading a word. We borrow the *language* of the game's interface — not its assets.

## Where it comes from

| CSO memory | Site translation |
| --- | --- |
| Dark charcoal lobby panels with 45° cut corners | `.chamfer` / `.chamfer-sm` / `.chamfer-lg` clip-paths on every panel, card and button (`Panel`, `Button`) |
| CS orange on black | `--color-ember #F58A07` with `--color-flare #FFB13B` highlights; one accent per page via `--accent` |
| Character select: a spotlit figure on a black stage | Hero sections use a radial accent glow + `Dust` particles + `scanlines`; the 3D stage (`FigureViewer`) has a chamfered pedestal and accent ring |
| Weapon shop: grade-coloured frames | Grade tokens `--color-grade-*` (Common grey → Rare blue → Unique violet → Epic gold → Transcendent cyan); `GradeBadge` and card glows use them; Transcendent pulses softly |
| HUD ammo counter `30 | 90` | `.hud-numerals` (Share Tech Mono, tabular, glow) for every stat, count and timer |
| Segmented stat bars in the weapon panel | `StatBar`: 14 skewed segments, dashed when unknown |
| Round timer | `Countdown` to the end of service, in HUD numerals |
| CT blue / TR yellow, zombie green, scenario hazard yellow | `--color-ct`, `--color-tr`, `--color-toxic`, `--color-hazard`; zombie sections tint green, scenarios get `.hazard-stripes` dividers |
| Kill-feed / news ticker | `Marquee` strip under the hero |
| Radar | The `Mark` logo: chamfered plate + radar sweep + crosshair (original artwork, animated) |
| Buy-menu slide-in | `Reveal`: rise + slight skew + fade, staggered |
| CRT / projector feel of old renders | `.scanlines`, `.grain`, `.tac-grid` textures, kept faint |

## Tokens (`apps/web/src/styles/globals.css`)

Surfaces: `void #07080A` · `carbon #0E1013` · `steel #15181D` · `gunmetal #1F242B` · `smoke #2B313A` · hairlines `line` (8% bone) / `line-strong` (16%).
Text: `bone #E8E4DA` (warm, like the old menu text) · `ash #9AA0A8` · `dust #5C6470`.
Signal: `ember #F58A07` · `flare #FFB13B` · `hot #FF5A1F`.
Sides & modes: `ct #3F8CFF` · `tr #F5A524` · `toxic #7CFF3F` · `plague #9B30FF` · `blood #B3001B` · `hazard #FFD400`.
Grades: common `#9AA0A8` · rare `#3F8CFF` · unique `#B36BFF` · epic `#FFB13B` · transcendent `#5CF2FF`.

Per-page accent: pages set `style={{ '--accent': color }}` on their root; utilities such as `text-(--accent)`,
`.glow-accent`, `.kicker`, `.hud-brackets` and `StatBar` all read it. Characters take grade colour (falling back to
side colour); weapons take grade; scenarios hazard yellow; modes their family colour; factions their side.

## Type

- **Display** — Chakra Petch 600/700, uppercase, +2–28% tracking: names, section titles, buttons, nav.
- **Headline** — Barlow Condensed 500–700: taglines and quotes (the condensed CS2-era feel without the proprietary font).
- **Body** — Barlow 400/500: prose, dossiers.
- **Mono / HUD** — Share Tech Mono: numerals, timers, coordinates, kickers' small labels.
- **Stencil** — Black Ops One, only for tiny stamps (`.stamp`: CLASSIFIED / FIGURE IN PRODUCTION / grade stamps). Never for headings.

All fonts are self-hosted via `@fontsource` (no network dependency).

## Components

`ui/`: `Button` (primary / outline / ghost / accent / danger), `Panel` (chamfer + hairline), `SectionHeader` + `Kicker` +
`Stamp`, `Tag` / `GradeBadge` / `SideBadge`, `StatBar`, `EntityImage` (responsive image with designed fallback),
`Marquee`.
`site/`: `Wordmark` + `Mark`, `SiteHeader` (nav, ⌘K search, locale switch), `MobileNav`, `SiteFooter` (attribution),
`CommandPalette`, `LocaleSwitcher`, `Countdown`.
`world/`: `CharacterCard`, `WeaponCard`, `ScenarioCard`, `ModeCard`, `FactionCard`, `MusicRow`, `Gallery` (lightbox),
`FigureViewer` + `FigureScene` (R3F stage, hologram stand-ins), `AudioPlayer`, `Dossier`, `ReleaseList`, `QuoteList`,
`NamedList`, `TriviaList`, `ChipLinks`, `FilterGroup` / `Pagination`, `RichText`, `Attribution`.
`fx/`: `Reveal` / `RevealGroup`, `Dust`.

## Rules of thumb

1. One accent per view. Everything else is greyscale + bone.
2. Corners are cut, never rounded (exception: none).
3. Numbers are HUD numerals. Always.
4. Images get the `hud-brackets` frame when they are the subject of the panel.
5. Motion is quick and decisive (`--ease-cso`), never bouncy; respect `prefers-reduced-motion` (handled globally).
6. Fallbacks are designed, not empty: the initial on a tactical grid, the hologram figure, the dashed stat track.
7. Attribution is part of the design: every entity page ends with its wiki source line.

## Accessibility

Contrast of `bone` on `carbon` is 13:1; `ash` on `carbon` 6.7:1; accent text is used for short labels only. Focus rings
are ember. Decorative layers are `aria-hidden`. Reduced motion disables animations. The command palette and menus use
Radix Dialog for focus management.
