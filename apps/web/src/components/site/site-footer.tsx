import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { NAV_ITEMS } from './site-header'
import { Wordmark } from './wordmark'

export async function SiteFooter({ attribution }: { attribution?: string | null }) {
  const t = await getTranslations()
  return (
    <footer className="relative mt-24 border-t border-line bg-carbon/60">
      <div aria-hidden className="hairline absolute inset-x-0 top-0 opacity-70" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:px-6">
        <div>
          <Wordmark />
          <p className="mt-5 max-w-md text-sm leading-relaxed text-ash">{t('site.tagline')}</p>
          <p className="mt-6 font-display text-[0.65rem] uppercase tracking-[0.3em] text-dust">
            {t('footer.madeWith')}
          </p>
        </div>
        <div>
          <p className="kicker mb-4">{t('home.worldKicker')}</p>
          <ul className="grid grid-cols-2 gap-2 text-sm">
            {NAV_ITEMS.map((item) => (
              <li key={item.key}>
                <Link href={item.href} className="text-ash hover:text-flare">
                  {t(`nav.${item.key}`)}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/factions" className="text-ash hover:text-flare">
                {t('nav.factions')}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="kicker mb-4">{t('footer.api')}</p>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="/api/v1/docs" className="text-ash hover:text-flare">
                {t('home.apiCta')}
              </a>
            </li>
            <li>
              <a href="/api/v1/openapi.json" className="text-ash hover:text-flare">
                {t('footer.openapi')}
              </a>
            </li>
            <li>
              <a href="/admin" className="text-ash hover:text-flare">
                Studio
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          <p className="text-xs leading-relaxed text-dust">
            {attribution ?? t('footer.attribution')}
          </p>
          <p className="mt-2 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-dust/70">
            CSOW · {new Date().getFullYear()} · Counter-Strike Online 2008–2026
          </p>
        </div>
      </div>
    </footer>
  )
}
