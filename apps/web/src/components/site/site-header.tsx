import { Menu } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { CommandPalette } from './command-palette'
import { LocaleSwitcher } from './locale-switcher'
import { MobileNav } from './mobile-nav'
import { Wordmark } from './wordmark'

export const NAV_ITEMS = [
  { key: 'characters', href: '/characters' },
  { key: 'weapons', href: '/weapons' },
  { key: 'scenarios', href: '/scenarios' },
  { key: 'modes', href: '/modes' },
  { key: 'lore', href: '/lore' },
  { key: 'music', href: '/music' },
] as const

export async function SiteHeader() {
  const t = await getTranslations('nav')
  const items = NAV_ITEMS.map((i) => ({ ...i, label: t(i.key) }))

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-void/75 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 md:px-6">
        <Link href="/" className="shrink-0" aria-label="Counter-Strike Online World — home">
          <Wordmark compact />
        </Link>

        <nav
          className="hidden flex-1 items-center justify-center gap-1 lg:flex"
          aria-label="Primary"
        >
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="group relative px-3 py-2 font-display text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-ash transition-colors hover:text-bone"
            >
              {item.label}
              <span
                aria-hidden
                className="absolute inset-x-3 -bottom-px h-px origin-left scale-x-0 bg-ember transition-transform duration-300 ease-(--ease-cso) group-hover:scale-x-100"
              />
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <CommandPalette />
          <LocaleSwitcher className="hidden sm:flex" />
          <a
            href="/api/v1/docs"
            className="hidden h-10 items-center chamfer-sm px-3 font-display text-[0.68rem] font-bold uppercase tracking-[0.2em] text-ember ring-1 ring-inset ring-ember/50 hover:bg-ember hover:text-void xl:flex"
          >
            {t('api')}
          </a>
          <MobileNav items={items} label={t('menu')} closeLabel={t('close')}>
            <Menu className="h-5 w-5" />
          </MobileNav>
        </div>
      </div>
    </header>
  )
}
